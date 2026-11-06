"""PunjabScheme agent (LangGraph).

    load_context -> understand -> update_profile -> plan -> act -> reflect --(more steps)--> act
                                                                     \--> retrieve -> answer

Short-term memory: LangGraph checkpointer keyed by session_id (messages, profile, last verdicts).
Long-term memory: SQLite (consented profile, conversation summaries), loaded at the start of a session.
Every node appends human-readable events to the action trace, streamed live to the UI.
"""
from __future__ import annotations

import json
import logging
import re
import time
from collections import Counter
from typing import Annotated, Any, Callable, TypedDict

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app import db, rag
from app.agent import prompts
from app.agent.llm import LLM
from app.agent.privacy import mask_sensitive
from app.eligibility import NEED_INFO, NOT_ELIGIBLE, POTENTIALLY_ELIGIBLE, PROFILE_FIELDS, normalize_profile

log = logging.getLogger(__name__)

ALLOWED_TOOLS = {"search_schemes", "check_eligibility", "get_required_documents", "get_scheme_deadline",
                 "get_application_process", "compare_schemes", "check_latest_updates"}
TOOL_PARAMS = {
    "search_schemes": {"query", "category", "level", "status", "limit"},
    "check_eligibility": {"scheme_ids"},
    "get_required_documents": {"scheme_id"},
    "get_scheme_deadline": {"scheme_id"},
    "get_application_process": {"scheme_id"},
    "compare_schemes": {"scheme_ids"},
    "check_latest_updates": {"days", "scheme_id"},
}
SINGLE_SCHEME_TOOL = {"documents": "get_required_documents", "deadline": "get_scheme_deadline",
                      "application": "get_application_process"}
NO_TOOL_INTENTS = {"greeting", "out_of_scope"}
MAX_REFLECTIONS = 2


class AgentState(TypedDict, total=False):
    messages: Annotated[list, add_messages]   # short-term memory
    user_id: str | None
    session_id: str
    profile: dict
    profile_loaded: bool
    recent_schemes: list
    last_verdicts: dict
    last_checked_at: str | None
    plan_version: int
    # per-turn fields (overwritten every turn)
    incoming: str
    user_message: str
    privacy_removed: list
    memory_note: str
    understanding: dict
    replan_reasons: list
    plan: dict
    pending_steps: list
    tool_results: list
    eligibility: list
    verdict_changes: dict
    questions: list
    evidence: list
    reflections: int
    answer: str
    citations: list
    trace: list


class Tracer:
    """Collects trace events and pushes them to the live stream when one is attached."""

    def __init__(self, existing: list | None = None):
        self.events = list(existing or [])

    def __call__(self, node: str, kind: str, title: str, detail: str = "", data: Any = None) -> None:
        event = {"id": len(self.events) + 1, "ts": db.now_iso(), "node": node, "type": kind,
                 "title": title, "detail": detail, "data": data}
        self.events.append(event)
        try:
            from langgraph.config import get_stream_writer
            get_stream_writer()({"trace": event})
        except Exception:  # noqa: BLE001 - not streaming (e.g. invoke()) is fine
            pass


def _history(messages: list, limit: int = 6) -> str:
    lines = []
    for m in messages[-limit:]:
        role = "User" if isinstance(m, HumanMessage) else "Assistant"
        lines.append(f"{role}: {str(m.content)[:400]}")
    return "\n".join(lines) or "(none)"


