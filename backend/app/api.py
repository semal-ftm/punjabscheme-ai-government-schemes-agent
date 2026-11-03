"""FastAPI backend for the PunjabScheme AI web app."""
from __future__ import annotations

import asyncio
import json
import logging
import threading
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app import config, db, rag, rules_loader, updates
from app.agent.graph import SchemeAgent
from app.agent.llm import LLMUnavailable, get_llm
from app.agent.mcp_client import get_mcp_client, shutdown_mcp_client
from app.crawler.crawler import ingest_manual, register_sources
from app.crawler.sources import SOURCES

log = logging.getLogger("punjabscheme")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


class _NoLLM:
    """Used when no LLM key is configured: every node falls back to rule-based behaviour."""
    name = "unavailable"

    def __init__(self, reason: str):
        self.reason = reason

    def json(self, system: str, prompt: str) -> dict:
        raise LLMUnavailable(self.reason)

    def text(self, system: str, prompt: str) -> str:
        raise LLMUnavailable(self.reason)


STATE: dict[str, Any] = {"agent": None, "llm_error": None, "update_thread": None}


def _agent() -> SchemeAgent:
    if STATE["agent"] is None:
        raise HTTPException(503, "Agent is starting up, try again in a moment.")
    return STATE["agent"]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    with db.session() as conn:
        register_sources(conn)
        if config.RULES_PATH.exists():
            rules_loader.load_into_db(conn)
    try:
        llm = get_llm()
    except LLMUnavailable as exc:
        llm, STATE["llm_error"] = _NoLLM(str(exc)), str(exc)
        log.warning("LLM unavailable: %s", exc)
    mcp = await asyncio.to_thread(get_mcp_client)
    STATE["agent"] = SchemeAgent(llm=llm, tool_caller=mcp.call)
    # Embedding model load + incremental indexing can take a while: do it in the background.
    threading.Thread(target=_warm_index, daemon=True).start()
    updates.start_scheduler()
    yield
    shutdown_mcp_client()


def _warm_index() -> None:
    try:
        with db.session() as conn:
            log.info("RAG index sync: %s", rag.sync_index(conn))
    except Exception:  # noqa: BLE001
        log.exception("RAG index sync failed")


