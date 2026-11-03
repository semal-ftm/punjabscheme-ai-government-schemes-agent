"""PunjabScheme MCP server (official Python MCP SDK, stdio transport).

Run standalone:  python -m app.mcp_server.server
The agent starts this module as a child process and talks to it through an MCP ClientSession.
Every tool answers only from the SQLite store of verified/crawled official data.
"""
from __future__ import annotations

import difflib
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from mcp.server.mcpserver import MCPServer

from app import db
from app.eligibility import check_scheme, normalize_profile
from app.rules_loader import effective_status

NOT_CONFIRMED = "Not Officially Confirmed"
CATEGORY_LABELS = {"cm_punjab": "CM Punjab Initiative", "punjab_department": "Punjab Department",
                   "federal": "Federal Programme"}

# Roman Urdu / everyday words mapped to the vocabulary used in official pages.
SYNONYMS = {
    "student": ["scholarship", "education", "stipend", "laptop", "wazaif", "taleemi", "student"],
    "students": ["scholarship", "education", "stipend", "laptop", "wazaif", "taleemi"],
    "university": ["scholarship", "education", "undergraduate", "laptop", "higher education"],
    "matric": ["education", "school", "taleemi", "secondary", "scholarship"],
    "school": ["education", "taleemi", "school"],
    "wazifa": ["scholarship", "stipend", "wazaif"], "taleem": ["education", "taleemi", "scholarship"],
    "qarz": ["loan", "financing"], "qarza": ["loan", "financing"], "loan": ["loan", "financing", "interest-free"],
    "ghar": ["housing", "home", "chhat", "house"], "makan": ["housing", "home", "chhat"], "house": ["housing", "home", "chhat"],
    "kisan": ["kissan", "farmer", "agriculture", "tractor"], "farmer": ["kissan", "farmer", "agriculture", "tractor"],
    "mazdoor": ["worker", "labour", "workers welfare", "pessi"], "worker": ["worker", "labour", "workers welfare", "pessi"],
    "sehat": ["health", "healthcare", "medical"], "health": ["health", "healthcare", "medical", "cancer"],
    "ilaaj": ["health", "medical", "treatment"], "rashan": ["ration", "food"], "ration": ["ration", "food", "nigehban"],
    "aurat": ["women", "female", "kafaalat"], "women": ["women", "female", "kafaalat", "dhee rani"],
    "shadi": ["marriage", "dhee rani"], "marriage": ["marriage", "dhee rani"], "poor": ["poverty", "low-income", "kafaalat", "relief"],
    "ghareeb": ["poverty", "low-income", "kafaalat", "relief"], "flood": ["flood", "sailab"], "baahar": ["abroad", "parwaaz"],
    "abroad": ["abroad", "parwaaz", "overseas"], "bachay": ["children", "nashonuma", "taleemi"], "child": ["children", "nashonuma"],
}

# Words that appear in almost every request or scheme page and carry no topic.
STOPWORDS = {"the", "and", "for", "from", "which", "what", "can", "apply", "scheme", "schemes", "program",
             "programme", "programs", "punjab", "government", "govt", "how", "who", "are", "you", "your", "with",
             "about", "any", "all", "eligible", "eligibility", "want", "need", "kya", "hai", "mujhe", "liye",
             "kon", "konsi", "kaun", "sakta", "sakti", "hoon", "main", "mein", "this", "that", "there"}

mcp = MCPServer("punjabscheme-tools", version="1.0.0",
                instructions="Tools over verified Punjab/federal scheme data. Every result cites official sources.")


def _sources(scheme: dict[str, Any]) -> list[dict[str, Any]]:
    urls = [scheme.get("source_url")]
    urls += [c.get("source_url") for c in scheme.get("criteria", [])]
    urls += [i.get("source_url") for key in ("benefits", "documents", "steps") for i in scheme.get(key, [])]
    return [{"url": u, "last_verified": scheme.get("last_verified") or NOT_CONFIRMED}
            for u in dict.fromkeys(u for u in urls if u)]


