"""SQLite storage: scheme rules, sources, documents, change history and long-term user memory."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from app import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    url             TEXT NOT NULL,
    category        TEXT NOT NULL,          -- cm_punjab | punjab_department | federal
    level           TEXT NOT NULL,          -- provincial | federal
    department      TEXT,
    status          TEXT DEFAULT 'never_checked', -- ok | unreachable | ssl_error | suspended | blocked_by_robots
    last_checked_at TEXT,
    last_error      TEXT,
    robots_status   TEXT,
    pages_fetched   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    url             TEXT UNIQUE NOT NULL,
    source_id       TEXT REFERENCES sources(id),
    title           TEXT,
    content_type    TEXT NOT NULL,          -- html | pdf | manual_pdf | manual_url
    text            TEXT NOT NULL,
    content_hash    TEXT NOT NULL,
    snapshot_path   TEXT,
    scheme_id       TEXT,
    relevance       REAL DEFAULT 0,
    fetched_at      TEXT NOT NULL,
    last_changed_at TEXT NOT NULL,
    indexed_hash    TEXT                    -- hash that is currently in ChromaDB
);

CREATE TABLE IF NOT EXISTS schemes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    name_ur         TEXT,
    category        TEXT NOT NULL,          -- cm_punjab | punjab_department | federal
    level           TEXT NOT NULL,          -- provincial | federal
    department      TEXT,
    phase           TEXT,
    sector          TEXT,
    summary         TEXT,
    source_url      TEXT,
    application_url TEXT,
    origin          TEXT NOT NULL,          -- curated | discovered
    rules_status    TEXT NOT NULL,          -- verified | needs_reverification | not_curated
    status          TEXT DEFAULT 'Unverified', -- Open | Ongoing | Closed | Upcoming | Suspended | Unverified
    status_quote    TEXT,                   -- verbatim official sentence that backs the status
    status_source_url TEXT,                 -- official page the status quote comes from
    status_note     TEXT,                   -- plain-language summary of what the official page says
    status_checked  TEXT,                   -- date a person last checked the status evidence
    opening_date    TEXT,
    deadline        TEXT,
    last_verified   TEXT,
    rules_hash      TEXT,                   -- hash of the verified rules entry (detects real rule edits)
    discovered_at   TEXT,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS scheme_criteria (
    scheme_id    TEXT NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    criterion_id TEXT NOT NULL,
    field        TEXT,                      -- profile field it checks (NULL = manual verification)
    op           TEXT NOT NULL,             -- eq | in | not_in | between | lte | gte | true | manual
    value_json   TEXT,
    when_json    TEXT,                      -- optional condition, e.g. only applies when area_type = urban
    label        TEXT NOT NULL,
    quote        TEXT NOT NULL,             -- verbatim text from the official source
    source_url   TEXT NOT NULL,
    PRIMARY KEY (scheme_id, criterion_id)
);

CREATE TABLE IF NOT EXISTS scheme_items (
    scheme_id  TEXT NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,               -- benefit | document | step
    position   INTEGER NOT NULL,
    text       TEXT NOT NULL,
    quote      TEXT,
    source_url TEXT,
    PRIMARY KEY (scheme_id, kind, position)
);

CREATE TABLE IF NOT EXISTS change_events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at   TEXT NOT NULL,
    event_type    TEXT NOT NULL,            -- new_scheme | new_document | content_changed | source_unreachable | rules_reloaded
    source_id     TEXT,
    document_url  TEXT,
    scheme_id     TEXT,
    summary       TEXT NOT NULL,
    diff          TEXT,
    severity      TEXT DEFAULT 'info',      -- info | significant
    review_status TEXT DEFAULT 'not_required' -- not_required | pending_review | verified
);

CREATE TABLE IF NOT EXISTS users (
    user_id            TEXT PRIMARY KEY,
    display_name       TEXT,
    preferred_language TEXT DEFAULT 'en',
    consent_to_store   INTEGER DEFAULT 0,
    created_at         TEXT NOT NULL,
    last_seen_at       TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id      TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    profile_json TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_schemes (
    user_id   TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    scheme_id TEXT NOT NULL,
    note      TEXT,
    saved_at  TEXT NOT NULL,
    PRIMARY KEY (user_id, scheme_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    session_id      TEXT PRIMARY KEY,
    user_id         TEXT,
    started_at      TEXT NOT NULL,
    last_message_at TEXT,
    summary         TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES conversations(session_id) ON DELETE CASCADE,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    trace_json TEXT,
    created_at TEXT NOT NULL
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path or config.DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def session(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


MIGRATIONS = {  # columns added after the first release: (table, column, type)
    ("schemes", "status_source_url", "TEXT"),
    ("schemes", "status_note", "TEXT"),
    ("schemes", "status_checked", "TEXT"),
}


def init_db(db_path: Path | None = None) -> None:
    with session(db_path) as conn:
        conn.executescript(SCHEMA)
        for table, column, ctype in MIGRATIONS:
            existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
            if column not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ctype}")


def rows(cursor: sqlite3.Cursor) -> list[dict[str, Any]]:
    return [dict(r) for r in cursor.fetchall()]


# ---------------------------------------------------------------- schemes

def get_scheme(conn: sqlite3.Connection, scheme_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM schemes WHERE id = ?", (scheme_id,)).fetchone()
    if not row:
        return None
    scheme = dict(row)
    scheme["criteria"] = [
        {**c, "value": json.loads(c["value_json"]) if c["value_json"] else None,
         "when": json.loads(c["when_json"]) if c["when_json"] else None}
        for c in rows(conn.execute(
            "SELECT * FROM scheme_criteria WHERE scheme_id = ? ORDER BY rowid", (scheme_id,)))
    ]
    for kind, key in (("benefit", "benefits"), ("document", "documents"), ("step", "steps")):
        scheme[key] = rows(conn.execute(
            "SELECT text, quote, source_url FROM scheme_items WHERE scheme_id = ? AND kind = ? ORDER BY position",
            (scheme_id, kind)))
    return scheme


def list_schemes(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    return rows(conn.execute("SELECT * FROM schemes ORDER BY category, name"))


def add_change_event(conn: sqlite3.Connection, event_type: str, summary: str, *, source_id: str | None = None,
                     document_url: str | None = None, scheme_id: str | None = None, diff: str | None = None,
                     severity: str = "info", review_status: str = "not_required") -> None:
    conn.execute(
        """INSERT INTO change_events (detected_at, event_type, source_id, document_url, scheme_id,
                                      summary, diff, severity, review_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (now_iso(), event_type, source_id, document_url, scheme_id, summary, diff, severity, review_status),
    )


