import { useState } from "react";
import {
  BookOpenText, Brain, Cpu, Database, FileSearch, Globe2, HardDrive, Laptop, ListChecks, MessageSquareText, Plug, RefreshCcw,
  Scale, ScrollText, Server, ShieldCheck, Timer, User, UserCog, Wrench,
} from "lucide-react";

/*
 * Interactive system architecture. Every box is a real part of the code base; clicking it explains what it
 * does and which file implements it. Coordinates are in a 1000 x 610 design space.
 */

export const PARTS = {
  user: {
    title: "You", icon: User, color: "#0ea5e9", file: "—",
    text: "You type a question in English, Urdu or Roman Urdu, or fill the eligibility form. A pseudonymous username is enough; no real name is needed.",
  },
  ui: {
    title: "React web app", icon: Laptop, color: "#6366f1", file: "frontend/src",
    text: "Dashboard, AI Chat, Explore, Eligibility, Compare, Saved and Updates pages. The chat shows every agent step live in the “How I got this answer” panel.",
  },
  api: {
    title: "FastAPI server", icon: Server, color: "#14b8a6", file: "backend/app/api.py",
    text: "Receives the question and streams each agent step back with Server-Sent Events, so you can watch the agent think. Also serves schemes, eligibility, compare and user endpoints.",
  },
  privacy: {
    title: "Privacy guard", icon: ShieldCheck, color: "#e11d48", file: "backend/app/agent/privacy.py",
    text: "Before anything reaches the LLM, the logs or the database, CNIC, phone, IBAN, card and bank numbers and e-mails are replaced, e.g. 35202-1234567-1 → [CNIC REMOVED].",
  },
  load_context: {
    title: "1 · Load memory", icon: Database, color: "#f59e0b", file: "graph.py · load_context",
    text: "Loads this conversation (short-term memory) and, if you gave consent, your saved profile and past conversations from SQLite (long-term memory). Detects if official rules changed since your last visit.",
  },
  understand: {
    title: "2 · Understand", icon: Brain, color: "#8b5cf6", file: "graph.py · understand + prompts.py",
    text: "The LLM reads your message and returns JSON: language, intent, new facts (age, district, education…), and references like “the second one” resolved to a real scheme.",
  },
  update_profile: {
    title: "3 · Update facts", icon: UserCog, color: "#ec4899", file: "graph.py · update_profile",
    text: "Merges the new facts into your profile. The newest fact wins: if you correct yourself (“actually I'm a university student”) the old plan is marked outdated and the agent replans.",
  },
  plan: {
    title: "4 · Plan", icon: ListChecks, color: "#22c55e", file: "graph.py · plan",
    text: "The LLM writes an ordered tool plan with a reason for each step (max 5). Every step is validated: only real tools, allowed arguments and existing scheme ids. If the LLM is down, a rule-based planner takes over.",
  },
  act: {
    title: "5 · Call MCP tools", icon: Wrench, color: "#10b981", file: "graph.py · act + mcp_client.py",
    text: "Runs the plan by calling tools on the MCP server through a real MCP client session (stdio, separate process). Each call and result appears in the trace.",
  },
  reflect: {
    title: "6 · Reflect", icon: RefreshCcw, color: "#06b6d4", file: "graph.py · reflect",
    text: "Checks the evidence: wrong scheme id, no results or missing eligibility? It adds or retries steps and loops back to “Call MCP tools”. Otherwise it continues.",
  },
  retrieve: {
    title: "7 · Retrieve (RAG)", icon: FileSearch, color: "#3b82f6", file: "graph.py · retrieve + rag.py",
    text: "Searches the official documents in ChromaDB for the top 5 matching excerpts (with URL, page and date) to ground the answer.",
  },
  answer: {
    title: "8 · Answer + cite", icon: MessageSquareText, color: "#f97316", file: "graph.py · answer + prompts.py",
    text: "The LLM writes the answer only from the numbered evidence and cites it like [1][2]. Citations are validated; “Not Officially Confirmed” is written when evidence is missing.",
  },
  stm: {
    title: "Short-term memory", icon: Timer, color: "#f59e0b", file: "LangGraph checkpointer",
    text: "Keeps the messages, profile, recent schemes and previous verdicts of this chat session, so follow-ups like “documents for the second one?” work.",
  },
  ltm: {
    title: "Long-term memory", icon: HardDrive, color: "#d97706", file: "backend/app/db.py (SQLite)",
    text: "Your eligibility facts, saved schemes and conversations, stored only if you switch on “Remember my profile”. “Delete my data” removes everything.",
  },
  llm: {
    title: "DeepSeek LLM", icon: Cpu, color: "#8b5cf6", file: "backend/app/agent/llm.py",
    text: "deepseek-chat through LangChain. Used to understand, plan and write. It never decides eligibility. Groq is an optional alternative provider.",
  },
  mcp: {
    title: "MCP server · 7 tools", label: "MCP server", icon: Plug, color: "#10b981", file: "backend/app/mcp_server/server.py",
    text: "search_schemes, check_eligibility, get_required_documents, get_scheme_deadline, get_application_process, compare_schemes, check_latest_updates. Official Python MCP SDK over stdio.",
  },
  rules: {
    title: "Verified rules (SQLite)", icon: Scale, color: "#059669", file: "backend/data/rules.yaml → rules_loader.py",
    text: "14 schemes whose eligibility criteria, benefits, documents, steps and application status are copied word for word from official pages: 124 quotes, each checked against the saved page.",
  },
  engine: {
    title: "Rule engine", icon: ShieldCheck, color: "#047857", file: "backend/app/eligibility.py",
    text: "Deterministic: every criterion is pass / fail / unknown / manual. Verdicts: Potentially Eligible, Not Eligible Based on Known Rules, More Information Needed — with the official quote behind each.",
  },
  chroma: {
    title: "ChromaDB (RAG index)", icon: BookOpenText, color: "#2563eb", file: "backend/app/rag.py",
    text: "Official pages and PDFs split into 900-character chunks (150 overlap), embedded with a multilingual Sentence-Transformers model so Urdu and Roman Urdu also match.",
  },
  sites: {
    title: "Official .gov.pk sites", icon: Globe2, color: "#0f766e", file: "crawler/sources.py",
    text: "punjab.gov.pk, PSPA, PESSI, PWWF, BISP and scheme portals. Unofficial sites are rejected; unreachable sites are reported, never guessed.",
  },
  crawler: {
    title: "Crawler + scheduler", icon: RefreshCcw, color: "#0d9488", file: "crawler/crawler.py + updates.py",
    text: "Requests + BeautifulSoup + PyPDF. Honours robots.txt, waits 2 s per request, verifies SSL, and re-checks sources every 24 h with APScheduler.",
  },
  snapshots: {
    title: "Snapshots + change detection", label: "Snapshots + changes", icon: ScrollText, color: "#0891b2", file: "data/snapshots",
    text: "Every fetched page is saved. A content hash detects changes; changed documents are re-embedded, and a scheme whose source changed is flagged “pending re-verification”.",
  },
  human: {
    title: "Human verification", icon: UserCog, color: "#a16207", file: "python -m app.cli reload-rules",
    text: "A person copies rules and status sentences from official pages into rules.yaml. verify-quotes and the tests prove every quote still appears in the official snapshot.",
  },
};