def _fmt(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


class SchemeAgent:
    def __init__(self, llm: LLM, tool_caller: Callable[[str, dict], dict], retriever: Callable[..., list] | None = None,
                 checkpointer=None):
        self.llm = llm
        self.call_tool = tool_caller
        self.retrieve_fn = retriever or rag.retrieve
        self.graph = self._build(checkpointer or MemorySaver())

    # ================================================================ nodes
    def load_context(self, state: AgentState) -> dict:
        t = Tracer()
        masked, removed = mask_sensitive(state["incoming"])
        if removed:
            t("load_context", "privacy", "Privacy guard removed sensitive data",
              f"Removed: {', '.join(removed)}. These are never needed for an eligibility check and were not sent "
              f"to the LLM or stored.")
        profile = dict(state.get("profile") or {})
        user_id = state.get("user_id")
        memory_note = ""
        replan_reasons: list[str] = []
        profile_loaded = state.get("profile_loaded", False)
        history_len = len(state.get("messages") or [])
        t("load_context", "memory", "Short-term memory (this session)",
          f"{history_len} earlier messages in this conversation are available for follow-up questions.",
          {"session_id": state["session_id"], "messages": history_len})

        if user_id:
            with db.session() as conn:
                user = db.ensure_user(conn, user_id)
                if not profile_loaded:
                    stored = db.get_profile(conn, user_id) if user["consent_to_store"] else {}
                    if stored:
                        profile = {**stored, **profile}
                        t("load_context", "memory", "Long-term memory: saved profile loaded from SQLite",
                          f"Loaded {len(stored)} saved facts for user '{user_id}' from a previous session.", stored)
                    else:
                        t("load_context", "memory", "Long-term memory: no saved profile",
                          "No saved profile for this user (or saving is turned off).")
                    last = db.last_conversation_summary(conn, user_id, exclude_session=state["session_id"])
                    if last:
                        memory_note = f"Previous session summary ({last['last_message_at'][:10]}): {last['summary']}"
                        t("load_context", "memory", "Long-term memory: previous conversation recalled",
                          last["summary"], last)
                    profile_loaded = True

        # Official rules changed since this session last checked them -> replan
        last_verdicts = state.get("last_verdicts") or {}
        if last_verdicts and state.get("last_checked_at"):
            marks = ",".join("?" * len(last_verdicts))
            with db.session() as conn:
                changed = db.rows(conn.execute(
                    f"SELECT id, name, rules_status, updated_at FROM schemes WHERE id IN ({marks}) "
                    f"AND updated_at > ?", (*last_verdicts, state["last_checked_at"])))
            for s in changed:
                replan_reasons.append(f"Official information for '{s['name']}' was updated "
                                      f"(rules status: {s['rules_status']}) since your last check")
        for reason in replan_reasons:
            t("load_context", "replan", "Change detected in official rules", reason)

        return {"user_message": masked, "privacy_removed": removed, "profile": profile,
                "profile_loaded": profile_loaded, "memory_note": memory_note, "replan_reasons": replan_reasons,
                "messages": [HumanMessage(content=masked)], "trace": t.events, "reflections": 0,
                "tool_results": [], "eligibility": [], "evidence": [], "questions": [], "citations": [],
                "verdict_changes": {}, "pending_steps": []}

    def understand(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        recent = state.get("recent_schemes") or []
        prompt = prompts.UNDERSTAND_PROMPT.format(
            profile=_fmt(state.get("profile") or {}),
            recent_schemes=_fmt([{"scheme_id": s["id"], "name": s["name"]} for s in recent]) if recent else "(none)",
            history=_history(state["messages"][:-1]), message=state["user_message"])
        try:
            u = self.llm.json(prompts.SYSTEM_PROMPT, prompt)
            source = self.llm.name
        except Exception as exc:  # noqa: BLE001 - degrade gracefully, never crash the turn
            log.warning("understand failed: %s", exc)
            u = {"language": "en", "intent": "discover", "profile_updates": {}, "scheme_ids": [],
                 "search_query": state["user_message"], "reasoning": "LLM unavailable: treated as a search request."}
            source = "fallback rules"
            t("understand", "warning", "LLM unavailable for understanding", str(exc)[:200])
        u.setdefault("intent", "discover")
        u.setdefault("profile_updates", {})
        known = {s["id"] for s in recent}
        u["scheme_ids"] = [i for i in (u.get("scheme_ids") or []) if isinstance(i, str)]
        t("understand", "understanding", f"Understood request as '{u['intent']}'",
          u.get("reasoning", ""), {"language": u.get("language"), "intent": u["intent"],
                                   "facts_extracted": u["profile_updates"], "schemes_referenced": u["scheme_ids"],
                                   "search_query": u.get("search_query"), "by": source,
                                   "resolved_from_history": [i for i in u["scheme_ids"] if i in known]})
        return {"understanding": u, "trace": t.events}

    def update_profile(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        old = dict(state.get("profile") or {})
        updates = normalize_profile(state["understanding"].get("profile_updates") or {})
        new = {**old, **updates}
        changes = [{"field": k, "old": old.get(k), "new": v} for k, v in updates.items() if old.get(k) != v]
        replan = list(state.get("replan_reasons") or [])
        corrected = [c for c in changes if c["old"] is not None]
        for c in corrected:
            replan.append(f"You changed {c['field'].replace('_', ' ')} from '{c['old']}' to '{c['new']}'")
        if changes:
            t("update_profile", "memory", "Profile updated from your message",
              ", ".join(f"{c['field']}: {c['old'] if c['old'] is not None else '-'} -> {c['new']}" for c in changes),
              changes)
        for c in corrected:
            t("update_profile", "replan", "Earlier facts corrected: previous plan is outdated",
              f"{c['field']} changed from '{c['old']}' to '{c['new']}'. Previous recommendations will be re-checked.")
        if (changes or updates) and state.get("user_id"):
            with db.session() as conn:
                stored = db.save_profile(conn, state["user_id"], new)
            t("update_profile", "memory",
              "Long-term memory: profile saved to SQLite" if stored else "Long-term memory: not saved",
              "Saved for future sessions." if stored else "Saving is off: the user has not allowed profile storage.")
        return {"profile": new, "replan_reasons": replan, "trace": t.events}

    def _default_plan(self, u: dict, state: AgentState) -> list[dict]:
        intent, ids = u["intent"], u.get("scheme_ids") or []
        query = u.get("search_query") or state["user_message"]
        if intent in NO_TOOL_INTENTS:
            return []
        if intent in SINGLE_SCHEME_TOOL and ids:
            return [{"tool": SINGLE_SCHEME_TOOL[intent], "args": {"scheme_id": i}, "why": f"User asked about {intent}"}
                    for i in ids[:3]]
        if intent == "compare" and len(ids) >= 2:
            return [{"tool": "compare_schemes", "args": {"scheme_ids": ids[:4]}, "why": "Side-by-side comparison"}]
        if intent == "updates":
            return [{"tool": "check_latest_updates", "args": {"days": 30}, "why": "User asked what changed"}]
        if intent == "eligibility" and ids:
            return [{"tool": "check_eligibility", "args": {"scheme_ids": ids}, "why": "Check the named schemes"}]
        steps = [{"tool": "search_schemes", "args": {"query": query, "limit": 8}, "why": "Find relevant schemes"}]
        if intent in ("discover", "eligibility", "profile_update") and state.get("profile"):
            steps.append({"tool": "check_eligibility", "args": {"scheme_ids": []},
                          "why": "Check every scheme with verified rules against the profile"})
        return steps

    def _validate_steps(self, steps: Any) -> list[dict]:
        valid = []
        for s in steps if isinstance(steps, list) else []:
            if not isinstance(s, dict) or s.get("tool") not in ALLOWED_TOOLS:
                continue
            args = {k: v for k, v in (s.get("args") or {}).items() if k in TOOL_PARAMS[s["tool"]]}
            if s["tool"] in ("get_required_documents", "get_scheme_deadline", "get_application_process") \
                    and not args.get("scheme_id"):
                continue
            valid.append({"tool": s["tool"], "args": args, "why": str(s.get("why", ""))[:200]})
        return valid[:5]

    def plan(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        u = state["understanding"]
        replan = state.get("replan_reasons") or []
        version = (state.get("plan_version") or 0) + 1
        if u["intent"] in NO_TOOL_INTENTS and not replan:
            plan = {"goal": "Reply without tools", "steps": [], "version": version, "planner": "rules"}
            t("plan", "plan", f"Plan v{version}: no tools needed", f"Intent '{u['intent']}' needs no scheme data.")
            return {"plan": plan, "pending_steps": [], "plan_version": version, "trace": t.events}
        recent = state.get("recent_schemes") or []
        replan_note = ("REPLANNING because: " + "; ".join(replan) +
                       ". Re-run check_eligibility with scheme_ids [] and search again for the new situation."
                       ) if replan else ""
        prompt = prompts.PLAN_PROMPT.format(
            intent=u["intent"], query=u.get("search_query") or state["user_message"],
            profile=_fmt(state.get("profile") or {}), scheme_ids=_fmt(u.get("scheme_ids") or []),
            known_ids=_fmt([s["id"] for s in recent]), replan_note=replan_note)
        planner = self.llm.name
        try:
            raw = self.llm.json(prompts.SYSTEM_PROMPT, prompt)
            steps, goal = self._validate_steps(raw.get("steps")), raw.get("goal", "")
        except Exception as exc:  # noqa: BLE001
            steps, goal = [], ""
            t("plan", "warning", "LLM planner unavailable, using rule-based planner", str(exc)[:200])
        if not steps and u["intent"] not in NO_TOOL_INTENTS:
            steps, goal, planner = self._default_plan(u, state), goal or "Answer with verified scheme data", "rules"
        if (replan or u["intent"] == "profile_update") and state.get("profile") \
                and not any(s["tool"] == "check_eligibility" for s in steps):
            steps.append({"tool": "check_eligibility", "args": {"scheme_ids": []},
                          "why": "Facts changed, so every verified scheme must be re-checked"})
        plan = {"goal": goal, "steps": steps, "version": version, "planner": planner,
                "replan_reasons": replan}
        title = (f"Replanned: plan v{version - 1} -> v{version}" if replan and version > 1
                 else f"Plan v{version}: {len(steps)} step(s)")
        t("plan", "replan" if replan else "plan", title,
          (goal + (" | Reason: " + "; ".join(replan) if replan else "")).strip(" |"),
          {"steps": steps, "planner": planner})
        return {"plan": plan, "pending_steps": steps, "plan_version": version, "trace": t.events}

    def act(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        results = list(state.get("tool_results") or [])
        eligibility = list(state.get("eligibility") or [])
        for step in state.get("pending_steps") or []:
            args = dict(step["args"])
            sent = dict(args)
            if step["tool"] == "check_eligibility":
                args["profile"] = state.get("profile") or {}
                sent = {**args}
            t("act", "tool_call", f"MCP call: {step['tool']}", step.get("why", ""), {"tool": step["tool"], "args": sent})
            try:
                out = self.call_tool(step["tool"], args)
                data, ms = out["result"], out.get("elapsed_ms")
            except Exception as exc:  # noqa: BLE001
                data, ms = {"error": f"{type(exc).__name__}: {exc}"}, None
            results.append({"tool": step["tool"], "args": sent, "result": data})
            if step["tool"] == "check_eligibility" and isinstance(data, dict):
                seen = {r["scheme_id"] for r in data.get("results", [])}
                eligibility = [e for e in eligibility if e["scheme_id"] not in seen] + data.get("results", [])
            t("act", "error" if isinstance(data, dict) and data.get("error") else "tool_result",
              f"Result: {step['tool']}" + (f" ({ms} ms)" if ms is not None else ""), _summarize(step["tool"], data),
              _links(data))
        return {"tool_results": results, "eligibility": eligibility, "pending_steps": [], "trace": t.events}

    def reflect(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        u = state["understanding"]
        results = state.get("tool_results") or []
        extra: list[dict] = []
        reflections = (state.get("reflections") or 0) + 1
        if reflections <= MAX_REFLECTIONS:
            for r in results[-5:]:
                data = r["result"] if isinstance(r["result"], dict) else {}
                fix = (data.get("did_you_mean") or [None])[0]
                if data.get("error") and fix and "scheme_id" in r["args"]:
                    extra.append({"tool": r["tool"], "args": {**r["args"], "scheme_id": fix},
                                  "why": f"Unknown id '{r['args']['scheme_id']}': retrying with closest match '{fix}'"})
                for err in data.get("errors", []):
                    if err.get("did_you_mean") and r["tool"] in ("check_eligibility", "compare_schemes"):
                        extra.append({"tool": r["tool"], "args": {"scheme_ids": err["did_you_mean"][:1]},
                                      "why": f"{err['error']} Retrying with '{err['did_you_mean'][0]}'"})
                if r["tool"] == "search_schemes" and data.get("count") == 0 and r["args"].get("query"):
                    if r["args"].get("category") or r["args"].get("level") or r["args"].get("status"):
                        extra.append({"tool": "search_schemes", "args": {"query": r["args"]["query"], "limit": 8},
                                      "why": "No results with filters: broadening the search"})
            ran_elig = any(r["tool"] == "check_eligibility" for r in results)
            if not ran_elig and u["intent"] in ("discover", "eligibility") and state.get("profile"):
                found = [s["scheme_id"] for r in results if r["tool"] == "search_schemes"
                         for s in r["result"].get("results", []) if s.get("rules_status") != "not_curated"]
                extra.append({"tool": "check_eligibility", "args": {"scheme_ids": found[:6]},
                              "why": "Schemes found but eligibility not yet checked against your profile"})
        extra = self._validate_steps(extra)
        if extra:
            t("reflect", "reflection", "Reflection: evidence incomplete, adding steps",
              "; ".join(s["why"] for s in extra), {"new_steps": extra})
            return {"pending_steps": extra, "reflections": reflections, "trace": t.events}

        eligibility = state.get("eligibility") or []
        questions = _missing_questions(eligibility, state.get("profile") or {})
        changes = _verdict_changes(state.get("last_verdicts") or {}, eligibility)
        if eligibility:
            counts = Counter(e["verdict"] for e in eligibility)
            t("reflect", "reflection", "Reflection: eligibility evidence complete",
              ", ".join(f"{v}: {n}" for v, n in counts.items()),
              {"verdicts": {e["scheme_name"]: e["verdict"] for e in eligibility}})
        if changes["changed"]:
            t("reflect", "replan", "Recommendations changed after replanning",
              "; ".join(f"{c['name']}: {c['old']} -> {c['new']}" for c in changes["changed"]), changes)
        if questions:
            t("reflect", "reflection", "Missing information that would change a verdict",
              " | ".join(q["question"] for q in questions), questions)
        return {"pending_steps": [], "reflections": reflections, "questions": questions,
                "verdict_changes": changes, "trace": t.events}

    def retrieve(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        u = state["understanding"]
        if u["intent"] in NO_TOOL_INTENTS:
            return {"evidence": [], "trace": t.events}
        query = u.get("search_query") or state["user_message"]
        ids = u.get("scheme_ids") or []
        try:
            chunks = self.retrieve_fn(query, k=4, scheme_id=ids[0]) if len(ids) == 1 else []
            if len(chunks) < 2:
                chunks += [c for c in self.retrieve_fn(query, k=5) if c["chunk_id"] not in {x["chunk_id"] for x in chunks}]
        except Exception as exc:  # noqa: BLE001
            chunks = []
            t("retrieve", "warning", "Document search (RAG) failed", str(exc)[:200])
        chunks = [c for c in chunks if c["score"] >= 0.2][:5]
        t("retrieve", "retrieval", f"RAG: {len(chunks)} official document excerpts retrieved from ChromaDB",
          f"Query: '{query}'" + (f" (focused on {ids[0]})" if len(ids) == 1 else ""),
          [{"title": c["title"], "url": c["url"], "page": c["page"], "score": c["score"],
            "source": c["source_name"], "excerpt": c["text"][:220]} for c in chunks])
        return {"evidence": chunks, "trace": t.events}

    def answer(self, state: AgentState) -> dict:
        t = Tracer(state["trace"])
        u = state["understanding"]
        evidence = _build_evidence(state)
        lang = {"ur": "Urdu (Urdu script)", "roman_ur": "Roman Urdu"}.get(u.get("language"), "English")
        replan_note = ""
        if state.get("replan_reasons"):
            ch = state.get("verdict_changes") or {}
            replan_note = ("The plan was revised because: " + "; ".join(state["replan_reasons"]) +
                           (". Verdict changes: " + "; ".join(f"{c['name']}: {c['old']} -> {c['new']}"
                                                               for c in ch.get("changed", [])) if ch.get("changed") else ""))
        if state.get("privacy_removed"):
            replan_note += (" Tell the user that sensitive identifiers (" + ", ".join(state["privacy_removed"]) +
                            ") were removed for privacy and are not needed.")
        prompt = prompts.ANSWER_PROMPT.format(
            message=state["user_message"], language=lang, profile=_fmt(state.get("profile") or {}),
            memory_note=state.get("memory_note") or "", replan_note=replan_note,
            questions=_fmt([q["question"] for q in state.get("questions") or []]),
            evidence="\n\n".join(f"[{e['n']}] ({e['kind']}) {e['title']} | {e['url'] or 'no link'}"
                                 f" | verified/fetched: {e['date']}\n{e['text']}" for e in evidence) or "(no evidence)")
        writer = self.llm.name
        try:
            text = self.llm.text(prompts.SYSTEM_PROMPT, prompt)
        except Exception as exc:  # noqa: BLE001
            writer = "template (LLM unavailable)"
            t("answer", "warning", "LLM unavailable: answer built from a template", str(exc)[:200])
            text = _template_answer(state, evidence)
        cited = sorted({int(n) for n in re.findall(r"\[(\d+)\]", text)})
        citations = [e for e in evidence if e["n"] in cited]
        uncited = [n for n in cited if n not in {e["n"] for e in evidence}]
        if uncited:
            t("answer", "warning", "Answer cited evidence numbers that do not exist", f"Removed: {uncited}")
            for n in uncited:
                text = text.replace(f"[{n}]", "")
        t("answer", "answer", f"Answer composed with {len(citations)} cited source(s)",
          f"Writer: {writer}. Every factual claim must map to the evidence list.",
          [{"n": c["n"], "title": c["title"], "url": c["url"]} for c in citations])

        eligibility = state.get("eligibility") or []
        recent = [{"id": e["scheme_id"], "name": e["scheme_name"], "verdict": e["verdict"]} for e in eligibility
                  if e["verdict"] != NOT_ELIGIBLE]
        for r in state.get("tool_results") or []:
            res = r["result"] if isinstance(r["result"], dict) else {}
            for s in res.get("results", []) + res.get("schemes", []):
                sid = s.get("scheme_id")
                if sid and sid not in {x["id"] for x in recent}:
                    recent.append({"id": sid, "name": s.get("name") or s.get("scheme_name"), "verdict": s.get("verdict")})
            if res.get("scheme_id") and res["scheme_id"] not in {x["id"] for x in recent}:
                recent.append({"id": res["scheme_id"], "name": res.get("name"), "verdict": None})
        for old in state.get("recent_schemes") or []:
            if old["id"] not in {x["id"] for x in recent}:
                recent.append(old)
        last_verdicts = {**(state.get("last_verdicts") or {}), **{e["scheme_id"]: e["verdict"] for e in eligibility}}

        summary = _session_summary(state, eligibility)
        if state.get("user_id") or state.get("session_id"):
            with db.session() as conn:
                db.record_message(conn, state["session_id"], state.get("user_id"), "user", state["user_message"])
                db.record_message(conn, state["session_id"], state.get("user_id"), "assistant", text,
                                  trace=t.events, summary=summary)
        return {"answer": text, "citations": citations, "messages": [AIMessage(content=text)],
                "recent_schemes": recent[:10], "last_verdicts": last_verdicts, "last_checked_at": db.now_iso(),
                "replan_reasons": [], "trace": t.events}

    # ================================================================ graph
    def _route_after_reflect(self, state: AgentState) -> str:
        return "act" if state.get("pending_steps") else "retrieve"

    def _build(self, checkpointer):
        g = StateGraph(AgentState)
        for name in ("load_context", "understand", "update_profile", "plan", "act", "reflect", "retrieve", "answer"):
            g.add_node(name, getattr(self, name))
        g.add_edge(START, "load_context")
        g.add_edge("load_context", "understand")
        g.add_edge("understand", "update_profile")
        g.add_edge("update_profile", "plan")
        g.add_edge("plan", "act")
        g.add_edge("act", "reflect")
        g.add_conditional_edges("reflect", self._route_after_reflect, {"act": "act", "retrieve": "retrieve"})
        g.add_edge("retrieve", "answer")
        g.add_edge("answer", END)
        return g.compile(checkpointer=checkpointer)

    # ================================================================ public API
    def _inputs(self, message: str, session_id: str, user_id: str | None) -> tuple[dict, dict]:
        return ({"incoming": message, "session_id": session_id, "user_id": user_id},
                {"configurable": {"thread_id": session_id}})

    def run(self, message: str, session_id: str, user_id: str | None = None) -> dict:
        inputs, cfg = self._inputs(message, session_id, user_id)
        started = time.perf_counter()
        final = self.graph.invoke(inputs, cfg)
        return _public_result(final, started)

    def stream(self, message: str, session_id: str, user_id: str | None = None):
        """Yields {'trace': event} while working, then {'final': result}."""
        inputs, cfg = self._inputs(message, session_id, user_id)
        started = time.perf_counter()
        final = None
        for mode, chunk in self.graph.stream(inputs, cfg, stream_mode=["custom", "values"]):
            if mode == "custom":
                yield chunk
            else:
                final = chunk
        yield {"final": _public_result(final, started)}

    def session_state(self, session_id: str) -> dict:
        snap = self.graph.get_state({"configurable": {"thread_id": session_id}})
        return snap.values if snap else {}


# ==================================================================== helpers

def _public_result(state: dict, started: float) -> dict:
    return {
        "answer": state.get("answer", ""),
        "citations": state.get("citations", []),
        "trace": state.get("trace", []),
        "plan": state.get("plan", {}),
        "understanding": state.get("understanding", {}),
        "profile": state.get("profile", {}),
        "eligibility": state.get("eligibility", []),
        "questions": state.get("questions", []),
        "verdict_changes": state.get("verdict_changes", {}),
        "evidence": state.get("evidence", []),
        "elapsed_ms": round((time.perf_counter() - started) * 1000),
    }


def _summarize(tool: str, data: Any) -> str:
    if not isinstance(data, dict):
        return str(data)[:200]
    if data.get("error"):
        return data["error"] + (f" Did you mean: {', '.join(data['did_you_mean'])}?" if data.get("did_you_mean") else "")
    if tool == "search_schemes":
        return f"{data.get('count', 0)} scheme(s): " + ", ".join(r["name"] for r in data.get("results", [])[:6])
    if tool == "check_eligibility":
        return "; ".join(f"{r['scheme_name']}: {r['verdict']}" for r in data.get("results", [])) or "no schemes checked"
    if tool == "check_latest_updates":
        return f"{len(data.get('events', []))} change event(s); {data.get('pending_review', 0)} pending review"
    if tool == "compare_schemes":
        return "Compared: " + ", ".join(s["name"] for s in data.get("schemes", []))
    name = data.get("name", "")
    if tool == "get_scheme_deadline":
        days = data.get("days_left")
        return (f"{name}: status {data.get('status')}, deadline {data.get('deadline')}"
                + (f" ({days} day(s) left)" if isinstance(days, int) and days >= 0 else ""))
    if tool == "get_required_documents":
        docs = data.get("documents")
        return f"{name}: " + (f"{len(docs)} document(s)" if isinstance(docs, list) else str(docs))
    if tool == "get_application_process":
        return f"{name}: apply at {data.get('application_url')}"
    return json.dumps(data, ensure_ascii=False)[:200]


def _links(data: Any) -> dict:
    """Official links a tool result relied on (shown in the trace)."""
    urls: list[str] = []
    if isinstance(data, dict):
        for key in ("results", "schemes"):
            for r in data.get(key, []) or []:
                urls += [s["url"] for s in r.get("sources", [])] or ([r["source_url"]] if r.get("source_url") else [])
        urls += [s["url"] for s in data.get("sources", [])]
        urls += [e["document_url"] for e in data.get("events", []) if e.get("document_url")]
    return {"links_checked": list(dict.fromkeys(u for u in urls if u))[:12]}


def _missing_questions(eligibility: list[dict], profile: dict) -> list[dict]:
    """Rank missing facts by how many schemes they would unblock; ask at most three."""
    counter: Counter = Counter()
    for e in eligibility:
        if e["verdict"] == NEED_INFO:
            counter.update(f for f in e["missing_fields"] if f not in profile)
    return [{"field": f, "question": PROFILE_FIELDS[f]["question"], "unblocks": n}
            for f, n in counter.most_common(3) if f in PROFILE_FIELDS]


def _verdict_changes(previous: dict, eligibility: list[dict]) -> dict:
    changed = [{"scheme_id": e["scheme_id"], "name": e["scheme_name"], "old": previous[e["scheme_id"]],
                "new": e["verdict"]} for e in eligibility
               if e["scheme_id"] in previous and previous[e["scheme_id"]] != e["verdict"]]
    return {"changed": changed}


def _build_evidence(state: AgentState) -> list[dict]:
    ev: list[dict] = []

    def add(kind, title, url, date, text):
        ev.append({"n": len(ev) + 1, "kind": kind, "title": title, "url": url, "date": date or "Not Officially Confirmed",
                   "text": text})

    eligibility = state.get("eligibility") or []
    shown_not = 0
    for e in eligibility:
        if e["verdict"] == NOT_ELIGIBLE:
            shown_not += 1
            if shown_not > 4:
                continue
        lines = [f"Scheme: {e['scheme_name']} | level: {e['level']} | verdict: {e['verdict']} | status: {e.get('status')}"]
        for c in e["criteria"]:
            if c["status"] == "not_applicable":
                continue
            lines.append(f"- {c['label']}: {c['status'].upper()} (user: {c['user_value']}) official text: \"{c['quote']}\"")
        lines += [f"! {w}" for w in e["warnings"]]
        add("eligibility check", e["scheme_name"], e.get("source_url"), e.get("last_verified"), "\n".join(lines))

    for r in state.get("tool_results") or []:
        data = r["result"] if isinstance(r["result"], dict) else {}
        if data.get("error") or r["tool"] == "check_eligibility":
            continue
        if r["tool"] == "search_schemes" and not eligibility:
            for s in data.get("results", [])[:6]:
                add("scheme record", s["name"], s.get("source_url"), s.get("last_verified"),
                    f"{s['category_label']} | {s['level']} | status: {s['status']} | rules: {s['rules_status']}\n"
                    + (f"Official status: {s['status_note']}\n" if s.get("status_note") else "")
                    + f"{s.get('summary') or ''}")
        elif r["tool"] == "get_required_documents":
            docs = data.get("documents")
            body = "\n".join(f"- {d['text']}" for d in docs) if isinstance(docs, list) else f"{docs}. {data.get('note')}"
            add("required documents", data.get("name", ""), (data.get("sources") or [{}])[0].get("url"), None, body)
        elif r["tool"] == "get_scheme_deadline":
            add("deadline/status", data.get("name", ""), (data.get("sources") or [{}])[0].get("url"), None,
                f"status: {data.get('status')}; opening date: {data.get('opening_date')}; deadline: "
                f"{data.get('deadline')}; days left: {data.get('days_left')}; {data.get('note') or ''}")
        elif r["tool"] == "get_application_process":
            steps = data.get("steps")
            body = "\n".join(f"{i + 1}. {s['text']}" for i, s in enumerate(steps)) if isinstance(steps, list) else str(steps)
            add("application process", data.get("name", ""), data.get("official_page"), None,
                f"{body}\nOfficial application link: {data.get('application_url')}")
        elif r["tool"] == "compare_schemes":
            for s in data.get("schemes", []):
                add("comparison", s["name"], s.get("source_url"), s.get("last_verified"),
                    f"{s['category_label']} | {s['level']} | status: {s['status']}\nBenefits: {'; '.join(s['benefits'])}\n"
                    f"Criteria: {'; '.join(s['key_criteria'])}\nDocuments: {'; '.join(s['documents'])}\n"
                    f"Apply: {s['application_url']}")
        elif r["tool"] == "check_latest_updates":
            for e in data.get("events", [])[:6]:
                add("change history", e["summary"], e.get("document_url"), e["detected_at"][:10],
                    f"{e['event_type']} | severity: {e['severity']} | review: {e['review_status']}")
            down = [s for s in data.get("source_status", []) if s["status"] not in ("ok", "never_checked")]
            if down:
                add("source status", "Official sources currently unavailable", None, None,
                    "\n".join(f"- {s['name']}: {s['status']} ({(s['last_error'] or '')[:100]})" for s in down))

    for c in state.get("evidence") or []:
        add("official document excerpt", c["title"] + (f" (page {c['page']})" if c.get("page") else ""), c["url"],
            (c.get("fetched_at") or "")[:10], c["text"][:700])
    return ev


def _template_answer(state: AgentState, evidence: list[dict]) -> str:
    lines = []
    if state.get("replan_reasons"):
        lines.append("**Plan updated:** " + "; ".join(state["replan_reasons"]) + ".\n")
    elig = state.get("eligibility") or []
    groups = [(POTENTIALLY_ELIGIBLE, "Potentially Eligible"), (NEED_INFO, "More Information Needed"),
              (NOT_ELIGIBLE, "Not Eligible Based on Known Rules")]
    ref = {e["title"]: e["n"] for e in evidence}
    for verdict, label in groups:
        items = [e for e in elig if e["verdict"] == verdict]
        if items:
            lines.append(f"**{label}**")
            for e in items:
                lines.append(f"- {e['scheme_name']} ({e['level']}) [{ref.get(e['scheme_name'], 1)}]")
    if not elig:
        for e in evidence[:6]:
            lines.append(f"- {e['title']} [{e['n']}]")
    if state.get("questions"):
        lines.append("\nTo check further, please tell me:")
        lines += [f"- {q['question']}" for q in state["questions"]]
    lines.append("\nPlease confirm on the official portal before applying.")
    return "\n".join(lines)


def _session_summary(state: AgentState, eligibility: list[dict]) -> str:
    u = state["understanding"]
    good = [e["scheme_name"] for e in eligibility if e["verdict"] == POTENTIALLY_ELIGIBLE]
    need = [e["scheme_name"] for e in eligibility if e["verdict"] == NEED_INFO]
    parts = [f"Asked about: {u.get('search_query') or u.get('intent')}"]
    if good:
        parts.append("potentially eligible: " + ", ".join(good[:5]))
    if need:
        parts.append("needs more info: " + ", ".join(need[:5]))
    return "; ".join(parts)
