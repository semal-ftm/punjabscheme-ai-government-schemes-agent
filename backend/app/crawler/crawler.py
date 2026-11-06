"""Polite crawler for official scheme sources (Requests + BeautifulSoup + PyPDF).

Rules it follows:
- only the registered official seeds and links on the same host;
- robots.txt is honoured (RFC 9309: 4xx = no restrictions, 5xx/unreachable = do not crawl);
- a robots "Content-Signal: ai-input=no" stops the source from being used for RAG;
- SSL certificates are always verified (a broken certificate is reported, never bypassed);
- a fixed delay between requests to the same host.
"""
from __future__ import annotations

import difflib
import hashlib
import io
import json
import logging
import re
import sqlite3
import time
import urllib.robotparser
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

from app import config, db
from app.crawler.sources import (EXCLUDE_KEYWORDS, NEWS_WORDS, SCHEME_KEYWORDS, SCHEME_TITLE_WORDS, SOURCES,
                                 SOURCES_BY_ID, Source)

log = logging.getLogger(__name__)

SIGNIFICANT_WORDS = ("eligib", "criteria", "age", "income", "last date", "deadline", "required", "document",
                     "marla", "apply", "closed", "open", "extended", "registration", "amount", "rs.", "pkr")


@dataclass
class FetchResult:
    url: str
    ok: bool
    content: bytes = b""
    content_type: str = ""
    status_code: int | None = None
    error_kind: str | None = None   # ssl_error | unreachable | http_error | suspended | blocked_by_robots | too_large
    error: str | None = None


@dataclass
class SourceReport:
    source_id: str
    name: str
    status: str = "ok"
    robots: str = ""
    pages_fetched: int = 0
    documents_stored: int = 0
    documents_changed: int = 0
    documents_new: int = 0
    skipped_irrelevant: int = 0
    schemes_discovered: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def normalize_url(url: str) -> str:
    url, _ = urldefrag(url.strip())
    parsed = urlparse(url)
    path = re.sub(r"/{2,}", "/", parsed.path) or "/"
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    query = "&".join(p for p in parsed.query.split("&") if p and not p.startswith("utm_"))
    return parsed._replace(scheme=parsed.scheme.lower(), netloc=parsed.netloc.lower(), path=path,
                           query=query).geturl()


def normalize_text(text: str) -> str:
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def content_hash(text: str) -> str:
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


def slugify(text: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:max_len].rstrip("-") or "scheme"


def relevance_score(text: str, title: str = "") -> float:
    blob = f"{title} {title} {text}".lower()
    hits = sum(blob.count(k) for k in SCHEME_KEYWORDS)
    bad = sum(blob.count(k) for k in EXCLUDE_KEYWORDS)
    length_factor = min(1.0, len(text) / 800)
    return round(min(hits, 40) * length_factor - 3 * bad, 2)


def looks_like_scheme_title(title: str) -> bool:
    t = title.lower()
    return any(w in t for w in SCHEME_TITLE_WORDS) and not any(w in t for w in NEWS_WORDS) \
        and not any(w in t for w in EXCLUDE_KEYWORDS)


