"""Rules lifecycle: ended schemes are retired cleanly, and Open/Closed statuses must be backed by an official quote."""
from app import config, db, rules_loader
from app.crawler.crawler import extract_html


def _rules_without(scheme_id: str) -> str:
    """Current fixture rules file with one scheme entry removed."""
    text = config.RULES_PATH.read_text(encoding="utf-8")
    start = text.index(f"  - id: {scheme_id}")
    nxt = text.find("\n  - id: ", start + 1)
    return text[:start] + (text[nxt + 1:] if nxt != -1 else "")


def test_scheme_removed_from_rules_is_retired_everywhere(seeded_db):
    with db.session() as conn:
        db.ensure_user(conn, "demo_user")
        conn.execute("INSERT INTO saved_schemes (user_id, scheme_id, saved_at) VALUES ('demo_user', 'test-university-laptop', ?)",
                     (db.now_iso(),))
    config.RULES_PATH.write_text(_rules_without("test-university-laptop"), encoding="utf-8")
    with db.session() as conn:
        rules_loader.load_into_db(conn)
        assert conn.execute("SELECT COUNT(*) FROM schemes WHERE id = 'test-university-laptop'").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM scheme_criteria WHERE scheme_id = 'test-university-laptop'").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM saved_schemes WHERE scheme_id = 'test-university-laptop'").fetchone()[0] == 0
        # the other fixture scheme is untouched
        assert conn.execute("SELECT COUNT(*) FROM schemes WHERE id = 'test-school-stipend'").fetchone()[0] == 1


def test_status_quote_is_verified_against_its_official_page(seeded_db):
    scheme = {"id": "x", "source_url": "https://example.gov.pk/laptop", "criteria": [],
              "status": "Open", "status_quote": "Registration is now open",
              "status_source_url": "https://example.gov.pk/portal"}
    with db.session() as conn:
        conn.execute("INSERT INTO documents (url, title, content_type, text, content_hash, fetched_at, last_changed_at) "
                     "VALUES ('https://example.gov.pk/portal', 'Portal', 'html', 'Registration is now open until 30 Nov', "
                     "'h', ?, ?)", (db.now_iso(), db.now_iso()))
        found = [r for r in rules_loader.verify_quotes(conn, [scheme]) if r["kind"] == "status"]
        assert found and found[0]["status"] == "found"
        missing = rules_loader.verify_quotes(conn, [{**scheme, "status_quote": "Applications closed"}])
        assert [r["status"] for r in missing if r["kind"] == "status"] == ["NOT_FOUND"]


def test_portal_with_tiny_main_element_is_read_in_full():
    html = ("<html><body><main class='hero'><p>Big event</p></main>"
            "<section><table><tr><td>Registration</td><td>15 Sep – 25 Nov 2026</td></tr></table>"
            + "<p>" + "Details about eligibility and brackets. " * 20 + "</p></section></body></html>")
    text = extract_html(html, "https://example.gov.pk/portal")["text"]
    assert "15 Sep – 25 Nov 2026" in text
