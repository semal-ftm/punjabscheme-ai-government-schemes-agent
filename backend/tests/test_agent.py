"""Agent behaviour: short-term memory, long-term memory, replanning, transparency trace, privacy, scope."""
import pytest

from app import db
from app.agent.graph import SchemeAgent
from app.agent.mcp_client import MCPToolClient


@pytest.fixture()
def agent(seeded_db, fake_llm):
    client = MCPToolClient(env={"DB_PATH": str(seeded_db / "test.db")}).start()
    yield SchemeAgent(llm=fake_llm, tool_caller=client.call, retriever=lambda *a, **k: [])
    client.close()


def kinds(result):
    return [e["type"] for e in result["trace"]]


def test_matric_to_university_triggers_replanning(agent):
    r1 = agent.run("I am a matric student from Lahore. Which schemes can I apply for?", "s1")
    v1 = {e["scheme_id"]: e["verdict"] for e in r1["eligibility"]}
    assert v1["test-university-laptop"] == "Not Eligible Based on Known Rules"
    assert v1["test-school-stipend"] == "More Information Needed"
    assert any(q["field"] == "bisp_beneficiary" for q in r1["questions"])  # asks only what is missing
    assert r1["plan"]["version"] == 1

    r2 = agent.run("Actually, I'm a university student.", "s1")
    assert r2["plan"]["version"] == 2
    assert "replan" in kinds(r2)
    assert any("education level from 'matric' to 'undergraduate'" in x for x in r2["plan"]["replan_reasons"])
    tools = [e["data"]["tool"] for e in r2["trace"] if e["type"] == "tool_call"]
    assert "check_eligibility" in tools  # eligibility re-run with the new facts
    v2 = {e["scheme_id"]: e["verdict"] for e in r2["eligibility"]}
    assert v2["test-university-laptop"] == "More Information Needed"   # now only area type is missing
    assert v2["test-school-stipend"] == "Not Eligible Based on Known Rules"
    changed = {c["scheme_id"] for c in r2["verdict_changes"]["changed"]}
    assert changed == {"test-university-laptop", "test-school-stipend"}


def test_trace_shows_tools_links_and_evidence(agent):
    r = agent.run("I am a university student from Lahore, which schemes?", "s2")
    types = kinds(r)
    for needed in ("memory", "understanding", "plan", "tool_call", "tool_result", "retrieval", "answer"):
        assert needed in types, needed
    results = [e for e in r["trace"] if e["type"] == "tool_result"]
    assert any(e["data"]["links_checked"] for e in results)
    assert r["citations"] and r["citations"][0]["url"]


def test_short_term_memory_resolves_follow_up(agent, fake_llm):
    agent.run("I am a university student from Lahore. Which schemes?", "s3")
    state = agent.session_state("s3")
    assert any(s["id"] == "test-university-laptop" for s in state["recent_schemes"])
    r = agent.run("What documents do I need for the second one?", "s3")
    calls = [e["data"] for e in r["trace"] if e["type"] == "tool_call"]
    assert calls[0] == {"tool": "get_required_documents", "args": {"scheme_id": "test-university-laptop"}}
    assert r["profile"]["education_level"] == "undergraduate"  # profile kept within the session


def test_short_term_memory_keeps_the_scheme_in_focus(agent):
    """Regression: after asking about one scheme, "this scheme" / "it" must mean that scheme,
    not whichever scheme a full eligibility check or search happened to list first."""
    agent.run("I am a university student from Lahore. Which schemes?", "s-focus")
    agent.run("What documents do I need for the second one?", "s-focus")
    state = agent.session_state("s-focus")
    assert [s["id"] for s in state["focus_schemes"]] == ["test-university-laptop"]
    assert state["recent_schemes"][0]["id"] == "test-university-laptop"  # focus first in memory

    # The (fake) LLM does not resolve "it" here: the deterministic fallback must.
    r = agent.run("Which documents are required for it?", "s-focus")
    resolved = [e for e in r["trace"] if e["title"] == "Short-term memory: reference resolved"]
    assert resolved and resolved[0]["data"]["resolved_to"] == ["test-university-laptop"]
    calls = [e["data"] for e in r["trace"] if e["type"] == "tool_call"]
    assert calls[0] == {"tool": "get_required_documents", "args": {"scheme_id": "test-university-laptop"}}

    # Naming a different scheme is a new topic, not a reference to the old one.
    r = agent.run("Which documents are required for the school stipend?", "s-focus")
    assert not [e for e in r["trace"] if e["title"] == "Short-term memory: reference resolved"]

    # A broad question clears the focus.
    agent.run("Which schemes can I apply for?", "s-focus")
    assert agent.session_state("s-focus")["focus_schemes"] == []


