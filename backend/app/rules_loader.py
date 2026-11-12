"""Load human-verified scheme rules (data/rules.yaml) into SQLite and check their quotes against sources."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import date
from pathlib import Path
from typing import Any

import yaml

from app import config, db
from app.crawler.crawler import normalize_url

VALID_STATUSES = {"Open", "Closed", "Upcoming", "Suspended", "Unverified"}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("’", "'").replace("‘", "'")).strip().lower()


def load_rules_file(path: Path | None = None) -> list[dict[str, Any]]:
    data = yaml.safe_load((path or config.RULES_PATH).read_text(encoding="utf-8")) or {}
    return data.get("schemes", [])


def effective_status(scheme: dict[str, Any], today: date | None = None) -> str:
    """A scheme is Open/Upcoming/Closed only when official dates are confirmed. Otherwise Unverified."""
    today = today or date.today()
    stored = scheme.get("status") or "Unverified"
    if stored in ("Suspended", "Closed") and scheme.get("status_quote"):
        return stored
    opening, deadline = scheme.get("opening_date"), scheme.get("deadline")
    try:
        opening_d = date.fromisoformat(str(opening)) if opening else None
        deadline_d = date.fromisoformat(str(deadline)) if deadline else None
    except ValueError:
        return "Unverified"
    if deadline_d and today > deadline_d:
        return "Closed"
    if opening_d and today < opening_d:
        return "Upcoming"
    if opening_d and deadline_d:
        return "Open"
    if stored == "Open" and scheme.get("status_quote"):
        return "Open"
    return "Unverified"


def verify_quotes(conn: sqlite3.Connection, schemes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Check that every quoted rule text really appears in the stored official document."""
    docs = {normalize_url(r["url"]): _norm(r["text"]) for r in conn.execute("SELECT url, text FROM documents")}
    report = []
    for s in schemes:
        items = [("criterion", c) for c in s.get("criteria", [])]
        items += [(kind, i) for kind in ("benefits", "documents", "steps") for i in s.get(kind, [])]
        for kind, item in items:
            quote = item.get("quote")
            if not quote:
                continue
            url = normalize_url(item.get("source_url") or s["source_url"])
            text = docs.get(url)
            report.append({
                "scheme_id": s["id"], "kind": kind, "quote": quote, "source_url": url,
                "status": "no_snapshot" if text is None else ("found" if _norm(quote) in text else "NOT_FOUND"),
            })
        # An Open / Closed / Suspended status is a factual claim too: its quote must be on the official page.
        if s.get("status_quote"):
            url = normalize_url(s.get("status_source_url") or s["source_url"])
            text = docs.get(url)
            report.append({
                "scheme_id": s["id"], "kind": "status", "quote": s["status_quote"], "source_url": url,
                "status": "no_snapshot" if text is None else ("found" if _norm(s["status_quote"]) in text else "NOT_FOUND"),
            })
    return report


