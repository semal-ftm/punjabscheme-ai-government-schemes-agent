"""Scheduled update checks (APScheduler): re-crawl, hash-compare, re-index, flag rule re-verification."""
from __future__ import annotations

import logging
import threading
from dataclasses import asdict

from apscheduler.schedulers.background import BackgroundScheduler

from app import config, db, rag
from app.crawler.crawler import run_crawl

log = logging.getLogger(__name__)
_lock = threading.Lock()
_scheduler: BackgroundScheduler | None = None
last_run: dict | None = None


def run_update_check(source_ids: list[str] | None = None) -> dict:
    """One full update cycle. Safe to call from the scheduler, the API or the CLI."""
    global last_run
    if not _lock.acquire(blocking=False):
        return {"status": "already_running"}
    try:
        started = db.now_iso()
        reports = run_crawl(source_ids)
        with db.session() as conn:
            index_stats = rag.sync_index(conn)
            pending = conn.execute(
                "SELECT COUNT(*) FROM change_events WHERE review_status = 'pending_review'").fetchone()[0]
        last_run = {
            "status": "completed", "started_at": started, "finished_at": db.now_iso(),
            "sources": [asdict(r) for r in reports], "index": index_stats, "pending_review": pending,
        }
        return last_run
    finally:
        _lock.release()


def start_scheduler() -> BackgroundScheduler | None:
    global _scheduler
    if not config.ENABLE_SCHEDULER or _scheduler:
        return _scheduler
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(run_update_check, "interval", hours=config.UPDATE_INTERVAL_HOURS, id="official-source-check",
                       max_instances=1, coalesce=True)
    _scheduler.start()
    log.info("Update checks scheduled every %s hours", config.UPDATE_INTERVAL_HOURS)
    return _scheduler


def next_run_time() -> str | None:
    job = _scheduler.get_job("official-source-check") if _scheduler else None
    return job.next_run_time.isoformat() if job and job.next_run_time else None
