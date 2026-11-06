import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, BookOpenText, CheckCircle2, Database, FileText, Fingerprint, GitBranch, Globe2, HardDrive,
  Layers, Lock, MessagesSquare, Quote, RefreshCcw, ScrollText, Scissors, Search, ShieldCheck, Sparkles, Timer, Workflow,
} from "lucide-react";
import ArchitectureDiagram, { PARTS } from "../components/howitworks/ArchitectureDiagram.jsx";
import AgentPulse from "../components/dashboard/AgentPulse.jsx";
import { PunjabSkyline } from "../components/art/SchemeArt.jsx";

/* ------------------------------------------------------------------ principles */
const PRINCIPLES = [
  { icon: ShieldCheck, title: "The AI never decides eligibility", text: "A deterministic rule engine applies human-verified official criteria." },
  { icon: Quote, title: "Every answer is cited", text: "Answers come only from numbered official evidence, cited like [1][2]." },
  { icon: CheckCircle2, title: "No status without proof", text: "Open / Ongoing / Closed only with a verbatim official sentence." },
  { icon: Lock, title: "Privacy first", text: "CNIC, phone and bank numbers are masked before the AI sees them." },
];

/* ------------------------------------------------------------------ one question, eight steps */
const JOURNEY = [
  {
    id: "load_context", what: "Remembers you",
    chips: ["Session: earlier messages loaded", "Saved profile (with consent)", "Rules changed since last visit? checked"],
  },
  {
    id: "understand", what: "Reads your message",
    bubble: "I am a matric student from Lahore. Which schemes can I apply for?",
    chips: ["intent: discover", "education_level: matric", "district: Lahore → province: punjab"],
  },
  {
    id: "update_profile", what: "Updates the facts",
    chips: ["+ education: matric", "+ district: Lahore", "Later: “actually university” → replan"],
  },
  {
    id: "plan", what: "Makes a plan",
    chips: ["Plan v1", "① search_schemes(“student”)", "② check_eligibility(all 14)"],
  },
  {
    id: "act", what: "Calls MCP tools",
    chips: ["MCP → search_schemes ✓", "MCP → check_eligibility ✓", "Official links collected"],
  },
  {
    id: "reflect", what: "Checks its work",
    chips: ["Evidence complete?", "Wrong id → retry", "Missing facts → ask only those"],
  },
  {
    id: "retrieve", what: "Finds official text",
    chips: ["Top-5 excerpts from ChromaDB", "With URL, page and date", "Urdu & Roman Urdu understood"],
  },
  {
    id: "answer", what: "Answers with citations",
    bubble: "You may be eligible for Taleemi Wazaif [1]. Are you from a BISP family? [2]",
    chips: ["Only from evidence", "Citations validated", "“Confirm on the official portal”"],
  },
];

function StepArt({ step, n }) {
  const p = PARTS[step.id];
  const Icon = p.icon;
  return (
    <div className="relative isolate h-44 overflow-hidden rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${p.color}, #141d36)` }}>
      <div className="phulkari absolute inset-0 -z-10 opacity-40" aria-hidden />
      <Icon className="absolute -bottom-6 -right-6 -z-10 h-32 w-32 text-white/10" aria-hidden />
      <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-extrabold ring-1 ring-white/30">{n}</span>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      {step.bubble && (
        <p className="mt-2 max-w-[92%] rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[11px] font-medium leading-snug text-navy-900 shadow">
          {step.bubble}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {step.chips.slice(0, step.bubble ? 2 : 3).map((c) => (
          <span key={c} className="rounded-full bg-black/25 px-2 py-0.5 font-mono text-[10px] text-white ring-1 ring-white/20 backdrop-blur">{c}</span>
        ))}
      </div>
    </div>
  );
}

