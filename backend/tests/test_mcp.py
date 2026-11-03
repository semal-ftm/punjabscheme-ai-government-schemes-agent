"""Real MCP client <-> server communication over stdio (the server runs as a separate process)."""
import pytest

from app.agent.mcp_client import MCPToolClient

EXPECTED_TOOLS = {"search_schemes", "check_eligibility", "get_required_documents", "get_scheme_deadline",
                  "compare_schemes", "check_latest_updates", "get_application_process"}


@pytest.fixture()
def mcp(seeded_db):
    client = MCPToolClient(env={"DB_PATH": str(seeded_db / "test.db")}).start()
    yield client
    client.close()


def call(mcp, name, **args):
    return mcp.call(name, args)["result"]


def test_server_exposes_all_seven_tools(mcp):
    assert {t["name"] for t in mcp.tools} == EXPECTED_TOOLS
    assert mcp.server_info["name"] == "punjabscheme-tools"


def test_search_supports_roman_urdu_synonyms(mcp):
    res = call(mcp, "search_schemes", query="wazifa for students")
    assert res["results"][0]["scheme_id"] in {"test-school-stipend", "test-university-laptop"}
    assert "scholarship" in res["expanded_terms"]
    fed = call(mcp, "search_schemes", query="", level="federal")
    assert [r["scheme_id"] for r in fed["results"]] == ["test-school-stipend"]


def test_check_eligibility_is_deterministic_and_cited(mcp):
    res = call(mcp, "check_eligibility", profile={"district": "Lahore", "education_level": "undergraduate",
                                                  "area_type": "rural"})
    verdicts = {r["scheme_id"]: r["verdict"] for r in res["results"]}
    assert verdicts == {"test-university-laptop": "Potentially Eligible",
                        "test-school-stipend": "Not Eligible Based on Known Rules"}
    assert all(r["sources"] and r["disclaimer"] for r in res["results"])


def test_documents_deadline_process_and_compare(mcp):
    docs = call(mcp, "get_required_documents", scheme_id="test-school-stipend")
    assert docs["documents"][0]["text"].startswith("Child registration")
    unknown_docs = call(mcp, "get_required_documents", scheme_id="test-university-laptop")
    assert unknown_docs["documents"] == "Not Officially Confirmed"

    dl = call(mcp, "get_scheme_deadline", scheme_id="test-university-laptop")
    assert dl["status"] == "Open" and dl["days_left"] > 0
    unverified = call(mcp, "get_scheme_deadline", scheme_id="test-school-stipend")
    assert unverified["status"] == "Unverified" and unverified["deadline"] == "Not Officially Confirmed"

    proc = call(mcp, "get_application_process", scheme_id="test-university-laptop")
    assert proc["application_url"] == "https://example.gov.pk/apply"

    cmp = call(mcp, "compare_schemes", scheme_ids=["test-school-stipend", "test-university-laptop"])
    assert {s["level"] for s in cmp["schemes"]} == {"federal", "provincial"}


def test_unknown_scheme_returns_suggestions_not_a_crash(mcp):
    res = call(mcp, "get_scheme_deadline", scheme_id="test-laptop-scheme")
    assert "Unknown scheme_id" in res["error"] and "test-university-laptop" in res["did_you_mean"]


def test_latest_updates_reports_sources_and_events(mcp):
    res = call(mcp, "check_latest_updates", days=7)
    assert "events" in res and "source_status" in res and "pending_review" in res