const BOXES = [
  ["user", 20, 24, 170, 62], ["ui", 230, 24, 170, 62], ["api", 440, 24, 170, 62], ["privacy", 650, 24, 170, 62],
  ["stm", 20, 160, 170, 70], ["ltm", 20, 262, 170, 70],
  ["llm", 830, 160, 150, 70], ["mcp", 830, 262, 150, 70],
  ["chroma", 290, 410, 200, 64], ["rules", 560, 410, 200, 64], ["engine", 800, 410, 180, 64],
  ["sites", 20, 530, 180, 60], ["crawler", 240, 530, 200, 60], ["snapshots", 480, 530, 220, 60], ["human", 740, 530, 240, 60],
];

// The eight agent steps, snaking: top row left→right, bottom row right→left.
const STEPS = [
  ["load_context", 248, 172], ["understand", 380, 172], ["update_profile", 512, 172], ["plan", 644, 172],
  ["act", 644, 272], ["reflect", 512, 272], ["retrieve", 380, 272], ["answer", 248, 272],
];
const SW = 118;
const SH = 50;

const FLOW = "M105 86 V104 H315 V86 M400 55 H440 M610 55 H650 M735 86 V130 H307 V172 " +
  "M366 197 H380 M498 197 H512 M630 197 H644 M703 222 V272 M644 297 H630 M512 297 H498 M380 297 H366 M248 297 H215 V55 H230";