function Journey() {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {JOURNEY.map((step, i) => {
        const p = PARTS[step.id];
        return (
          <li key={step.id} className="group flex animate-fade-up flex-col rounded-3xl bg-white p-3 shadow-card ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-lift" style={{ animationDelay: `${i * 60}ms` }}>
            <StepArt step={step} n={i + 1} />
            <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: p.color }}>{step.what}</p>
              <h3 className="font-display text-base font-bold text-navy-900">{p.title.replace(/^\d · /, "")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.text}</p>
              <code className="mt-auto pt-3 text-[11px] text-slate-400">{p.file}</code>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ building blocks with pictures */
function Pipe({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(([Icon, label], i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 shadow-sm ring-1 ring-slate-200">
            <Icon className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> {label}
          </span>
          {i < items.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
        </span>
      ))}
    </div>
  );
}

function Block({ icon: Icon, color, kicker, title, children, wide }) {
  return (
    <article className={`flex flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-200/70 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow" style={{ background: `linear-gradient(135deg, ${color}, #141d36)` }}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{kicker}</p>
          <h3 className="font-display text-lg font-bold text-navy-900">{title}</h3>
        </div>
      </div>
      <div className="mt-4 flex-1 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </article>
  );
}

function BuildingBlocks() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Block icon={BookOpenText} color="#2563eb" kicker="RAG · rag.py" title="Grounded in official documents" wide>
        <p>Official pages and PDFs become a searchable knowledge base. At question time the 5 closest excerpts are retrieved and shown with their source.</p>
        <div className="rounded-2xl bg-slate-50 p-4">
          <Pipe items={[[Globe2, "Official page / PDF"], [FileText, "Extract text"], [Scissors, "Chunks 900 chars (150 overlap)"], [Sparkles, "Multilingual embeddings"], [Database, "ChromaDB"], [Search, "Top-5 excerpts + citation"]]} />
        </div>
      </Block>

      <Block icon={HardDrive} color="#d97706" kicker="Memory" title="Short-term and long-term memory">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="flex items-center gap-1.5 font-semibold text-amber-900"><Timer className="h-4 w-4" aria-hidden /> This chat</p>
            <p className="mt-1 text-xs text-amber-900/80">LangGraph checkpointer: messages, facts, recent schemes, last verdicts. Makes “the second one” work.</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-200">
            <p className="flex items-center gap-1.5 font-semibold text-orange-900"><Database className="h-4 w-4" aria-hidden /> Next visit</p>
            <p className="mt-1 text-xs text-orange-900/80">SQLite profile, saved schemes, past chats. Only with consent; “Delete my data” erases it.</p>
          </div>
        </div>
      </Block>

      <Block icon={ShieldCheck} color="#047857" kicker="Rule engine · eligibility.py" title="Eligibility without guessing">
        <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Example criterion</p>
          <p className="mt-1 font-semibold text-navy-900">Family monthly income below Rs 300,000</p>
          <blockquote className="mt-1 border-l-2 border-emerald-400 pl-2 text-xs italic text-slate-700">“Family monthly income should be less than Rs 300,000”</blockquote>
          <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">PASS</span>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-white">FAIL</span>
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-white">UNKNOWN → ask</span>
            <span className="rounded-full bg-slate-500 px-2 py-0.5 text-white">MANUAL</span>
          </p>
        </div>
      </Block>

      <Block icon={RefreshCcw} color="#0d9488" kicker="Updates · crawler.py + updates.py" title="Stays up to date, safely">
        <div className="rounded-2xl bg-slate-50 p-4">
          <Pipe items={[[Timer, "Every 24 h"], [Globe2, "Fetch (robots.txt, 2 s)"], [Fingerprint, "Hash compare"], [GitBranch, "Diff"], [ScrollText, "Flag for re-check"]]} />
        </div>
        <p>A changed official page never silently changes an answer: the scheme is marked “pending re-verification” until a person confirms it.</p>
      </Block>

      <Block icon={Lock} color="#e11d48" kicker="Privacy · privacy.py" title="Sensitive numbers never reach the AI">
        <div className="space-y-2 rounded-2xl bg-rose-50 p-4 font-mono text-xs ring-1 ring-rose-200">
          <p className="text-slate-500">You type</p>
          <p className="text-navy-900">my CNIC is 35202-1234567-1</p>
          <ArrowDown className="h-4 w-4 text-rose-500" aria-hidden />
          <p className="text-slate-500">The AI receives</p>
          <p className="font-bold text-rose-700">my CNIC is [CNIC REMOVED]</p>
        </div>
      </Block>
    </div>
  );
}

const STACK = [
  ["Agent", "LangGraph"], ["LLM", "DeepSeek (Groq optional)"], ["Tools", "Model Context Protocol"], ["Vector DB", "ChromaDB"],
  ["Embeddings", "Sentence-Transformers"], ["Database", "SQLite"], ["API", "FastAPI + SSE"], ["Crawler", "Requests · BeautifulSoup · PyPDF"],
  ["Scheduler", "APScheduler"], ["Frontend", "React + Tailwind"], ["Tests", "pytest · 169 passing"],
];

function SectionHead({ kicker, title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{kicker}</p>
      <h2 className="text-2xl font-extrabold tracking-tight text-navy-900">{title}</h2>
      {children && <p className="mt-1 max-w-3xl text-sm text-slate-500">{children}</p>}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="space-y-14 pb-6">
      {/* hero */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-950 via-navy-900 to-[#123b4a] px-6 py-8 text-white shadow-lift sm:px-10 sm:py-10">
        <div className="phulkari absolute inset-0 -z-10 opacity-40" aria-hidden />
        <PunjabSkyline className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full text-white/[0.06]" />
        <div className="absolute -right-16 -top-20 -z-10 h-72 w-72 animate-blob rounded-full bg-emerald-500/25 blur-3xl" aria-hidden />
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-200 ring-1 ring-white/15">
          <Workflow className="h-3.5 w-3.5" aria-hidden /> How this project works
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          One AI agent,{" "}
          <span className="bg-gradient-to-r from-gold-200 via-gold-300 to-emerald-300 bg-clip-text text-transparent">eight careful steps</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-navy-200 sm:text-base">
          From your question to a cited answer: memory, planning, MCP tools, a rule engine and retrieval over official documents.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass rounded-2xl p-4">
              <Icon className="h-5 w-5 text-gold-300" aria-hidden />
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-navy-200">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="arch-h">
        <SectionHead kicker="Architecture" title="The whole system on one page">
          Four layers: the interface, the agent with its memory and models, the knowledge &amp; verified rules, and the data
          pipeline that keeps everything fresh. Click a part to learn what it does.
        </SectionHead>
        <h2 id="arch-h" className="sr-only">Architecture diagram</h2>
        <ArchitectureDiagram />
      </section>

      <section aria-labelledby="journey-h">
        <SectionHead kicker="Follow one question" title="What happens after you press Send">
          Example: “I am a matric student from Lahore. Which schemes can I apply for?” — every step below appears live in the
          chat's “How I got this answer” panel.
        </SectionHead>
        <h2 id="journey-h" className="sr-only">Agent steps</h2>
        <Journey />
        <div className="mt-6 flex justify-center">
          <Link to="/chat?q=I%20am%20a%20matric%20student%20from%20Lahore.%20Which%20schemes%20can%20I%20apply%20for%3F" className="btn-primary">
            <MessagesSquare className="h-4 w-4" aria-hidden /> Try this question in the AI Chat
          </Link>
        </div>
      </section>

      <section aria-labelledby="blocks-h">
        <SectionHead kicker="Building blocks" title="Inside each part" />
        <h2 id="blocks-h" className="sr-only">Building blocks</h2>
        <BuildingBlocks />
      </section>

      <section aria-labelledby="live-h" className="space-y-5">
        <SectionHead kicker="Live" title="The system right now">Real values from the running backend.</SectionHead>
        <h2 id="live-h" className="sr-only">Live system status</h2>
        <AgentPulse />
        <div className="flex flex-wrap gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="h-4 w-4" aria-hidden /> Tech stack
          </span>
          {STACK.map(([k, v]) => (
            <span key={k} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
              <b className="text-navy-900">{k}</b> · {v}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