def _brief(scheme: dict[str, Any]) -> dict[str, Any]:
    return {
        "scheme_id": scheme["id"], "name": scheme["name"], "category": scheme["category"],
        "category_label": CATEGORY_LABELS.get(scheme["category"], scheme["category"]),
        "level": scheme["level"], "department": scheme.get("department"), "phase": scheme.get("phase"),
        "sector": scheme.get("sector"), "summary": scheme.get("summary"),
        "status": effective_status(scheme), "rules_status": scheme["rules_status"],
        "origin": scheme["origin"], "source_url": scheme.get("source_url"),
        "last_verified": scheme.get("last_verified") or NOT_CONFIRMED,
    }


def _resolve(conn, scheme_id: str) -> tuple[dict | None, dict | None]:
    scheme = db.get_scheme(conn, scheme_id)
    if scheme:
        return scheme, None
    ids = [r["id"] for r in conn.execute("SELECT id FROM schemes")]
    names = {r["name"].lower(): r["id"] for r in conn.execute("SELECT id, name FROM schemes")}
    guesses = difflib.get_close_matches(scheme_id.lower(), ids + list(names), n=3, cutoff=0.4)
    return None, {"error": f"Unknown scheme_id '{scheme_id}'.",
                  "did_you_mean": list(dict.fromkeys(names.get(g, g) for g in guesses))}


@mcp.tool()
def search_schemes(query: str = "", category: str | None = None, level: str | None = None,
                   status: str | None = None, limit: int = 10) -> dict[str, Any]:
    """Search official Punjab/federal schemes by keywords (English or Roman Urdu).

    category: cm_punjab | punjab_department | federal. level: provincial | federal.
    status: Open | Closed | Upcoming | Suspended | Unverified.
    """
    terms = [t for t in re.findall(r"[a-z0-9\-]+", query.lower()) if len(t) > 2 and t not in STOPWORDS]
    expanded = set(terms)
    for t in terms:
        expanded.update(SYNONYMS.get(t, []))
    results = []
    with db.session() as conn:
        for row in db.list_schemes(conn):
            if category and row["category"] != category or level and row["level"] != level:
                continue
            scheme = db.get_scheme(conn, row["id"])
            st = effective_status(scheme)
            if status and st.lower() != status.lower():
                continue
            name = scheme["name"].lower()
            body = " ".join([scheme.get("summary") or "", scheme.get("sector") or "", scheme.get("department") or "",
                             " ".join(c["label"] for c in scheme["criteria"]),
                             " ".join(b["text"] for b in scheme["benefits"])]).lower()
            matched = sorted({t for t in expanded if t in name or t in body})
            score = sum(3 if t in name else 1 for t in matched)
            if expanded and not matched:
                continue
            if scheme["origin"] == "curated":
                score += 0.5  # verified rules are more useful than auto-discovered entries
            results.append({**_brief(scheme), "match_score": score, "matched_terms": matched})
    results.sort(key=lambda r: (-r["match_score"], r["name"]))
    return {"query": query, "expanded_terms": sorted(expanded), "count": len(results[:limit]),
            "results": results[:limit],
            "note": "Schemes with rules_status 'not_curated' were auto-discovered; eligibility rules are not verified."}


@mcp.tool()
def check_eligibility(profile: dict[str, Any], scheme_ids: list[str] | None = None) -> dict[str, Any]:
    """Deterministically check a user profile against verified scheme criteria.

    profile keys: age, gender, marital_status, province, district, area_type, education_level,
    currently_enrolled, current_semester, institution_type, intermediate_marks_percent,
    received_laptop_before, has_driving_licence, monthly_household_income, employment_type,
    registered_with_pessi, registered_industrial_worker, bisp_beneficiary, owns_plot, plot_size_marla,
    land_acres, has_disability.
    If scheme_ids is empty, all schemes with verified rules are checked.
    """
    clean = normalize_profile(profile)
    out, errors = [], []
    with db.session() as conn:
        ids = scheme_ids or [r["id"] for r in conn.execute("SELECT id FROM schemes WHERE origin = 'curated'")]
        for sid in ids:
            scheme, err = _resolve(conn, sid)
            if err:
                errors.append(err)
                continue
            result = check_scheme(scheme, clean)
            result["status"] = effective_status(scheme)
            result["sources"] = _sources(scheme)
            out.append(result)
    order = {"Potentially Eligible": 0, "More Information Needed": 1, "Not Eligible Based on Known Rules": 2}
    out.sort(key=lambda r: order.get(r["verdict"], 3))
    return {"profile_used": clean, "results": out, "errors": errors}


