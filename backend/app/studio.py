"""Agent Studio runtime settings: feature toggles and prompt overrides, edited from the web UI.

Stored as a small JSON file (data/studio_settings.json) so changes survive restarts and are visible to
every component that reads them (the agent graph reads them at the start of each node).
"""
from __future__ import annotations

import json
import threading
from typing import Any

from app import config

DEFAULT_SETTINGS: dict[str, Any] = {
    "tavily_enabled": True,        # live official-web search via Tavily (needs TAVILY_API_KEY)
    "tavily_auto": True,           # agent adds a live search when RAG evidence is weak or news is asked for
    "tavily_max_results": 4,
    "rag_top_k": 5,
    "rag_min_score": 0.2,
    "prompt_overrides": {},        # {"SYSTEM_PROMPT": "...", ...}
}

_lock = threading.Lock()
_cache: dict[str, Any] | None = None
_mtime: float | None = None


def _read() -> dict[str, Any]:
    global _cache, _mtime
    path = config.STUDIO_SETTINGS_PATH
    try:
        mtime = path.stat().st_mtime
    except FileNotFoundError:
        return dict(DEFAULT_SETTINGS, prompt_overrides={})
    if _cache is not None and mtime == _mtime:
        return _cache
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        data = {}
    merged = {**DEFAULT_SETTINGS, **{k: v for k, v in data.items() if k in DEFAULT_SETTINGS}}
    merged["prompt_overrides"] = dict(merged.get("prompt_overrides") or {})
    _cache, _mtime = merged, mtime
    return merged


def get_settings() -> dict[str, Any]:
    with _lock:
        s = _read()
        return {**s, "prompt_overrides": dict(s["prompt_overrides"])}


def update_settings(changes: dict[str, Any]) -> dict[str, Any]:
    with _lock:
        current = _read()
        new = {**current}
        for k, v in changes.items():
            if k in DEFAULT_SETTINGS and k != "prompt_overrides":
                new[k] = v
        if "prompt_overrides" in changes:
            new["prompt_overrides"] = changes["prompt_overrides"]
        config.STUDIO_SETTINGS_PATH.write_text(json.dumps(new, ensure_ascii=False, indent=2), encoding="utf-8")
        global _cache, _mtime
        _cache, _mtime = None, None
    return get_settings()


def get(key: str) -> Any:
    return get_settings().get(key, DEFAULT_SETTINGS.get(key))


def live_search_active() -> bool:
    from app import tavily
    return bool(get("tavily_enabled")) and tavily.is_configured()