def load_into_db(conn: sqlite3.Connection, path: Path | None = None) -> int:
    schemes = load_rules_file(path)
    now = db.now_iso()
    for s in schemes:
        status = s.get("status", "Unverified")
        if status not in VALID_STATUSES:
            raise ValueError(f"{s['id']}: invalid status {status}")
        existing = conn.execute("SELECT rules_status, last_verified, rules_hash, updated_at FROM schemes WHERE id = ?",
                                (s["id"],)).fetchone()
        entry_hash = hashlib.sha256(json.dumps(s, sort_keys=True, default=str).encode()).hexdigest()
        unchanged = existing is not None and existing["rules_hash"] == entry_hash
        conn.execute(
            """INSERT INTO schemes (id, name, name_ur, category, level, department, phase, sector, summary, source_url,
                                    application_url, origin, rules_status, status, status_quote, opening_date,
                                    deadline, last_verified, rules_hash, discovered_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'curated', 'verified', ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 name = excluded.name, name_ur = excluded.name_ur, category = excluded.category,
                 level = excluded.level, department = excluded.department, phase = excluded.phase,
                 sector = excluded.sector, summary = excluded.summary, source_url = excluded.source_url,
                 application_url = excluded.application_url, origin = 'curated', rules_status = 'verified',
                 status = excluded.status, status_quote = excluded.status_quote,
                 opening_date = excluded.opening_date, deadline = excluded.deadline,
                 last_verified = excluded.last_verified, rules_hash = excluded.rules_hash,
                 updated_at = excluded.updated_at""",
            (s["id"], s["name"], s.get("name_ur"), s["category"], s["level"], s.get("department"), s.get("phase"),
             s.get("sector"), s.get("summary"), s["source_url"], s.get("application_url"), status,
             s.get("status_quote"), s.get("opening_date"), s.get("deadline"), str(s.get("last_verified", "")),
             entry_hash, now, existing["updated_at"] if unchanged else now))
        conn.execute("DELETE FROM scheme_criteria WHERE scheme_id = ?", (s["id"],))
        conn.execute("DELETE FROM scheme_items WHERE scheme_id = ?", (s["id"],))
        for c in s.get("criteria", []):
            conn.execute(
                """INSERT INTO scheme_criteria (scheme_id, criterion_id, field, op, value_json, when_json, label,
                                                quote, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (s["id"], c["id"], c.get("field"), c["op"],
                 json.dumps(c["value"]) if "value" in c else None,
                 json.dumps(c["when"]) if c.get("when") else None,
                 c["label"], c["quote"], c.get("source_url") or s["source_url"]))
        for kind, key in (("benefit", "benefits"), ("document", "documents"), ("step", "steps")):
            for pos, item in enumerate(s.get(key, [])):
                conn.execute(
                    "INSERT INTO scheme_items (scheme_id, kind, position, text, quote, source_url) VALUES (?, ?, ?, ?, ?, ?)",
                    (s["id"], kind, pos, item["text"], item.get("quote"), item.get("source_url") or s["source_url"]))
        # discovered duplicate of a curated scheme (same official page) is folded into the curated record
        conn.execute("DELETE FROM schemes WHERE origin = 'discovered' AND source_url = ? AND id != ?",
                     (normalize_url(s["source_url"]), s["id"]))
        conn.execute("UPDATE documents SET scheme_id = ?, indexed_hash = NULL WHERE url = ? AND "
                     "COALESCE(scheme_id, '') != ?", (s["id"], normalize_url(s["source_url"]), s["id"]))
        if existing and existing["rules_status"] == "needs_reverification":
            _resolve_review(conn, s, existing["last_verified"])
    _remove_retired(conn, {s["id"] for s in schemes})
    return len(schemes)


def _remove_retired(conn: sqlite3.Connection, keep: set[str]) -> None:
    """Curated schemes deleted from rules.yaml (e.g. ended programmes) are removed from the database too,
    so they no longer appear in search, eligibility checks or the UI."""
    retired = [r["id"] for r in conn.execute("SELECT id FROM schemes WHERE origin = 'curated'") if r["id"] not in keep]
    for sid in retired:
        conn.execute("DELETE FROM scheme_criteria WHERE scheme_id = ?", (sid,))
        conn.execute("DELETE FROM scheme_items WHERE scheme_id = ?", (sid,))
        conn.execute("DELETE FROM saved_schemes WHERE scheme_id = ?", (sid,))
        conn.execute("UPDATE documents SET scheme_id = NULL, indexed_hash = NULL WHERE scheme_id = ?", (sid,))
        conn.execute("UPDATE change_events SET review_status = 'retired' WHERE scheme_id = ? AND "
                     "review_status = 'pending_review'", (sid,))
        conn.execute("DELETE FROM schemes WHERE id = ?", (sid,))


def _resolve_review(conn: sqlite3.Connection, s: dict[str, Any], previous_verified: str | None) -> None:
    """A pending source change is cleared only when a human bumps last_verified (to the change date or later).

    last_verified may be a date (2026-11-02) or a date-time (2026-11-01T18:30) for same-day re-verification.
    """
    pending = conn.execute(
        "SELECT MAX(detected_at) FROM change_events WHERE scheme_id = ? AND review_status = 'pending_review'",
        (s["id"],)).fetchone()[0]
    verified = str(s.get("last_verified", ""))
    if pending and verified != (previous_verified or "") and verified >= pending[:10]:
        conn.execute("UPDATE change_events SET review_status = 'verified' WHERE scheme_id = ? AND "
                     "review_status = 'pending_review'", (s["id"],))
        db.add_change_event(conn, "rules_reloaded", f"Eligibility rules re-verified and republished: {s['name']}",
                            scheme_id=s["id"], severity="significant", review_status="verified")
    else:
        conn.execute("UPDATE schemes SET rules_status = 'needs_reverification' WHERE id = ?", (s["id"],))
