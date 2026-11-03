"""Crawler: discovery, relevance filtering, robots.txt, inaccessible sites, change detection."""
from app import db, rules_loader
from app.crawler.crawler import PoliteFetcher, crawl_source, extract_html, rebuild_from_snapshots, run_crawl
from app.crawler.sources import Source

LISTING = """<html><head><title>Flagship | Gov</title></head><body><nav><a href="/about">About</a></nav>
<main><a class="initiative-wrap" href="/laptop"><p class="init-category">Education</p>
<h3>Test University Laptop Scheme</h3><p>Laptops for students</p></a>
<a class="initiative-wrap" href="/tender-notice"><p class="init-category">Notice</p><h3>Tender for printing</h3>
<p>procurement</p></a></main></body></html>"""

DETAIL_V1 = """<html><head><title>Laptop Scheme</title></head><body><main><h1>Test University Laptop Scheme</h1>
<p>Eligibility criteria: Applicants must hold Punjab domicile.</p>
<p>Students enrolled in BS, MS or PhD programmes are eligible. Apply online. Required documents: CNIC copy.</p>
<p>The programme provides support and benefits to applicants. Last date will be announced.</p>
</main></body></html>"""

DETAIL_V2 = DETAIL_V1.replace("BS, MS or PhD", "BS programmes only. Age limit 25 years")


def _source(base: str) -> Source:
    return Source(id="test_src", name="Test Source", seeds=(f"{base}/flagship",), category="cm_punjab",
                  level="provincial", department="Test Dept", card_selector="a.initiative-wrap",
                  card_category_selector=".init-category")


def test_extract_html_reads_cards_and_drops_navigation(local_site):
    base, _ = local_site
    page = extract_html(LISTING, f"{base}/flagship", _source(base))
    assert page["cards"][0]["title"] == "Test University Laptop Scheme"
    assert page["cards"][0]["sector"] == "Education"
    assert "About" not in page["text"]


def test_crawl_discovers_scheme_and_detects_change(tmp_data, local_site):
    base, set_page = local_site
    set_page("/robots.txt", "User-agent: *\nDisallow: /private\n", ctype="text/plain")
    set_page("/flagship", LISTING)
    set_page("/laptop", DETAIL_V1)
    set_page("/tender-notice", "<html><body><main><p>Tender procurement bidding</p></main></body></html>")
    src = _source(base)
    fetcher = PoliteFetcher(delay=0)

    reports = run_crawl(fetcher=fetcher, sources=(src,))
    r = reports[0]
    assert r.status == "ok" and "robots.txt found" in r.robots
    assert "test-university-laptop-scheme" in r.schemes_discovered
    assert "tender-for-printing" not in r.schemes_discovered  # procurement is never a scheme

    # Promote the discovered scheme to a curated (human-verified) one pointing at the same page.
    tmp_data.joinpath("rules.yaml").write_text(
        f"""schemes:
  - id: laptop
    name: Test University Laptop Scheme
    category: cm_punjab
    level: provincial
    source_url: {base}/laptop
    last_verified: 2026-11-01
    criteria:
      - {{id: domicile, field: province, op: eq, value: punjab, label: Punjab domicile,
         quote: Applicants must hold Punjab domicile.}}
""", encoding="utf-8")
    with db.session() as conn:
        rules_loader.load_into_db(conn)
        assert conn.execute("SELECT COUNT(*) FROM schemes WHERE origin='discovered'").fetchone()[0] == 0

    # Second crawl: the official page changed its eligibility text.
    set_page("/laptop", DETAIL_V2)
    with db.session() as conn:
        report = crawl_source(src, conn, fetcher)
        assert report.documents_changed == 1
        event = db.rows(conn.execute("SELECT * FROM change_events WHERE event_type='content_changed'"))[0]
        assert event["severity"] == "significant" and event["review_status"] == "pending_review"
        assert "Age limit 25" in event["diff"]
        assert conn.execute("SELECT rules_status FROM schemes WHERE id='laptop'").fetchone()[0] == "needs_reverification"

    # Reloading the same rules does NOT clear the flag; a human must bump last_verified.
    with db.session() as conn:
        rules_loader.load_into_db(conn)
        assert conn.execute("SELECT rules_status FROM schemes WHERE id='laptop'").fetchone()[0] == "needs_reverification"
    rules = tmp_data.joinpath("rules.yaml").read_text().replace("2026-11-01", "2099-01-01")
    tmp_data.joinpath("rules.yaml").write_text(rules)
    with db.session() as conn:
        rules_loader.load_into_db(conn)
        assert conn.execute("SELECT rules_status FROM schemes WHERE id='laptop'").fetchone()[0] == "verified"
        assert conn.execute("SELECT COUNT(*) FROM change_events WHERE event_type='rules_reloaded'").fetchone()[0] == 1


def test_robots_disallow_is_respected(tmp_data, local_site):
    base, set_page = local_site
    set_page("/robots.txt", "User-agent: *\nDisallow: /\n", ctype="text/plain")
    set_page("/flagship", LISTING)
    with db.session() as conn:
        from app.crawler.crawler import register_sources
        register_sources(conn, (_source(base),))
        report = crawl_source(_source(base), conn, PoliteFetcher(delay=0))
    assert report.status == "blocked_by_robots" and report.documents_stored == 0


def test_unreachable_and_suspended_sources_are_reported(tmp_data, local_site):
    base, set_page = local_site
    set_page("/flagship", "<html><head><title>Account Suspended</title></head><body>x</body></html>")
    dead = Source(id="dead", name="Dead", seeds=("http://127.0.0.1:9/x",), category="federal", level="federal",
                  department="x")
    reports = run_crawl(fetcher=PoliteFetcher(delay=0, timeout=3), sources=(_source(base), dead))
    status = {r.source_id: r.status for r in reports}
    assert status == {"test_src": "suspended", "dead": "unreachable"}
    with db.session() as conn:
        rows = {r["id"]: r["status"] for r in conn.execute("SELECT id, status FROM sources")}
    assert rows == status


def test_offline_rebuild_from_snapshots(tmp_data, local_site):
    base, set_page = local_site
    set_page("/flagship", LISTING)
    set_page("/laptop", DETAIL_V1)
    run_crawl(fetcher=PoliteFetcher(delay=0), sources=(_source(base),))
    with db.session() as conn:
        before = {r["url"]: r["content_hash"] for r in conn.execute("SELECT url, content_hash FROM documents")}
        conn.execute("DELETE FROM documents")
    assert rebuild_from_snapshots() == len(before)
    with db.session() as conn:
        after = {r["url"]: r["content_hash"] for r in conn.execute("SELECT url, content_hash FROM documents")}
    assert after == before
