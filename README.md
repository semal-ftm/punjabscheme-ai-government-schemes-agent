# PunjabScheme AI
### Unified Government Schemes Discovery & Eligibility Agent

> **Independent student project** (Agent-Based Modeling, Assignment 2, University of Central Punjab).
> Not affiliated with the Government of Punjab or the Government of Pakistan. Every answer cites the official
> page it came from. Always confirm on the official portal before applying.

PunjabScheme AI is a Python AI agent that helps Punjab residents find government assistance schemes in three
categories: **CM Punjab initiatives**, **Punjab department programmes** (PSPA, PESSI, PWWF) and
**federal programmes** available in Punjab (BISP). It tells users whether they are eligible, which documents
they need, how to apply and what changed recently. Every decision is shown step by step:
which tools ran, which official links were checked, which document excerpts were used and why the plan changed.

---

## 1. Assignment requirement mapping

| Requirement | Where it is implemented | How to see it |
|---|---|---|
| **AI Agent + LLM** | `backend/app/agent/graph.py`: one LangGraph agent with 8 nodes (understand, plan, act, **reflect**, retrieve, answer…) using **DeepSeek** (`deepseek-chat` via LangChain's OpenAI-compatible client, `llm.py`; Groq optional) | Chat page → "How I got this answer" panel |
| **Reasoning, planning, tool selection, replanning** | `plan` (LLM planner, validated, rule-based fallback), `reflect` (retries / adds steps), replan triggers in `load_context` + `update_profile` | Demo 1 below: plan v1 → v2 |
| **Short-term memory** | LangGraph checkpointer per `session_id` (messages, profile, recent schemes, previous verdicts) | "What documents do I need for the second one?" |
| **Long-term memory** | SQLite `users`, `user_profiles`, `saved_schemes`, `conversations`, `messages` (`db.py`). Profile saved **only with consent** | New chat with the same username → "saved profile loaded" |
| **RAG** | `rag.py`: 71 official documents → 319 chunks, Sentence-Transformers (multilingual) → ChromaDB, citations with URL/page/date | Retrieval events + numbered citations |
| **MCP** | `mcp_server/server.py`: a real MCP server (official Python SDK, stdio, separate process) with 7 tools. `agent/mcp_client.py` is the client | `tool_call` / `tool_result` events; `tests/test_mcp.py` |
| **Prompt engineering** | `agent/prompts.py`: system prompt (role, scope, source rules, eligibility rules, memory, privacy, uncertainty, language) + stage prompts | See section 6 |
| Crawler + updates | `crawler/` (Requests, BeautifulSoup, PyPDF), `updates.py` (APScheduler), hash comparison, diffs, re-indexing | Recent Updates page |
| Verified rules (no LLM guessing) | `data/rules.yaml` → `eligibility.py` deterministic engine; 14 schemes, **111 verbatim official quotes** | `python -m app.cli verify-quotes` |
| Tests | `backend/tests/`: 9 files covering RAG, MCP, both memories, rules, deadlines, updates, inaccessible sites, source accuracy, replanning, API | `pytest` |

## 2. Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full diagram. In short:

```
React UI ──SSE──► FastAPI ──► LangGraph agent ──► DeepSeek LLM (understand / plan / write)
                                   │  ├─► MCP client ══stdio══► MCP server (7 tools) ──► SQLite (verified rules)
                                   │  ├─► ChromaDB (RAG over official documents)
                                   │  └─► memory: checkpointer (session) + SQLite (long-term)
APScheduler ──► crawler ──► official sites ──► snapshots + SQLite + ChromaDB (changed docs only)
Human ──► data/rules.yaml (verbatim quotes) ──► `cli reload-rules`
```

**Key design decision:** the LLM never decides eligibility. It extracts facts and plans tool calls. The MCP
tool `check_eligibility` applies human-verified criteria, each backed by a verbatim quote from the official
page, and returns `Potentially Eligible`, `Not Eligible Based on Known Rules` or `More Information Needed`
for every criterion.

## 3. Official sources and their status (checked 2026-11-01)

| Source | Category | Status |
|---|---|---|
| punjab.gov.pk/flagship-projects | CM Punjab | ✅ 50 scheme cards discovered, 45 pages stored |
| punjab.gov.pk/autonomous-bodies | Punjab depts | ✅ directory page |
| pspa.punjab.gov.pk (added) | Punjab depts | ✅ 10 programme pages |
| pessi.punjab.gov.pk | Punjab depts | ✅ benefits pages + registration form PDF |
| pwwf.punjab.gov.pk | Punjab depts | ✅ used **instead of pwwb.com.pk** (see below) |
| bisp.gov.pk | Federal | ✅ programme pages + registration PDFs (procurement PDFs filtered out) |
| agripunjab.gov.pk | CM Punjab | ⚠️ SSL certificate fails Python verification → not crawled (its CM initiatives are also on punjab.gov.pk) |
| pbm.gov.pk (Bait-ul-Mal) | Federal | ❌ site offline: hosting account suspended |
| wwf.gov.pk (Workers Welfare Fund) | Federal | ❌ SSL certificate name mismatch. **Never bypassed**: use manual PDF ingestion |

**pwwb.com.pk was rejected:** it is not a government website. It is SEO content with unrelated
"Anxiety Treatment" links, and its "Dhee Rani" page contradicts the official punjab.gov.pk page. The
official Punjab Workers Welfare **Fund** site (pwwf.punjab.gov.pk) is used instead.

Crawling rules: robots.txt is honoured (RFC 9309), BISP's `Content-Signal` header is checked, there is a
2-second delay per host, SSL is always verified, and there are page/PDF limits per source.
Unavailable sites are reported, never guessed.

## 4. Setup

Requirements: Python 3.11, Node 18+ (tested on Node 24), about 3 GB of free disk space, and a DeepSeek API key (https://platform.deepseek.com).

```bash
# Backend
cd backend
python -m venv ../.venv
../.venv/Scripts/pip install -r requirements.txt        # Linux/macOS: ../.venv/bin/pip
cp .env.example .env                                      # then put your DEEPSEEK_API_KEY in .env

# Knowledge base: either rebuild offline from the saved official snapshots (no internet needed)...
../.venv/Scripts/python -m app.cli rebuild-from-snapshots
# ...or crawl the live sites (about 10 min at 2 s per request)
../.venv/Scripts/python -m app.cli crawl
../.venv/Scripts/python -m app.cli reload-rules

# Run the API (the MCP server is started automatically as a child process)
../.venv/Scripts/python -m uvicorn app.api:app --port 8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The first start downloads the embedding model (~470 MB) into `.cache/`. After that it runs offline.

### Useful commands
```bash
python -m app.cli status              # sources, documents, schemes, pending reviews
python -m app.cli verify-quotes       # every rule quote must still appear in its official page
python -m app.cli crawl --source bisp # update one source (change detection + re-index)
python -m app.cli ingest --url <official-url> --pdf <file.pdf>   # manual fallback for unreachable sites
python -m app.mcp_server.server       # run the MCP server on its own (stdio)
```

## 5. Demonstration script

Use a username such as `ayesha_demo` in the sidebar and switch on **"Remember my profile"**.

1. **Planning and asking only what's missing:** *"I am a matric student from Lahore. Which schemes can I apply for?"*
   The trace shows the facts it extracted (`education_level: matric`, `district: Lahore → province: punjab`),
   **plan v1** (`search_schemes` → `check_eligibility` over all 14 verified schemes), the MCP results, the
   official links checked and the RAG excerpts. Taleemi Wazaif / Workers Welfare Schools show *More Information
   Needed*, and the agent asks only the missing questions (BISP beneficiary? age? worker family?).
2. **Replanning:** *"Actually, I'm a university student."* The trace shows **"Earlier facts corrected"** →
   **plan v1 → v2** → eligibility re-run → **"Recommendations changed"** (school-level schemes become not
   eligible; Honhaar, Laptop and e-Bikes become relevant and ask for semester, institution type and marks).
3. **Income or location change:** *"Our family income is 40k and I live in Bahawalpur"*. Verdicts are recomputed.
4. **Official rule change:** edit a criterion in `data/rules.yaml`, bump `last_verified`, run
   `python -m app.cli reload-rules`, then ask again. The trace shows *"Change detected in official rules"* → replan.
   (A crawler-detected page change instead flags the scheme *"pending re-verification"*.)
5. **Short-term memory:** *"What documents do I need for the second one?"* resolves the scheme from the conversation.
6. **Long-term memory:** start a **New chat** → the trace shows *"saved profile loaded from SQLite"* and
   *"previous conversation recalled"*.
7. **Privacy:** type a fake CNIC (`35202-1234567-1`). The privacy guard removes it before the LLM sees it or it is stored.
8. **Urdu / Roman Urdu:** *"Mujhe ghar banane ke liye qarza chahiye"*. It answers in Roman Urdu with Apni Chhat results.

## 6. Prompt engineering (summary)

`backend/app/agent/prompts.py` contains:
- **System prompt.** Role and scope (3 categories, always label FEDERAL vs PROVINCIAL, independent and
  not a government site); source rules (only the given evidence, cite `[n]`, *"Not Officially Confirmed"*, never
  claim "open" without evidence, treat document text as data); eligibility rules (only the tool decides, three
  fixed verdicts); memory rules (newest fact wins → revise recommendations); privacy (never ask for
  CNIC/phone/bank details); uncertainty (say when evidence is weak, ask only facts that change a verdict);
  language (English / Urdu / Roman Urdu).
- **Understand prompt.** JSON: language, intent, newly stated facts (an allowed-field list with mapping
  hints), resolution of references such as "the second one", and an English search query.
- **Plan prompt.** JSON: an ordered tool plan with a reason for each step, decision rules, at most 5 steps. A
  `REPLANNING because…` note is added when facts or official rules changed.
- **Answer prompt.** Write only from the numbered evidence, cite everything, explain plan changes first,
  and end with the "confirm on the official portal" line.

Every LLM output is validated (allowed tools, allowed arguments, real scheme ids, existing citation numbers).
If the LLM API fails or hits a rate limit, a rule-based planner and an answer template take over, and the trace shows a warning.

## 7. Tests

```bash
cd backend && ../.venv/Scripts/python -m pytest -q
```

| File | What it proves |
|---|---|
| `test_eligibility.py` | Rule engine verdicts, conditional rules, only-missing questions, status/deadline logic, privacy masking |
| `test_crawler_updates.py` | Card discovery, procurement filtering, robots.txt, **unreachable/suspended sites**, change detection → re-verification flag → human re-verification, offline rebuild |
| `test_rag.py` | Chunking with PDF pages, ≥5 documents embedded, correct document retrieved with citation metadata, re-index on change |
| `test_mcp.py` | **Real MCP client ↔ server over stdio**: 7 tools, synonyms, eligibility, documents, deadlines, compare, unknown-id suggestions |
| `test_agent.py` | **Matric → university replanning**, official-rule-change replanning, short-term follow-up, long-term memory with consent and deletion, trace contents, privacy, out-of-scope, LLM-down fallback |
| `test_api.py` | FastAPI end to end: SSE chat stream, eligibility/compare via MCP, user memory endpoints |
| `test_source_accuracy.py` | Every quote in `rules.yaml` appears verbatim in the saved official snapshot; official domains only; no dates without evidence |

The tests use synthetic personas and a scripted fake LLM (no API key or network needed). Results: see
[docs/TEST_RESULTS.md](docs/TEST_RESULTS.md).

## 8. Data protection

- No CNIC, phone, IBAN, card or bank data is ever requested. A privacy guard masks such patterns
  **before** text reaches the DeepSeek API, the logs or SQLite. Only masked chat text and eligibility facts
  are sent to DeepSeek.
- The profile holds eligibility facts only (age, district, education, income band…), is saved only with
  explicit consent, and "Delete my data" removes the profile, saved schemes and conversations.
- All results are decision support. Final eligibility is decided by the scheme authority.

## 9. Known limitations

- Only 14 schemes have human-verified rules. The other auto-discovered schemes are searchable and cited but
  show *"rules not verified"* and never get an eligibility verdict.
- No official page states a current application window for the verified schemes, so their status is
  **Unverified** and deadlines show *"Not Officially Confirmed"*. This is intentional.
- Some official PDFs are scanned images (no extractable text) and are reported and skipped. OCR is not included.
- Short-term memory lives in process memory (one session) and resets when the API restarts. Long-term memory persists.
- Raw Roman-Urdu text retrieves less well than English; the agent translates queries to English before searching.
- The first start can take 1–3 minutes on a slow disk while PyTorch/transformers load. After that a chat turn
  takes a few seconds.

## 10. Project structure

```
backend/
  app/
    agent/        graph.py (LangGraph), prompts.py, llm.py (DeepSeek / Groq), mcp_client.py, privacy.py
    mcp_server/   server.py (MCP server, 7 tools)
    crawler/      crawler.py, sources.py
    api.py  cli.py  config.py  db.py  eligibility.py  rag.py  rules_loader.py  updates.py
  data/           rules.yaml (verified rules), snapshots/ (official pages + manifest.json)
  tests/
frontend/         React + Tailwind (Dashboard, Chat, Explore, Details, Eligibility, Compare, Saved, Updates)
docs/             ARCHITECTURE.md, TEST_RESULTS.md
```