@mcp.tool()
def get_required_documents(scheme_id: str) -> dict[str, Any]:
    """Required documents for a scheme, exactly as published by the official source."""
    with db.session() as conn:
        scheme, err = _resolve(conn, scheme_id)
        if err:
            return err
        docs = scheme["documents"]
        return {"scheme_id": scheme["id"], "name": scheme["name"],
                "documents": docs or NOT_CONFIRMED,
                "note": None if docs else "The official source does not list required documents. Check the official "
                                          "page or helpline before applying.",
                "sources": _sources(scheme)}


@mcp.tool()
def get_scheme_deadline(scheme_id: str) -> dict[str, Any]:
    """Opening date, deadline, status and days remaining. Never assumes a scheme is open."""
    with db.session() as conn:
        scheme, err = _resolve(conn, scheme_id)
        if err:
            return err
        status = effective_status(scheme)
        days_left = None
        if scheme.get("deadline"):
            try:
                days_left = (date.fromisoformat(str(scheme["deadline"])) - date.today()).days
            except ValueError:
                pass
        return {"scheme_id": scheme["id"], "name": scheme["name"], "status": status,
                "opening_date": scheme.get("opening_date") or NOT_CONFIRMED,
                "deadline": scheme.get("deadline") or NOT_CONFIRMED,
                "days_left": days_left, "status_evidence": scheme.get("status_quote"),
                "note": None if status != "Unverified" else
                "No officially confirmed application window was found. Do not assume the scheme is currently open.",
                "sources": _sources(scheme)}


@mcp.tool()
def get_application_process(scheme_id: str) -> dict[str, Any]:
    """Official application steps and the official application link."""
    with db.session() as conn:
        scheme, err = _resolve(conn, scheme_id)
        if err:
            return err
        return {"scheme_id": scheme["id"], "name": scheme["name"],
                "steps": scheme["steps"] or NOT_CONFIRMED,
                "application_url": scheme.get("application_url") or NOT_CONFIRMED,
                "official_page": scheme.get("source_url"), "sources": _sources(scheme)}


@mcp.tool()
def compare_schemes(scheme_ids: list[str]) -> dict[str, Any]:
    """Side-by-side comparison of 2-4 schemes: level, benefits, key criteria, documents, status."""
    rows, errors = [], []
    with db.session() as conn:
        for sid in scheme_ids[:4]:
            scheme, err = _resolve(conn, sid)
            if err:
                errors.append(err)
                continue
            rows.append({**_brief(scheme),
                         "benefits": [b["text"] for b in scheme["benefits"]] or [NOT_CONFIRMED],
                         "key_criteria": [c["label"] for c in scheme["criteria"]] or [NOT_CONFIRMED],
                         "documents": [d["text"] for d in scheme["documents"]] or [NOT_CONFIRMED],
                         "deadline": scheme.get("deadline") or NOT_CONFIRMED,
                         "application_url": scheme.get("application_url") or NOT_CONFIRMED,
                         "sources": _sources(scheme)})
    return {"schemes": rows, "errors": errors}


@mcp.tool()
def check_latest_updates(days: int = 30, scheme_id: str | None = None) -> dict[str, Any]:
    """Recently detected changes: new schemes, changed official pages, unreachable sources, re-verified rules."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0).isoformat()
    with db.session() as conn:
        sql, args = "SELECT * FROM change_events WHERE detected_at >= ?", [since]
        if scheme_id:
            sql += " AND scheme_id = ?"
            args.append(scheme_id)
        events = db.rows(conn.execute(sql + " ORDER BY detected_at DESC LIMIT 30", args))
        sources = db.rows(conn.execute("SELECT id, name, status, last_checked_at, last_error FROM sources"))
        pending = conn.execute("SELECT COUNT(*) FROM change_events WHERE review_status = 'pending_review'").fetchone()[0]
    for e in events:
        e["diff"] = (e["diff"] or "")[:600] or None
    return {"since": since, "events": events, "pending_review": pending, "source_status": sources}


def main() -> None:
    db.init_db()
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