# ---------------------------------------------------------------- long-term user memory

def ensure_user(conn: sqlite3.Connection, user_id: str, display_name: str | None = None) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        conn.execute("INSERT INTO users (user_id, display_name, created_at, last_seen_at) VALUES (?, ?, ?, ?)",
                     (user_id, display_name or user_id, now_iso(), now_iso()))
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row)


def set_consent(conn: sqlite3.Connection, user_id: str, consent: bool) -> None:
    ensure_user(conn, user_id)
    conn.execute("UPDATE users SET consent_to_store = ? WHERE user_id = ?", (int(consent), user_id))
    if not consent:
        conn.execute("DELETE FROM user_profiles WHERE user_id = ?", (user_id,))


def get_profile(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT profile_json FROM user_profiles WHERE user_id = ?", (user_id,)).fetchone()
    return json.loads(row["profile_json"]) if row else {}


def save_profile(conn: sqlite3.Connection, user_id: str, profile: dict[str, Any]) -> bool:
    """Persist the profile only if the user consented. Returns True when stored."""
    user = ensure_user(conn, user_id)
    if not user["consent_to_store"]:
        return False
    conn.execute(
        """INSERT INTO user_profiles (user_id, profile_json, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at""",
        (user_id, json.dumps(profile, ensure_ascii=False), now_iso()),
    )
    return True


def delete_user_data(conn: sqlite3.Connection, user_id: str) -> None:
    conn.execute("DELETE FROM messages WHERE session_id IN (SELECT session_id FROM conversations WHERE user_id = ?)",
                 (user_id,))
    conn.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM user_profiles WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM saved_schemes WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))


def last_conversation_summary(conn: sqlite3.Connection, user_id: str, exclude_session: str | None = None) -> dict | None:
    row = conn.execute(
        """SELECT session_id, summary, last_message_at FROM conversations
           WHERE user_id = ? AND summary IS NOT NULL AND session_id != COALESCE(?, '')
           ORDER BY last_message_at DESC LIMIT 1""",
        (user_id, exclude_session),
    ).fetchone()
    return dict(row) if row else None


def record_message(conn: sqlite3.Connection, session_id: str, user_id: str | None, role: str, content: str,
                   trace: list[dict] | None = None, summary: str | None = None) -> None:
    conn.execute(
        """INSERT INTO conversations (session_id, user_id, started_at, last_message_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(session_id) DO UPDATE SET last_message_at = excluded.last_message_at""",
        (session_id, user_id, now_iso(), now_iso()),
    )
    if summary is not None:
        conn.execute("UPDATE conversations SET summary = ? WHERE session_id = ?", (summary, session_id))
    conn.execute(
        "INSERT INTO messages (session_id, role, content, trace_json, created_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, role, content, json.dumps(trace, ensure_ascii=False) if trace else None, now_iso()),
    )
