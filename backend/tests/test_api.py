"""End-to-end API: FastAPI app + real MCP subprocess + SSE chat stream (LLM replaced by rule-based fallback)."""
import json

import pytest
from fastapi.testclient import TestClient

from app import config


@pytest.fixture()
def client(seeded_db, monkeypatch):
    from app import api
    from app.agent import mcp_client
    from app.agent.llm import LLMUnavailable

    monkeypatch.setenv("DB_PATH", str(seeded_db / "test.db"))       # inherited by the MCP server process
    monkeypatch.setattr(config, "ENABLE_SCHEDULER", False)
    monkeypatch.setattr(api, "get_llm", lambda: (_ for _ in ()).throw(LLMUnavailable("test: no LLM")))
    monkeypatch.setattr(api, "_warm_index", lambda: None)
    mcp_client.shutdown_mcp_client()
    with TestClient(api.app) as c:
        yield c
    mcp_client.shutdown_mcp_client()


def _sse(text: str) -> list[tuple[str, dict]]:
    events, name = [], None
    for line in text.splitlines():
        if line.startswith("event:"):
            name = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            events.append((name, json.loads(line.split(":", 1)[1])))
    return events


def test_schemes_and_detail(client):
    schemes = client.get("/api/schemes", params={"level": "federal"}).json()
    assert [s["id"] for s in schemes] == ["test-school-stipend"]
    detail = client.get("/api/schemes/test-university-laptop").json()
    assert detail["status"] == "Open" and detail["criteria"][0]["quote"]
    assert client.get("/api/schemes/nope").status_code == 404


def test_eligibility_and_compare_go_through_mcp(client):
    r = client.post("/api/eligibility", json={"profile": {"district": "Lahore", "education_level": "graduate",
                                                          "area_type": "rural"}}).json()
    assert r["trace"]["via"] == "MCP (stdio)"
    assert {x["scheme_id"]: x["verdict"] for x in r["results"]}["test-university-laptop"] == "Potentially Eligible"
    cmp = client.post("/api/compare", json={"scheme_ids": ["test-school-stipend", "test-university-laptop"]}).json()
    assert len(cmp["schemes"]) == 2


def test_chat_streams_trace_then_final(client):
    resp = client.post("/api/chat", json={"message": "laptop scheme for students", "user_id": "demo"})
    events = _sse(resp.text)
    names = [n for n, _ in events]
    assert names[0] == "session" and names[-1] == "final" and names.count("trace") >= 5
    final = events[-1][1]
    assert final["answer"] and any(e["type"] == "tool_call" for e in final["trace"])


def test_user_memory_endpoints(client):
    assert client.get("/api/users/newbie").json()["consent_to_store"] == 0
    assert client.put("/api/users/newbie/profile", json={"profile": {"age": 20}}).status_code == 403
    client.put("/api/users/newbie/consent", json={"consent": True})
    assert client.put("/api/users/newbie/profile", json={"profile": {"age": 20}}).json()["profile"] == {"age": 20}
    client.post("/api/users/newbie/saved", json={"scheme_id": "test-university-laptop"})
    assert client.get("/api/users/newbie").json()["saved"][0]["scheme_id"] == "test-university-laptop"
    client.delete("/api/users/newbie")
    after = client.get("/api/users/newbie").json()
    assert after["profile"] == {} and after["saved"] == []