function Box({ id, x, y, w, h, active, onSelect, compact = false }) {
  const p = PARTS[id];
  const Icon = p.icon;
  return (
    <g role="button" tabIndex={0} aria-label={p.title} onClick={() => onSelect(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(id)} className="cursor-pointer outline-none">
      <rect x={x} y={y} width={w} height={h} rx="14" fill={active ? p.color : "#ffffff"} stroke={p.color}
        strokeWidth={active ? 0 : 1.6} className="transition-all duration-300" filter="url(#hw-shadow)" />
      <rect x={x + (compact ? 7 : 10)} y={y + h / 2 - (compact ? 12 : 15)} width={compact ? 24 : 30} height={compact ? 24 : 30} rx="8"
        fill={active ? "rgba(255,255,255,0.25)" : p.color} />
      <Icon x={x + (compact ? 11 : 16)} y={y + h / 2 - (compact ? 8 : 9)} width={compact ? 16 : 18} height={compact ? 16 : 18} color="#fff" strokeWidth={2} />
      <text x={x + (compact ? 36 : 48)} y={y + h / 2 + 4} fontSize={compact ? 11 : 12} fontWeight="700" fill={active ? "#fff" : "#141d36"}>
        {p.label || p.title.replace(/^\d · /, "")}
      </text>
    </g>
  );
}

export default function ArchitectureDiagram() {
  const [sel, setSel] = useState("plan");
  const p = PARTS[sel];
  const Icon = p.icon;
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-3xl bg-white p-3 shadow-card ring-1 ring-slate-200/70 scroll-thin">
        <svg viewBox="0 0 1000 610" className="block w-full min-w-[760px]" role="group" aria-label="System architecture diagram">
          <defs>
            <filter id="hw-shadow" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#141d36" floodOpacity="0.10" />
            </filter>
            <marker id="hw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8" />
            </marker>
            <linearGradient id="hw-agent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0fdf4" />
              <stop offset="1" stopColor="#eff6ff" />
            </linearGradient>
          </defs>

          {/* lane labels */}
          {[["INTERFACE", 14], ["AGENT + MEMORY + MODELS", 150], ["KNOWLEDGE & RULES", 400], ["DATA PIPELINE", 520]].map(([t, y]) => (
            <text key={t} x="992" y={y} textAnchor="end" fontSize="9" fontWeight="700" letterSpacing="2" fill="#94a3b8">{t}</text>
          ))}

          {/* agent container */}
          <rect x="230" y="128" width="550" height="222" rx="22" fill="url(#hw-agent)" stroke="#86efac" strokeDasharray="6 5" />
          <text x="250" y="152" fontSize="12" fontWeight="800" fill="#047857">LangGraph agent · one primary agent · graph.py</text>
          <path d="M571 322 C571 346 703 346 703 326" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeDasharray="4 4" markerEnd="url(#hw-arrow)" />
          <text x="637" y="345" textAnchor="middle" fontSize="9.5" fill="#0e7490" fontWeight="700">retry if evidence incomplete</text>

          {/* connectors */}
          <g fill="none" stroke="#94a3b8" strokeWidth="1.6" markerEnd="url(#hw-arrow)">
            <path d="M190 195 H248" /><path d="M190 297 H215" />
            <path d="M780 195 H830" /><path d="M780 297 H830" />
            <path d="M905 332 V370 H660 V410" /><path d="M760 442 H800" />
            <path d="M439 322 V410" />
            <path d="M200 560 H240" /><path d="M440 560 H480" /><path d="M590 530 V474" /><path d="M590 530 H390 V474" />
            <path d="M860 530 V505 H700 V474" />
          </g>
          <text x="786" y="188" fontSize="9" fill="#64748b">LLM</text>
          <text x="786" y="290" fontSize="9" fill="#64748b">MCP</text>

          {/* main question flow with travelling pulses */}
          <path id="hw-flow" d={FLOW} fill="none" stroke="#10b981" strokeOpacity="0.35" strokeWidth="2" />
          {[0, 1.6, 3.2].map((b) => (
            <circle key={b} r="4.5" fill="#10b981">
              <animateMotion dur="4.8s" begin={`${b}s`} repeatCount="indefinite"><mpath href="#hw-flow" /></animateMotion>
            </circle>
          ))}

          {BOXES.map(([id, x, y, w, h]) => <Box key={id} id={id} x={x} y={y} w={w} h={h} active={sel === id} onSelect={setSel} />)}
          {STEPS.map(([id, x, y]) => <Box key={id} id={id} x={x} y={y} w={SW} h={SH} active={sel === id} onSelect={setSel} compact />)}
        </svg>
        <p className="px-2 pb-1 text-center text-xs text-slate-500">Click any box to see what it does. Green dots show a question travelling through the system.</p>
      </div>

      <aside className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lift" style={{ background: `linear-gradient(150deg, ${p.color}, #141d36 85%)` }} aria-live="polite">
        <div className="phulkari absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl font-extrabold">{p.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/90">{p.text}</p>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Implemented in</p>
            <code className="mt-1 inline-block rounded-lg bg-black/25 px-2.5 py-1 text-xs text-white">{p.file}</code>
          </div>
        </div>
      </aside>
    </div>
  );
}