class PoliteFetcher:
    def __init__(self, delay: float = config.CRAWL_DELAY_SECONDS, timeout: float = config.CRAWL_TIMEOUT_SECONDS):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = config.CRAWLER_USER_AGENT
        self.delay, self.timeout = delay, timeout
        self._last_hit: dict[str, float] = {}
        self._robots: dict[str, tuple[urllib.robotparser.RobotFileParser | None, str, bool]] = {}
        self._host_down: dict[str, FetchResult] = {}

    def _wait(self, host: str) -> None:
        elapsed = time.monotonic() - self._last_hit.get(host, 0)
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_hit[host] = time.monotonic()

    def robots(self, url: str) -> tuple[urllib.robotparser.RobotFileParser | None, str, bool]:
        """Returns (parser or None=allow all, human readable status, ai_input_allowed)."""
        parsed = urlparse(url)
        host = parsed.netloc
        if host in self._robots:
            return self._robots[host]
        robots_url = f"{parsed.scheme}://{host}/robots.txt"
        parser = urllib.robotparser.RobotFileParser()
        ai_input_allowed = True
        try:
            self._wait(host)
            resp = self.session.get(robots_url, timeout=self.timeout)
            if resp.status_code >= 500:
                result = (parser, f"robots.txt HTTP {resp.status_code}: treated as disallow-all (RFC 9309)", True)
                parser.disallow_all = True
            elif resp.status_code >= 400 or "<html" in resp.text[:500].lower():
                result = (None, f"robots.txt not available (HTTP {resp.status_code}): no restrictions per RFC 9309; "
                                f"crawling conservatively", True)
            else:
                parser.parse(resp.text.splitlines())
                for line in resp.text.lower().splitlines():
                    if line.startswith("content-signal:") and "ai-input=no" in line.replace(" ", ""):
                        ai_input_allowed = False
                status = "robots.txt found and honoured"
                if not ai_input_allowed:
                    status += "; Content-Signal ai-input=no (content will not be used for RAG)"
                result = (parser, status, ai_input_allowed)
        except requests.exceptions.SSLError as exc:
            parser.disallow_all = True
            self._host_down[host] = FetchResult(url, False, error_kind="ssl_error",
                                                error=f"SSL certificate verification failed: {str(exc)[:160]}")
            result = (parser, "robots.txt unreachable (SSL certificate error): not crawling", True)
        except requests.RequestException as exc:
            parser.disallow_all = True
            self._host_down[host] = FetchResult(url, False, error_kind="unreachable",
                                                error=f"{type(exc).__name__}: {str(exc)[:160]}")
            result = (parser, f"robots.txt unreachable ({type(exc).__name__}): not crawling", True)
        self._robots[host] = result
        return result

    def fetch(self, url: str) -> FetchResult:
        parser, _, _ = self.robots(url)
        down = self._host_down.get(urlparse(url).netloc)
        if down:
            return FetchResult(url, False, error_kind=down.error_kind, error=down.error)
        if parser is not None and not parser.can_fetch(config.CRAWLER_USER_AGENT, url):
            return FetchResult(url, False, error_kind="blocked_by_robots", error="Disallowed by robots.txt")
        host = urlparse(url).netloc
        self._wait(host)
        try:
            resp = self.session.get(url, timeout=self.timeout, stream=True)
            content = b""
            for chunk in resp.iter_content(64 * 1024):
                content += chunk
                if len(content) > config.CRAWL_MAX_PDF_BYTES:
                    return FetchResult(url, False, error_kind="too_large", error="File larger than limit")
        except requests.exceptions.SSLError as exc:
            return FetchResult(url, False, error_kind="ssl_error",
                               error=f"SSL certificate verification failed: {str(exc)[:160]}")
        except requests.RequestException as exc:
            return FetchResult(url, False, error_kind="unreachable", error=f"{type(exc).__name__}: {str(exc)[:160]}")
        ctype = resp.headers.get("Content-Type", "").lower()
        if resp.status_code >= 400:
            return FetchResult(url, False, status_code=resp.status_code, error_kind="http_error",
                               error=f"HTTP {resp.status_code}")
        if "html" in ctype and re.search(rb"<title>\s*Account Suspended", content[:3000], re.I):
            return FetchResult(url, False, status_code=resp.status_code, error_kind="suspended",
                               error="Hosting account suspended (site offline)")
        return FetchResult(url, True, content=content, content_type=ctype, status_code=resp.status_code)


# ------------------------------------------------------------------ extraction