app = FastAPI(title="PunjabScheme AI", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- models
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = None
    user_id: str | None = Field(default=None, max_length=64)


class EligibilityRequest(BaseModel):
    profile: dict[str, Any]
    scheme_ids: list[str] = []


class CompareRequest(BaseModel):
    scheme_ids: list[str] = Field(min_length=2, max_length=4)


class ConsentRequest(BaseModel):
    consent: bool
    display_name: str | None = None


class ProfileRequest(BaseModel):
    profile: dict[str, Any]


class SaveRequest(BaseModel):
    scheme_id: str
    note: str | None = None


# ---------------------------------------------------------------- system
@app.get("/api/health")
def health() -> dict:
    agent = STATE["agent"]
    return {"status": "ok" if agent else "starting", "llm": agent.llm.name if agent else None,
            "llm_error": STATE["llm_error"]}


@app.get("/api/agent/info")
def agent_info() -> dict:
    mcp = get_mcp_client()
    try:
        chunks = rag.get_collection().count()
    except Exception:  # noqa: BLE001
        chunks = None
    return {
        "llm": _agent().llm.name, "llm_error": STATE["llm_error"],
        "embedding_model": config.EMBEDDING_MODEL, "vector_store": "ChromaDB", "chunks_indexed": chunks,
        "mcp_server": mcp.server_info, "mcp_tools": mcp.tools,
        "graph": ["load_context", "understand", "update_profile", "plan", "act", "reflect", "retrieve", "answer"],
        "memory": {"short_term": "LangGraph checkpointer per session", "long_term": f"SQLite ({config.DB_PATH.name})"},
    }


@app.get("/api/stats")
def stats() -> dict:
    with db.session() as conn:
        schemes = db.list_schemes(conn)
        by_status: dict[str, int] = {}
        for s in schemes:
            st = rules_loader.effective_status(s)
            by_status[st] = by_status.get(st, 0) + 1
        out = {
            "schemes_total": len(schemes),
            "by_category": {c: sum(1 for s in schemes if s["category"] == c)
                            for c in ("cm_punjab", "punjab_department", "federal")},
            "verified_rules": sum(1 for s in schemes if s["origin"] == "curated"),
            "by_status": by_status,
            "documents": conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
            "sources": db.rows(conn.execute("SELECT id, name, status, last_checked_at FROM sources")),
            "pending_review": conn.execute(
                "SELECT COUNT(*) FROM change_events WHERE review_status = 'pending_review'").fetchone()[0],
            "recent_events": db.rows(conn.execute(
                "SELECT id, detected_at, event_type, summary, severity, scheme_id FROM change_events "
                "ORDER BY detected_at DESC LIMIT 6")),
        }
    out["next_update_check"] = updates.next_run_time()
    return out


# ---------------------------------------------------------------- chat (agent)
@app.post("/api/chat")
async def chat(req: ChatRequest):
    agent = _agent()
    session_id = req.session_id or uuid.uuid4().hex
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def worker() -> None:
        try:
            for item in agent.stream(req.message, session_id, req.user_id):
                loop.call_soon_threadsafe(queue.put_nowait, item)
        except Exception as exc:  # noqa: BLE001
            log.exception("agent failed")
            loop.call_soon_threadsafe(queue.put_nowait, {"error": f"{type(exc).__name__}: {exc}"})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    threading.Thread(target=worker, daemon=True).start()

    async def events():
        yield {"event": "session", "data": json.dumps({"session_id": session_id})}
        while (item := await queue.get()) is not None:
            if "trace" in item:
                yield {"event": "trace", "data": json.dumps(item["trace"], ensure_ascii=False, default=str)}
            elif "final" in item:
                yield {"event": "final", "data": json.dumps(item["final"], ensure_ascii=False, default=str)}
            elif "error" in item:
                yield {"event": "error", "data": json.dumps(item)}

    return EventSourceResponse(events())


@app.get("/api/sessions/{session_id}/messages")
def session_messages(session_id: str) -> list[dict]:
    with db.session() as conn:
        msgs = db.rows(conn.execute("SELECT role, content, trace_json, created_at FROM messages WHERE session_id = ? "
                                    "ORDER BY id", (session_id,)))
    for m in msgs:
        m["trace"] = json.loads(m.pop("trace_json")) if m["trace_json"] else None
    return msgs


# ---------------------------------------------------------------- schemes
def _scheme_card(s: dict) -> dict:
    return {**s, "status": rules_loader.effective_status(s)}


@app.get("/api/schemes")
def schemes(q: str = "", category: str | None = None, level: str | None = None, status: str | None = None) -> list:
    with db.session() as conn:
        items = [_scheme_card(s) for s in db.list_schemes(conn)]
        crit = {r["scheme_id"]: r["n"] for r in conn.execute(
            "SELECT scheme_id, COUNT(*) n FROM scheme_criteria GROUP BY scheme_id")}
    ql = q.lower().strip()
    out = []
    for s in items:
        if category and s["category"] != category or level and s["level"] != level:
            continue
        if status and s["status"] != status:
            continue
        if ql and ql not in f"{s['name']} {s.get('summary') or ''} {s.get('department') or ''} {s.get('sector') or ''}".lower():
            continue
        out.append({**s, "criteria_count": crit.get(s["id"], 0)})
    out.sort(key=lambda s: (s["origin"] != "curated", s["name"]))
    return out


@app.get("/api/schemes/{scheme_id}")
def scheme_detail(scheme_id: str) -> dict:
    with db.session() as conn:
        s = db.get_scheme(conn, scheme_id)
        if not s:
            raise HTTPException(404, "Scheme not found")
        s["status"] = rules_loader.effective_status(s)
        s["source_documents"] = db.rows(conn.execute(
            "SELECT url, title, content_type, fetched_at, last_changed_at FROM documents WHERE scheme_id = ?",
            (scheme_id,)))
        s["changes"] = db.rows(conn.execute(
            "SELECT * FROM change_events WHERE scheme_id = ? ORDER BY detected_at DESC LIMIT 20", (scheme_id,)))
    return s


@app.post("/api/eligibility")
def eligibility(req: EligibilityRequest) -> dict:
    out = get_mcp_client().call("check_eligibility", {"profile": req.profile, "scheme_ids": req.scheme_ids})
    return {**out["result"], "trace": {"tool": "check_eligibility", "via": "MCP (stdio)", "elapsed_ms": out["elapsed_ms"]}}


@app.post("/api/compare")
def compare(req: CompareRequest) -> dict:
    out = get_mcp_client().call("compare_schemes", {"scheme_ids": req.scheme_ids})
    return {**out["result"], "trace": {"tool": "compare_schemes", "via": "MCP (stdio)", "elapsed_ms": out["elapsed_ms"]}}


# ---------------------------------------------------------------- updates and sources
@app.get("/api/updates")
def change_history(limit: int = 100) -> dict:
    with db.session() as conn:
        events = db.rows(conn.execute("SELECT * FROM change_events ORDER BY detected_at DESC, id DESC LIMIT ?",
                                      (limit,)))
        sources = db.rows(conn.execute("SELECT * FROM sources"))
    running = bool(STATE["update_thread"] and STATE["update_thread"].is_alive())
    return {"events": events, "sources": sources, "running": running, "last_run": updates.last_run,
            "next_run": updates.next_run_time(), "interval_hours": config.UPDATE_INTERVAL_HOURS}


@app.post("/api/updates/run")
def run_updates(source_id: str | None = None) -> dict:
    if STATE["update_thread"] and STATE["update_thread"].is_alive():
        return {"status": "already_running"}
    t = threading.Thread(target=updates.run_update_check, args=([source_id] if source_id else None,), daemon=True)
    STATE["update_thread"] = t
    t.start()
    return {"status": "started", "sources": [source_id] if source_id else [s.id for s in SOURCES]}


@app.post("/api/ingest")
async def ingest(url: str = Form(...), title: str = Form(""), source_id: str | None = Form(None),
                 file: UploadFile | None = File(None)) -> dict:
    if not url.startswith(("https://", "http://")):
        raise HTTPException(400, "Provide the official URL the document comes from (used for citations).")
    data = await file.read() if file else None
    try:
        outcome = await asyncio.to_thread(ingest_manual, url=url, title=title, data=data, source_id=source_id)
    except RuntimeError as exc:
        raise HTTPException(422, str(exc)) from exc

    def index():
        with db.session() as conn:
            return rag.sync_index(conn)

    return {"result": outcome, "index": await asyncio.to_thread(index)}


# ---------------------------------------------------------------- users (long-term memory)
@app.get("/api/users/{user_id}")
def get_user(user_id: str) -> dict:
    with db.session() as conn:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        # Reading never creates a user; unknown users get default, non-persisted settings.
        user = dict(row) if row else {"user_id": user_id, "display_name": user_id, "preferred_language": "en",
                                      "consent_to_store": 0, "created_at": None, "last_seen_at": None}
        return {
            **user, "profile": db.get_profile(conn, user_id),
            "saved": db.rows(conn.execute(
                "SELECT ss.scheme_id, ss.note, ss.saved_at, s.name, s.level, s.category FROM saved_schemes ss "
                "LEFT JOIN schemes s ON s.id = ss.scheme_id WHERE ss.user_id = ? ORDER BY ss.saved_at DESC",
                (user_id,))),
            "sessions": db.rows(conn.execute(
                "SELECT session_id, started_at, last_message_at, summary FROM conversations WHERE user_id = ? "
                "ORDER BY last_message_at DESC LIMIT 20", (user_id,))),
        }


@app.put("/api/users/{user_id}/consent")
def set_consent(user_id: str, req: ConsentRequest) -> dict:
    with db.session() as conn:
        db.ensure_user(conn, user_id, req.display_name)
        db.set_consent(conn, user_id, req.consent)
    return get_user(user_id)


@app.put("/api/users/{user_id}/profile")
def put_profile(user_id: str, req: ProfileRequest) -> dict:
    from app.eligibility import normalize_profile
    with db.session() as conn:
        if not db.save_profile(conn, user_id, normalize_profile(req.profile)):
            raise HTTPException(403, "Profile storage is off. Enable 'Remember my profile' first.")
    return get_user(user_id)


@app.delete("/api/users/{user_id}")
def delete_user(user_id: str) -> dict:
    with db.session() as conn:
        db.delete_user_data(conn, user_id)
    return {"deleted": user_id}


@app.post("/api/users/{user_id}/saved")
def save_scheme(user_id: str, req: SaveRequest) -> dict:
    with db.session() as conn:
        db.ensure_user(conn, user_id)
        if not conn.execute("SELECT 1 FROM schemes WHERE id = ?", (req.scheme_id,)).fetchone():
            raise HTTPException(404, "Scheme not found")
        conn.execute("INSERT OR REPLACE INTO saved_schemes (user_id, scheme_id, note, saved_at) VALUES (?, ?, ?, ?)",
                     (user_id, req.scheme_id, req.note, db.now_iso()))
    return get_user(user_id)


@app.delete("/api/users/{user_id}/saved/{scheme_id}")
def unsave_scheme(user_id: str, scheme_id: str) -> dict:
    with db.session() as conn:
        conn.execute("DELETE FROM saved_schemes WHERE user_id = ? AND scheme_id = ?", (user_id, scheme_id))
    return get_user(user_id)
