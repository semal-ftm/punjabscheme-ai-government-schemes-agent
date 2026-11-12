"""Tavily live web search, restricted to official government domains.

RAG answers from documents the crawler saved earlier. Tavily adds a *live* look at the same official
sites, so the agent can catch announcements, deadlines and news published after the last crawl.
Only the domains below are ever searched: results from any other site are dropped.
"""
from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlparse

import requests

from app import config

TAVILY_URL = "https://api.tavily.com/search"

# Official sources the live search may use (and what each one is for).
LIVE_SOURCES: list[dict[str, Any]] = [
    {"id": "punjab_gov", "name": "Punjab Government Portal", "domains": ["punjab.gov.pk"],
     "purpose": "Punjab schemes, departments and official announcements", "level": "provincial"},
    {"id": "pspa", "name": "Punjab Social Protection Authority", "domains": ["pspa.punjab.gov.pk"],
     "purpose": "Social protection, financial assistance and welfare programmes", "level": "provincial"},
    {"id": "pessi", "name": "PESSI", "domains": ["pessi.punjab.gov.pk"],
     "purpose": "Registered workers' benefits and social security", "level": "provincial"},
    {"id": "pwwf", "name": "Punjab Workers Welfare Fund", "domains": ["pwwf.punjab.gov.pk"],
     "purpose": "Workers' scholarships, grants and housing assistance", "level": "provincial"},
    {"id": "bisp", "name": "BISP", "domains": ["bisp.gov.pk"],
     "purpose": "Benazir Kafaalat, Taleemi Wazaif and federal welfare schemes", "level": "federal"},
]
_BY_ID = {s["id"]: s for s in LIVE_SOURCES}


class TavilyError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(config.TAVILY_API_KEY)


def _source_for(url: str) -> dict[str, Any] | None:
    host = (urlparse(url).hostname or "").lower()
    # Most specific domain first (pspa.punjab.gov.pk before punjab.gov.pk)
    for s in sorted(LIVE_SOURCES, key=lambda s: -max(len(d) for d in s["domains"])):
        if any(host == d or host.endswith("." + d) for d in s["domains"]):
            return s
    return None


def search(query: str, source_ids: list[str] | None = None, max_results: int | None = None,
           api_key: str | None = None) -> dict[str, Any]:
    """Search the official domains live. Raises TavilyError when not configured or the API fails."""
    key = api_key or config.TAVILY_API_KEY
    if not key:
        raise TavilyError("TAVILY_API_KEY is not set. Add it to backend/.env to enable live search.")
    query = (query or "").strip()
    if not query:
        raise TavilyError("Empty query.")
    chosen = [_BY_ID[i] for i in (source_ids or []) if i in _BY_ID] or LIVE_SOURCES
    domains = sorted({d for s in chosen for d in s["domains"]})
    n = max(1, min(int(max_results or config.TAVILY_MAX_RESULTS), 10))
    payload = {
        "query": f"{query} Punjab Pakistan government scheme",
        "search_depth": config.TAVILY_SEARCH_DEPTH,
        "topic": "general",
        "max_results": n,
        "include_domains": domains,
        "include_answer": False,
        "include_raw_content": False,
    }
    started = time.perf_counter()
    try:
        res = requests.post(TAVILY_URL, json=payload, timeout=config.TAVILY_TIMEOUT_SECONDS,
                            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    except requests.RequestException as exc:
        raise TavilyError(f"Tavily request failed: {type(exc).__name__}") from exc
    if res.status_code == 401:
        raise TavilyError("Tavily rejected the API key (HTTP 401).")
    if res.status_code == 429:
        raise TavilyError("Tavily rate limit reached (HTTP 429). Try again later.")
    if not res.ok:
        raise TavilyError(f"Tavily API error (HTTP {res.status_code}).")
    data = res.json()

    results, dropped = [], 0
    allowed_ids = {s["id"] for s in chosen}
    for r in data.get("results", []):
        src = _source_for(r.get("url", ""))
        host = (urlparse(r.get("url", "")).hostname or "").lower()
        in_scope = src and (src["id"] in allowed_ids or any(host == d or host.endswith("." + d) for d in domains))
        # Hard guarantee: never pass on a non-official page, even if the API returned one.
        if not in_scope:
            dropped += 1
            continue
        results.append({
            "title": (r.get("title") or "").strip() or r.get("url"),
            "url": r.get("url"),
            "content": (r.get("content") or "").strip()[:1200],
            "score": round(float(r.get("score") or 0), 3),
            "published_date": r.get("published_date"),
            "source_id": src["id"],
            "source_name": src["name"],
            "level": src["level"],
        })
    return {
        "query": query,
        "sources_searched": [{"id": s["id"], "name": s["name"]} for s in chosen],
        "domains": domains,
        "count": len(results),
        "results": results,
        "dropped_non_official": dropped,
        "elapsed_ms": round((time.perf_counter() - started) * 1000),
        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "note": "Live web results from official domains only. They are newer than the RAG snapshots but are not "
                "human-verified rules: never use them to decide eligibility.",
    }
