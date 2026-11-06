# Test results

**Run:** 2026-11-01, Windows, Python 3.11.9, `cd backend && python -m pytest -q`
**Result:** `154 passed in 261.71s`. No failures, no skips.

| Test file | Tests | Covers |
|---|---|---|
| `test_eligibility.py` | 9 | District → province derivation; no identity fields in the profile; Potentially Eligible / Not Eligible (with failing quote) / More Information Needed (only missing fields); conditional rules (urban vs rural plot); schemes without verified rules never pass; status logic (Open / Closed / Upcoming / Suspended / Unverified); CNIC / phone / IBAN / email masking |
| `test_crawler_updates.py` | 5 | Card extraction without navigation; procurement filtered out; scheme discovery; content change → `significant` diff → scheme flagged `needs_reverification` → plain reload keeps the flag → human bump of `last_verified` clears it; robots.txt `Disallow` respected; **unreachable and suspended sites reported**; offline rebuild from snapshots reproduces identical hashes |
| `test_rag.py` | 7 | PDF page numbers kept in chunks; 5 documents embedded; 4 queries retrieve the correct document with URL/title/date; a changed document is re-indexed without duplicates |
| `test_mcp.py` | 6 | **Real stdio MCP server process**: exactly the 7 tools exposed; Roman-Urdu synonyms ("wazifa"); deterministic eligibility with sources and disclaimer; documents / deadline / application process / compare; "Not Officially Confirmed" when data is missing; unknown id → `did_you_mean` |
| `test_agent.py` | 8 | **Matric → university replanning** (plan v1 → v2, eligibility re-run, verdict changes); trace contains memory / understanding / plan / tool calls / links / retrieval / answer; short-term follow-up ("the second one"); long-term memory only with consent, recalled in a new session, deleted on request; **official rule change → replan**; CNIC masked before storage; out-of-scope uses no tools; LLM outage falls back to the rule-based planner |
| `test_api.py` | 4 | FastAPI end to end: scheme list/detail/404; eligibility and compare via MCP; **SSE chat stream** (session → trace events → final); user consent / profile / saved / delete endpoints |
| `test_source_accuracy.py` | 129 | Real `rules.yaml`: 8+ schemes across all 3 categories; **each of the 111 rule quotes and 13 status quotes appears verbatim in its saved official snapshot**; only `gov.pk` / `gop.pk` links; no status or date without an official quote; federal/provincial labels consistent |

## Manual / live checks (same date)

- `python -m app.cli verify-quotes` → **124/124 quotes found** (re-run 2026-11-07 after adding official status evidence) in the stored official sources.
- Live crawl report: punjab_flagship 55 pages (45 stored, 10 skipped as irrelevant), pspa 10, pessi 3,
  pwwf 2, bisp 11 (procurement PDFs skipped), punjab_autonomous_bodies 1. The following sources are
  reported as unavailable: **agri_cm_initiatives** (`ssl_error`), **pbm** (`unreachable`, hosting
  suspended) and **wwf** (`ssl_error`).
- RAG index: 71 documents → **319 chunks**. Sample retrievals: "scholarship for university students" →
  Honhaar Scholarship (0.56); "farmer interest free loan" → CM Kissan Card (0.59); "BISP Taleemi Wazaif
  documents" → Benazir Taleemi Wazaif (0.52).
- Full stack smoke test (uvicorn + Vite proxy): all 8 frontend routes return 200; `/api/health`,
  `/api/stats`, `/api/agent/info` (MCP protocol `2025-11-25`, 7 tools, 319 chunks), `/api/schemes`,
  `/api/updates` and `/api/users/{id}` return 200; `POST /api/chat` streams `session` → 11 `trace` events → `final`.
- Agent latency once warm: 0.3–5.6 s per turn without the LLM (DeepSeek API calls add network time). The first start can
  take 1–3 minutes on a slow disk while PyTorch/transformers load.

## Not covered by automated tests

- Live DeepSeek responses (tests use a scripted fake LLM so they are deterministic and need no key).
- Visual rendering of the React UI (verified by a successful `npm run build` and the route/proxy smoke test).


## Re-run 2026-11-07 (official application status)

`python -m pytest -q` → **169 passed**. New: every status quote is verified against its saved official page, status links must be official domains, Open/Ongoing need an official quote, and an Open scheme closes automatically after its official deadline.
