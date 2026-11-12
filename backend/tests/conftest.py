"""Shared fixtures. Every test uses its own temporary SQLite database and ChromaDB folder.

Test data is synthetic (fixture schemes / personas). Tests never call the LLM API: a scripted FakeLLM
stands in for the model, so the agent's planning/replanning logic is tested deterministically.
"""
from __future__ import annotations

import re
import sys
import textwrap
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app import config, db  # noqa: E402

FIXTURE_RULES = textwrap.dedent("""
schemes:
  - id: test-school-stipend
    name: Test School Stipend
    category: federal
    level: federal
    department: Test Federal Programme
    summary: Stipend for school children of registered low-income families.
    source_url: https://example.gov.pk/school-stipend
    last_verified: 2026-11-01
    status: Unverified
    criteria:
      - id: education
        field: education_level
        op: in
        value: [primary, middle, matric, intermediate]
        label: Enrolled at school level (primary to higher secondary)
        quote: Children enrolled in primary, secondary and higher secondary classes are eligible.
      - id: registered
        field: bisp_beneficiary
        op: is_true
        label: Household is a registered beneficiary
        quote: Only children of registered beneficiary families can apply.
    documents:
      - text: Child registration certificate (B-Form)
        quote: B-Form of the child is required.
    steps:
      - text: Visit the nearest registration centre
        quote: Visit the nearest registration centre.
  - id: test-university-laptop
    name: Test University Laptop Scheme
    category: cm_punjab
    level: provincial
    department: Test Punjab Department
    summary: Laptops for university students of Punjab public universities.
    source_url: https://example.gov.pk/laptop
    application_url: https://example.gov.pk/apply
    last_verified: 2026-11-01
    status: Open
    status_quote: Applications are open.
    opening_date: 2026-10-01
    deadline: 2099-12-31
    criteria:
      - id: domicile
        field: province
        op: eq
        value: punjab
        label: Punjab domicile
        quote: Applicants must hold Punjab domicile.
      - id: education
        field: education_level
        op: in
        value: [undergraduate, graduate, postgraduate]
        label: Enrolled in a university degree programme
        quote: Students enrolled in BS, MS or PhD programmes are eligible.
      - id: plot
        field: plot_size_marla
        op: lte
        value: 5
        when: {field: area_type, op: eq, value: urban}
        label: Urban plot up to 5 marla
        quote: up to 5 Marla in urban areas
      - id: record
        op: manual
        label: No criminal record
        quote: No conviction in criminal offenses.
""")

SCHEME_PAGES = {
    "school-stipend": "Test School Stipend. Children enrolled in primary, secondary and higher secondary classes are "
                      "eligible. Only children of registered beneficiary families can apply. B-Form of the child is "
                      "required. Visit the nearest registration centre.",
    "laptop": "Test University Laptop Scheme. Applicants must hold Punjab domicile. Students enrolled in BS, MS or "
              "PhD programmes are eligible. Plot up to 5 Marla in urban areas. No conviction in criminal offenses. "
              "Applications are open.",
}


@pytest.fixture()
def tmp_data(tmp_path, monkeypatch):
    """Point the whole app at a fresh temporary data folder."""
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.setattr(config, "SNAPSHOT_DIR", tmp_path / "snapshots")
    monkeypatch.setattr(config, "CHROMA_DIR", tmp_path / "chroma")
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(config, "RULES_PATH", tmp_path / "rules.yaml")
    monkeypatch.setattr(config, "STUDIO_SETTINGS_PATH", tmp_path / "studio_settings.json")
    monkeypatch.setattr(config, "TAVILY_API_KEY", "")  # tests never call the live web
    (tmp_path / "snapshots").mkdir()
    (tmp_path / "rules.yaml").write_text(FIXTURE_RULES, encoding="utf-8")
    db.init_db()
    return tmp_path


@pytest.fixture()
def seeded_db(tmp_data):
    """Temp DB with fixture rules and their 'official' documents loaded."""
    from app import rules_loader
    with db.session() as conn:
        for slug, text in SCHEME_PAGES.items():
            conn.execute(
                "INSERT INTO documents (url, source_id, title, content_type, text, content_hash, fetched_at, "
                "last_changed_at) VALUES (?, NULL, ?, 'html', ?, ?, ?, ?)",
                (f"https://example.gov.pk/{slug}", slug, text, f"hash-{slug}", db.now_iso(), db.now_iso()))
        rules_loader.load_into_db(conn)
    return tmp_data


class FakeLLM:
    """Deterministic stand-in for the LLM (DeepSeek): understands a few phrasings and plans like the real prompt says."""
    name = "fake-llm"

    def __init__(self):
        self.calls: list[str] = []

    def json(self, system: str, prompt: str) -> dict:
        if "Analyse the user's latest message" in prompt:
            self.calls.append("understand")
            msg = re.search(r'Latest user message: "(.*)"', prompt).group(1).lower()
            facts: dict = {}
            if "matric" in msg:
                facts.update(education_level="matric", currently_enrolled=True)
            if "university" in msg:
                facts.update(education_level="undergraduate", currently_enrolled=True)
            if "lahore" in msg:
                facts["district"] = "Lahore"
            m = re.search(r"(\d+)\s*k\b", msg)
            if m:
                facts["monthly_household_income"] = int(m.group(1)) * 1000
            if "bisp" in msg and "not" not in msg:
                facts["bisp_beneficiary"] = True
            ids = ["test-university-laptop"] if "second" in msg else []
            intent = "documents" if "document" in msg else ("discover" if "scheme" in msg else "profile_update")
            if "weather" in msg:
                intent = "out_of_scope"
            return {"language": "en", "intent": intent, "profile_updates": facts, "scheme_ids": ids,
                    "search_query": "student education scheme", "reasoning": "fake"}
        if "planning module" in prompt:
            self.calls.append("plan")
            if "Referenced scheme ids: [\"test-university-laptop\"]" in prompt and "documents" in prompt:
                return {"goal": "documents", "steps": [{"tool": "get_required_documents",
                                                        "args": {"scheme_id": "test-university-laptop"}, "why": "x"}]}
            return {"goal": "find schemes", "steps": [
                {"tool": "search_schemes", "args": {"query": "student", "limit": 5}, "why": "find"},
                {"tool": "check_eligibility", "args": {"scheme_ids": []}, "why": "check all"}]}
        raise AssertionError("unexpected json prompt")

    def text(self, system: str, prompt: str) -> str:
        self.calls.append("answer")
        return "Here is what I found [1]. Please confirm on the official portal before applying."


@pytest.fixture()
def fake_llm():
    return FakeLLM()


@pytest.fixture()
def local_site():
    """A tiny local website whose pages tests can change between crawls."""
    pages: dict[str, tuple[int, str, bytes]] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            status, ctype, body = pages.get(self.path, (404, "text/html", b"not found"))
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}"

    def set_page(path: str, html: str, status: int = 200, ctype: str = "text/html; charset=utf-8"):
        pages[path] = (status, ctype, html.encode() if isinstance(html, str) else html)

    yield base, set_page
    server.shutdown()