def test_long_term_memory_requires_consent_and_survives_new_session(agent):
    with db.session() as conn:
        db.ensure_user(conn, "ayesha_demo")
    agent.run("I am a university student from Lahore", "old-session", user_id="ayesha_demo")
    with db.session() as conn:
        assert db.get_profile(conn, "ayesha_demo") == {}  # no consent -> nothing stored
        db.set_consent(conn, "ayesha_demo", True)
    agent.run("I am a university student from Lahore. Which schemes?", "old-session", user_id="ayesha_demo")
    with db.session() as conn:
        assert db.get_profile(conn, "ayesha_demo")["education_level"] == "undergraduate"

    r = agent.run("Which schemes can I apply for?", "brand-new-session", user_id="ayesha_demo")
    titles = [e["title"] for e in r["trace"] if e["type"] == "memory"]
    assert "Long-term memory: saved profile loaded from SQLite" in titles
    assert "Long-term memory: previous conversation recalled" in titles
    assert r["profile"]["district"] == "Lahore"

    with db.session() as conn:
        db.delete_user_data(conn, "ayesha_demo")
        assert db.get_profile(conn, "ayesha_demo") == {}
        assert conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0] == 0


def test_official_rule_change_triggers_replan(agent, seeded_db):
    agent.run("I am a university student from Lahore. Which schemes?", "s4")
    with db.session() as conn:  # simulate the crawler flagging a changed official page
        conn.execute("UPDATE schemes SET rules_status='needs_reverification', updated_at='2999-01-01T00:00:00+00:00' "
                     "WHERE id='test-university-laptop'")
    r = agent.run("Which schemes can I apply for?", "s4")
    assert any("Official information for 'Test University Laptop Scheme' was updated" in x
               for x in r["plan"]["replan_reasons"])
    laptop = next(e for e in r["eligibility"] if e["scheme_id"] == "test-university-laptop")
    assert any("pending re-verification" in w for w in laptop["warnings"])


def test_sensitive_data_is_masked_before_llm_and_storage(agent, fake_llm):
    r = agent.run("My CNIC is 35202-1234567-1, I am a matric student from Lahore. Which schemes?", "s5",
                  user_id="u5")
    assert any(e["type"] == "privacy" for e in r["trace"])
    with db.session() as conn:
        stored = " ".join(row[0] for row in conn.execute("SELECT content FROM messages"))
    assert "35202-1234567-1" not in stored and "[CNIC REMOVED]" in stored


def test_out_of_scope_uses_no_tools(agent):
    r = agent.run("What's the weather in Lahore?", "s6")
    assert not [e for e in r["trace"] if e["type"] == "tool_call"]


def test_agent_degrades_gracefully_without_llm(seeded_db):
    class DownLLM:
        name = "down"

        def json(self, *a):
            raise RuntimeError("rate limited")

        def text(self, *a):
            raise RuntimeError("rate limited")

    client = MCPToolClient(env={"DB_PATH": str(seeded_db / "test.db")}).start()
    try:
        r = SchemeAgent(llm=DownLLM(), tool_caller=client.call, retriever=lambda *a, **k: []).run(
            "laptop scheme", "s7")
    finally:
        client.close()
    assert r["answer"] and "warning" in kinds(r)
    assert any(e["type"] == "tool_call" for e in r["trace"])  # rule-based planner still used real tools
