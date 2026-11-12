"""Tavily live search: official-domain restriction, error handling, agent integration and Studio settings."""
import pytest

from app import config, studio, tavily
from app.agent import prompts
from app.agent.graph import SchemeAgent


class FakeResponse:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self.ok = 200 <= status < 300
        self._payload = payload or {}

    def json(self):
        return self._payload


TAVILY_PAYLOAD = {"results": [
    {"title": "Kafaalat payments", "url": "https://bisp.gov.pk/news/kafaalat", "content": "Phase 3 payments...", "score": 0.91},
    {"title": "PSPA", "url": "https://pspa.punjab.gov.pk/zewar", "content": "Zewar-e-Taleem stipend", "score": 0.8},
    {"title": "Blog copy", "url": "https://pwwb.com.pk/dhee-rani", "content": "unofficial copy", "score": 0.95},
]}


def test_search_requires_key(tmp_data):
    with pytest.raises(tavily.TavilyError, match="TAVILY_API_KEY"):
        tavily.search("bisp")


def test_search_only_returns_official_domains(tmp_data, monkeypatch):
    sent = {}

    def fake_post(url, json, timeout, headers):  # noqa: A002
        sent.update(json)
        return FakeResponse(200, TAVILY_PAYLOAD)

    monkeypatch.setattr(tavily.requests, "post", fake_post)
    out = tavily.search("kafaalat", api_key="tvly-test")
    assert set(sent["include_domains"]) == {"punjab.gov.pk", "pspa.punjab.gov.pk", "pessi.punjab.gov.pk",
                                            "pwwf.punjab.gov.pk", "bisp.gov.pk"}
    assert [r["source_id"] for r in out["results"]] == ["bisp", "pspa"]
    assert out["dropped_non_official"] == 1  # pwwb.com.pk is never passed on

    only_bisp = tavily.search("kafaalat", source_ids=["bisp"], api_key="tvly-test")
    assert sent["include_domains"] == ["bisp.gov.pk"]
    assert [r["source_id"] for r in only_bisp["results"]] == ["bisp"]


def test_search_reports_api_errors(tmp_data, monkeypatch):
    monkeypatch.setattr(tavily.requests, "post", lambda *a, **k: FakeResponse(401))
    with pytest.raises(tavily.TavilyError, match="401"):
        tavily.search("x y", api_key="bad")


def test_settings_and_prompt_overrides(tmp_data):
    assert studio.get("tavily_enabled") is True
    studio.update_settings({"tavily_enabled": False, "rag_top_k": 3})
    assert studio.get("tavily_enabled") is False and studio.get("rag_top_k") == 3
    assert not studio.live_search_active()

    bad = prompts.DEFAULTS["PLAN_PROMPT"].replace("{intent}", "")
    assert any("{intent}" in p for p in prompts.validate("PLAN_PROMPT", bad))
    assert prompts.validate("ANSWER_PROMPT", prompts.DEFAULTS["ANSWER_PROMPT"]) == []
    studio.update_settings({"prompt_overrides": {"SYSTEM_PROMPT": "Custom system prompt for testing purposes only."}})
    assert prompts.get("SYSTEM_PROMPT").startswith("Custom system prompt")
    assert prompts.get("PLAN_PROMPT") == prompts.DEFAULTS["PLAN_PROMPT"]


def test_agent_uses_live_search_when_rag_is_weak(seeded_db, fake_llm, monkeypatch):
    monkeypatch.setattr(config, "TAVILY_API_KEY", "tvly-test")
    calls = []

    def tool_caller(name, args):
        calls.append(name)
        if name == "live_web_search":
            return {"result": {"count": 1, "retrieved_at": "2026-11-07T00:00:00Z", "results": [
                {"title": "Kafaalat phase 3", "url": "https://bisp.gov.pk/news", "content": "Payments start in November.",
                 "score": 0.9, "source_id": "bisp", "source_name": "BISP", "level": "federal"}]}, "elapsed_ms": 5}
        return {"result": {"count": 0, "results": []}, "elapsed_ms": 1}

    agent = SchemeAgent(llm=fake_llm, tool_caller=tool_caller, retriever=lambda *a, **k: [])
    r = agent.run("Any news about BISP Kafaalat payments?", "live-1")
    assert "live_web_search" in calls
    live_events = [e for e in r["trace"] if e["type"] == "tool_call" and e["data"]["tool"] == "live_web_search"]
    assert live_events and live_events[0]["node"] == "retrieve"

    # Turned off in Agent Studio -> never called
    calls.clear()
    studio.update_settings({"tavily_enabled": False})
    agent.run("Any news about BISP Kafaalat payments?", "live-2")
    assert "live_web_search" not in calls