def extract_html(html: bytes | str, url: str, source: Source | None = None) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    title = (soup.title.get_text(" ", strip=True) if soup.title else "") or url
    title = re.split(r"\s+[|\-–]\s+", title)[0].strip() or title

    cards = []
    if source and source.card_selector:
        for a in soup.select(source.card_selector):
            heading = a.find(["h2", "h3", "h4", "h5"])
            cat = a.select_one(source.card_category_selector) if source.card_category_selector else None
            paras = [p.get_text(" ", strip=True) for p in a.find_all("p")
                     if not (cat and p is cat)]
            cards.append({
                "url": normalize_url(urljoin(url, a.get("href", ""))),
                "title": heading.get_text(" ", strip=True) if heading else (paras[0] if paras else ""),
                "sector": cat.get_text(" ", strip=True) if cat else None,
                "summary": " ".join(paras)[:400],
            })

    # Links are collected before navigation is stripped: menus often hold the scheme links.
    links = []
    for a in (soup.body or soup).find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        links.append((a.get_text(" ", strip=True), normalize_url(urljoin(url, href))))

    for tag in soup(["script", "style", "noscript", "nav", "header", "footer", "aside", "iframe", "svg"]):
        tag.decompose()
    # Drop small forms (search boxes, newsletter sign-ups) but keep a form that wraps the page: ASP.NET
    # WebForms sites (e.g. acag.punjab.gov.pk) put all of their content inside one <form>.
    body_len = len((soup.body or soup).get_text(" ", strip=True)) or 1
    for form in soup.find_all("form"):
        if len(form.get_text(" ", strip=True)) < 0.5 * body_len:
            form.decompose()
    # Pick the main-content container, but only if it really holds the page's content: some portals have a
    # tiny <article> card or an element id like "MainContent_lblX" that would otherwise swallow the page.
    body = soup.body or soup
    body_len = len(body.get_text(" ", strip=True)) or 1
    candidates = [soup.find("main"), soup.find("article"), soup.find(id=re.compile("content", re.I)),
                  soup.find(class_=re.compile(r"(region-content|entry-content|main-content|page-content)", re.I))]
    main = next((c for c in candidates if c is not None and len(c.get_text(" ", strip=True)) >= 0.25 * body_len), body)
    h1 = main.find("h1") if hasattr(main, "find") else None
    if h1 and h1.get_text(strip=True):
        title = h1.get_text(" ", strip=True)

    blocks = []
    for el in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th"]):
        txt = el.get_text(" ", strip=True)
        if txt and (not blocks or blocks[-1] != txt):
            blocks.append(txt)
    text = "\n".join(blocks)
    # Portals built from <div>/<a> tiles (no <p>/<li>) would lose most of their content: fall back to all text.
    full = main.get_text("\n", strip=True)
    if len(text) < 0.5 * len(full):
        text = full
    return {"title": title[:200], "text": normalize_text(text), "links": links, "cards": cards}


def extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            txt = page.extract_text() or ""
        except Exception:  # noqa: BLE001 - malformed pages are skipped, not fatal
            txt = ""
        if txt.strip():
            pages.append(f"[Page {i}]\n{txt.strip()}")
    return normalize_text("\n\n".join(pages))


# ------------------------------------------------------------------ storage + change detection

def _curated_url_map(conn: sqlite3.Connection) -> dict[str, str]:
    mapping = {}
    for row in conn.execute("SELECT id, source_url FROM schemes WHERE origin = 'curated' AND source_url IS NOT NULL"):
        mapping[normalize_url(row["source_url"])] = row["id"]
    for row in conn.execute("SELECT DISTINCT scheme_id, source_url FROM scheme_criteria"):
        mapping.setdefault(normalize_url(row["source_url"]), row["scheme_id"])
    return mapping


def _diff(old: str, new: str, max_lines: int = 60) -> str:
    split = lambda t: re.split(r"(?<=[.!?\n])\s+", t)  # noqa: E731
    lines = list(difflib.unified_diff(split(old), split(new), "previous", "current", lineterm="", n=0))
    return "\n".join(lines[:max_lines])


