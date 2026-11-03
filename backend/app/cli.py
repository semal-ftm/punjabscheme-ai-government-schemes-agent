"""Command line for the human-in-the-loop operations.

    python -m app.cli crawl [--source bisp ...]   crawl official sources, detect changes, re-index
    python -m app.cli reload-rules                 load data/rules.yaml (your verified rules) into SQLite
    python -m app.cli verify-quotes                check every rule quote still appears in its official source
    python -m app.cli index                        (re)embed changed documents into ChromaDB
    python -m app.cli ingest --url URL [--pdf FILE] [--title T] [--source ID]   manual fallback
    python -m app.cli status                       sources, documents, schemes, pending reviews
    python -m app.cli rebuild-from-snapshots       offline: rebuild the corpus from saved snapshots, then index
"""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from app import db


def cmd_crawl(args) -> None:
    from app.updates import run_update_check
    print(json.dumps(run_update_check(args.source or None), indent=2, ensure_ascii=False))


def cmd_reload(_args) -> None:
    from app import rag, rules_loader
    with db.session() as conn:
        n = rules_loader.load_into_db(conn)
        stats = rag.sync_index(conn)
    print(f"Loaded {n} verified schemes. Index: {stats}")


def cmd_verify(_args) -> None:
    from app import rules_loader
    with db.session() as conn:
        report = rules_loader.verify_quotes(conn, rules_loader.load_rules_file())
    bad = [r for r in report if r["status"] != "found"]
    print(f"{len(report) - len(bad)}/{len(report)} quotes found verbatim in stored official sources.")
    for r in bad:
        print(f"  [{r['status']}] {r['scheme_id']} ({r['kind']}): {r['quote'][:90]}  <- {r['source_url']}")


def cmd_index(_args) -> None:
    from app import rag
    with db.session() as conn:
        print(rag.sync_index(conn))


def cmd_ingest(args) -> None:
    from app import rag
    from app.crawler.crawler import ingest_manual
    data = Path(args.pdf).read_bytes() if args.pdf else None
    outcome = ingest_manual(url=args.url, title=args.title or "", data=data, source_id=args.source)
    with db.session() as conn:
        stats = rag.sync_index(conn)
    print(f"Ingest result: {outcome}. Index: {stats}")


def cmd_rebuild(_args) -> None:
    from app import rag, rules_loader
    from app.crawler.crawler import rebuild_from_snapshots
    n = rebuild_from_snapshots()
    with db.session() as conn:
        rules_loader.load_into_db(conn)
        stats = rag.sync_index(conn)
    print(f"Rebuilt {n} documents from snapshots. Index: {stats}")


def cmd_status(_args) -> None:
    with db.session() as conn:
        for r in conn.execute("SELECT id, status, pages_fetched, last_error FROM sources"):
            print(f"{r['id']:26} {r['status']:16} pages={r['pages_fetched']:<3} {(r['last_error'] or '')[:80]}")
        print("documents:", conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0])
        for r in conn.execute("SELECT origin, rules_status, COUNT(*) n FROM schemes GROUP BY 1, 2"):
            print(f"schemes {r['origin']}/{r['rules_status']}: {r['n']}")
        print("pending reviews:",
              conn.execute("SELECT COUNT(*) FROM change_events WHERE review_status='pending_review'").fetchone()[0])


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db.init_db()
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("crawl")
    p.add_argument("--source", action="append")
    p.set_defaults(fn=cmd_crawl)
    sub.add_parser("reload-rules").set_defaults(fn=cmd_reload)
    sub.add_parser("verify-quotes").set_defaults(fn=cmd_verify)
    sub.add_parser("index").set_defaults(fn=cmd_index)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    sub.add_parser("rebuild-from-snapshots").set_defaults(fn=cmd_rebuild)
    p = sub.add_parser("ingest")
    p.add_argument("--url", required=True, help="Official URL (also used as the citation for an uploaded PDF)")
    p.add_argument("--pdf", help="Local PDF downloaded from the official URL")
    p.add_argument("--title")
    p.add_argument("--source", help="Source id from app/crawler/sources.py")
    p.set_defaults(fn=cmd_ingest)
    args = parser.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