def store_document(conn: sqlite3.Connection, *, url: str, source: Source | None, title: str, text: str,
                   content_type: str, snapshot_path: str | None, relevance: float, baseline: bool,
                   curated_map: dict[str, str]) -> str:
    """Insert or update a document. Returns 'new', 'changed', 'unchanged' or 'duplicate'."""
    url = normalize_url(url)
    digest = content_hash(text)
    now = db.now_iso()
    source_id = source.id if source else None
    scheme_id = curated_map.get(url)
    existing = conn.execute("SELECT * FROM documents WHERE url = ?", (url,)).fetchone()

    if existing is None:
        dup = conn.execute("SELECT url FROM documents WHERE content_hash = ?", (digest,)).fetchone()
        if dup:
            return "duplicate"
        conn.execute(
            """INSERT INTO documents (url, source_id, title, content_type, text, content_hash, snapshot_path,
                                      scheme_id, relevance, fetched_at, last_changed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (url, source_id, title, content_type, text, digest, snapshot_path, scheme_id, relevance, now, now))
        if not baseline:
            db.add_change_event(conn, "new_document", f"New official document found: {title}",
                                source_id=source_id, document_url=url, scheme_id=scheme_id)
        return "new"

    if existing["content_hash"] == digest:
        conn.execute("UPDATE documents SET fetched_at = ? WHERE url = ?", (now, url))
        return "unchanged"

    diff = _diff(existing["text"], text)
    significant = any(w in diff.lower() for w in SIGNIFICANT_WORDS)
    scheme_id = scheme_id or existing["scheme_id"]
    conn.execute(
        """UPDATE documents SET title = ?, text = ?, content_hash = ?, snapshot_path = ?, relevance = ?,
                                fetched_at = ?, last_changed_at = ?, scheme_id = ? WHERE url = ?""",
        (title, text, digest, snapshot_path, relevance, now, now, scheme_id, url))
    review = "not_required"
    if significant and scheme_id:
        row = conn.execute("SELECT origin FROM schemes WHERE id = ?", (scheme_id,)).fetchone()
        if row and row["origin"] == "curated":
            conn.execute("UPDATE schemes SET rules_status = 'needs_reverification', updated_at = ? WHERE id = ?",
                         (now, scheme_id))
            review = "pending_review"
    db.add_change_event(
        conn, "content_changed",
        f"Content changed on official page: {title}" + (" (eligibility-related text changed)" if significant else ""),
        source_id=source_id, document_url=url, scheme_id=scheme_id, diff=diff,
        severity="significant" if significant else "info", review_status=review)
    return "changed"


def upsert_discovered_scheme(conn: sqlite3.Connection, *, source: Source, url: str, title: str, summary: str,
                             sector: str | None, baseline: bool, curated_map: dict[str, str]) -> str | None:
    url = normalize_url(url)
    if url in curated_map or not title or not looks_like_scheme_title(title):
        return None
    scheme_id = slugify(title)
    row = conn.execute("SELECT id, origin FROM schemes WHERE id = ? OR source_url = ?", (scheme_id, url)).fetchone()
    now = db.now_iso()
    if row:
        if row["origin"] == "discovered":
            conn.execute("UPDATE schemes SET summary = COALESCE(?, summary), updated_at = ? WHERE id = ?",
                         (summary or None, now, row["id"]))
        return None
    conn.execute(
        """INSERT INTO schemes (id, name, category, level, department, sector, summary, source_url, origin,
                                rules_status, status, discovered_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'discovered', 'not_curated', 'Unverified', ?, ?)""",
        (scheme_id, title, source.category, source.level, source.department, sector, summary[:600], url, now, now))
    conn.execute("UPDATE documents SET scheme_id = ? WHERE url = ? AND scheme_id IS NULL", (scheme_id, url))
    if not baseline:
        db.add_change_event(conn, "new_scheme", f"Newly listed scheme detected: {title}", source_id=source.id,
                            document_url=url, scheme_id=scheme_id, severity="significant",
                            review_status="pending_review")
    return scheme_id


def _snapshot(source_id: str, url: str, content: bytes, ext: str) -> str:
    folder = config.SNAPSHOT_DIR / source_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{hashlib.sha1(url.encode()).hexdigest()[:16]}.{ext}"
    path.write_bytes(content)
    return str(path.relative_to(config.DATA_DIR))


# ------------------------------------------------------------------ crawling

def _wanted_link(source: Source, link_text: str, link_url: str, seed_host: str) -> bool:
    if urlparse(link_url).netloc != seed_host:
        return False
    blob = f"{link_text} {link_url}".lower()
    if any(k in blob for k in EXCLUDE_KEYWORDS + source.exclude):
        return False
    return any(f in blob for f in source.follow)


def crawl_source(source: Source, conn: sqlite3.Connection, fetcher: PoliteFetcher | None = None) -> SourceReport:
    fetcher = fetcher or PoliteFetcher()
    report = SourceReport(source.id, source.name)
    prior = conn.execute("SELECT COUNT(*) FROM documents WHERE source_id = ?", (source.id,)).fetchone()[0]
    baseline = prior == 0
    curated_map = _curated_url_map(conn)

    _, robots_status, ai_allowed = fetcher.robots(source.seeds[0])
    report.robots = robots_status

    queue: list[tuple[str, int, dict | None]] = [(normalize_url(s), 0, None) for s in source.seeds]
    seen: set[str] = set()
    pdfs = 0
    home_title: str | None = None
    seed_host = urlparse(source.seeds[0]).netloc

    max_pages = source.max_pages or config.CRAWL_MAX_PAGES_PER_SOURCE
    while queue and report.pages_fetched < max_pages:
        url, depth, card = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        is_pdf = url.lower().endswith(".pdf")
        if is_pdf and pdfs >= config.CRAWL_MAX_PDFS_PER_SOURCE:
            continue
        result = fetcher.fetch(url)
        report.pages_fetched += 1
        if not result.ok:
            report.errors.append(f"{url}: {result.error}")
            if depth == 0:
                report.status = result.error_kind or "unreachable"
            continue
        if not ai_allowed:
            report.status = "content_signal_blocked"
            break

        if is_pdf or "pdf" in result.content_type:
            pdfs += 1
            try:
                text = extract_pdf(result.content)
            except Exception as exc:  # noqa: BLE001
                report.errors.append(f"{url}: PDF could not be parsed ({type(exc).__name__})")
                continue
            if len(text) < 200:
                report.errors.append(f"{url}: PDF has no extractable text (probably scanned images)")
                continue
            title = (card or {}).get("title") or (card or {}).get("link_text") or url.rsplit("/", 1)[-1]
            score = relevance_score(text, title)
            if score < 3:  # e.g. procurement notices published as PDFs
                report.skipped_irrelevant += 1
                continue
            snap = _snapshot(source.id, url, result.content, "pdf")
            outcome = store_document(conn, url=url, source=source, title=title, text=text, content_type="pdf",
                                     snapshot_path=snap, relevance=score, baseline=baseline, curated_map=curated_map)
            _count(report, outcome)
            continue

        page = extract_html(result.content, url, source)
        is_seed = depth == 0
        if is_seed and home_title is None:
            home_title = page["title"]
        link_text = (card or {}).get("link_text") or ""
        if not is_seed and page["title"] == home_title and len(link_text) >= 6:
            page["title"] = link_text  # site-wide heading: the link that led here names the page better
        score = relevance_score(page["text"], page["title"])
        is_card = bool(card and card.get("url"))
        if not page["text"].strip():
            report.skipped_irrelevant += 1
        elif score >= 3 or is_seed:
            snap = _snapshot(source.id, url, result.content, "html")
            outcome = store_document(conn, url=url, source=source, title=page["title"], text=page["text"],
                                     content_type="html", snapshot_path=snap, relevance=score, baseline=baseline,
                                     curated_map=curated_map)
            _count(report, outcome)
            if is_card or (not is_seed and score >= 6):
                new_id = upsert_discovered_scheme(
                    conn, source=source, url=url, title=(card or {}).get("title") or page["title"],
                    summary=(card or {}).get("summary") or page["text"][:400],
                    sector=(card or {}).get("sector"), baseline=baseline, curated_map=curated_map)
                if new_id:
                    report.schemes_discovered.append(new_id)
        else:
            report.skipped_irrelevant += 1

        if depth >= source.max_depth:
            continue
        for c in page["cards"]:
            queue.append((c["url"], depth + 1, c))
        for text, link in page["links"]:
            if link in seen:
                continue
            if link.lower().endswith(".pdf"):
                if source.follow_pdfs and urlparse(link).netloc == seed_host \
                        and any(k in text.lower() for k in SCHEME_KEYWORDS) \
                        and not any(k in text.lower() for k in EXCLUDE_KEYWORDS):
                    queue.append((link, depth + 1, {"title": text}))
            elif not source.card_selector and _wanted_link(source, text, link, seed_host):
                queue.append((link, depth + 1, {"link_text": text}))

    if report.status == "ok" and report.documents_stored == 0 and report.errors:
        report.status = "unreachable"
    conn.execute(
        """UPDATE sources SET status = ?, last_checked_at = ?, last_error = ?, robots_status = ?,
                              pages_fetched = ? WHERE id = ?""",
        (report.status, db.now_iso(), "; ".join(report.errors[:3]) or None, report.robots, report.pages_fetched,
         source.id))
    if report.status not in ("ok",) and not baseline:
        db.add_change_event(conn, "source_unreachable", f"Source unavailable: {source.name} ({report.status})",
                            source_id=source.id, severity="info")
    return report


def _count(report: SourceReport, outcome: str) -> None:
    if outcome in ("new", "changed", "unchanged"):
        report.documents_stored += 1
    if outcome == "new":
        report.documents_new += 1
    elif outcome == "changed":
        report.documents_changed += 1


def register_sources(conn: sqlite3.Connection, sources: tuple[Source, ...] = SOURCES) -> None:
    for s in sources:
        conn.execute(
            """INSERT INTO sources (id, name, url, category, level, department) VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name = excluded.name, url = excluded.url,
                   category = excluded.category, level = excluded.level, department = excluded.department""",
            (s.id, s.name, s.seeds[0], s.category, s.level, s.department))


def run_crawl(source_ids: list[str] | None = None, fetcher: PoliteFetcher | None = None,
              sources: tuple[Source, ...] = SOURCES) -> list[SourceReport]:
    db.init_db()
    fetcher = fetcher or PoliteFetcher()
    reports = []
    with db.session() as conn:
        register_sources(conn, sources)
    for source in sources:
        if source_ids and source.id not in source_ids:
            continue
        log.info("Crawling %s", source.name)
        with db.session() as conn:
            reports.append(crawl_source(source, conn, fetcher))
    with db.session() as conn:
        write_manifest(conn)
    return reports


# ------------------------------------------------------------------ offline snapshot manifest

def write_manifest(conn: sqlite3.Connection) -> Path:
    """Record which snapshot file holds which official URL, so the corpus can be rebuilt offline."""
    entries = [{"url": r["url"], "source_id": r["source_id"], "title": r["title"], "content_type": r["content_type"],
                "snapshot_path": r["snapshot_path"], "fetched_at": r["fetched_at"]}
               for r in conn.execute("SELECT * FROM documents WHERE snapshot_path IS NOT NULL ORDER BY url")]
    path = config.SNAPSHOT_DIR / "manifest.json"
    path.write_text(json.dumps(entries, indent=1, ensure_ascii=False), encoding="utf-8")
    return path


def snapshot_text(entry: dict) -> str:
    data = (config.DATA_DIR / entry["snapshot_path"]).read_bytes()
    if entry["content_type"] in ("pdf", "manual_pdf"):
        return extract_pdf(data)
    source = SOURCES_BY_ID.get(entry["source_id"] or "")
    return extract_html(data, entry["url"], source)["text"]


def rebuild_from_snapshots() -> int:
    """Offline fallback: rebuild the documents table from saved snapshots (no network needed)."""
    db.init_db()
    manifest = json.loads((config.SNAPSHOT_DIR / "manifest.json").read_text(encoding="utf-8"))
    with db.session() as conn:
        register_sources(conn)
        curated = _curated_url_map(conn)
        for e in manifest:
            text = snapshot_text(e)
            store_document(conn, url=e["url"], source=SOURCES_BY_ID.get(e["source_id"] or ""), title=e["title"],
                           text=text, content_type=e["content_type"], snapshot_path=e["snapshot_path"],
                           relevance=relevance_score(text, e["title"]), baseline=True, curated_map=curated)
            conn.execute("UPDATE documents SET fetched_at = ? WHERE url = ?", (e["fetched_at"], normalize_url(e["url"])))
    return len(manifest)


# ------------------------------------------------------------------ manual ingestion (fallback)

def ingest_manual(*, url: str, title: str, data: bytes | None = None, source_id: str | None = None) -> str:
    """Ingest an official PDF/URL by hand when automatic crawling is not possible."""
    db.init_db()
    source = SOURCES_BY_ID.get(source_id) if source_id else None
    if data is None:
        result = PoliteFetcher().fetch(url)
        if not result.ok:
            raise RuntimeError(f"Could not fetch {url}: {result.error}")
        data, is_pdf = result.content, url.lower().endswith(".pdf") or "pdf" in result.content_type
    else:
        is_pdf = data[:5] == b"%PDF-"
    if is_pdf:
        text, ctype, ext = extract_pdf(data), "manual_pdf", "pdf"
    else:
        page = extract_html(data, url)
        text, ctype, ext = page["text"], "manual_url", "html"
        title = title or page["title"]
    if len(text) < 100:
        raise RuntimeError("Document has no extractable text (it may be a scanned image).")
    with db.session() as conn:
        snap = _snapshot(source_id or "manual", url, data, ext)
        outcome = store_document(conn, url=url, source=source, title=title, text=text, content_type=ctype,
                                 snapshot_path=snap, relevance=relevance_score(text, title), baseline=False,
                                 curated_map=_curated_url_map(conn))
        write_manifest(conn)
        return outcome
