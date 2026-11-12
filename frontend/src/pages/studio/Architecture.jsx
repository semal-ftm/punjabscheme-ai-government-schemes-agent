import { Link } from "react-router-dom";
import { BrainCircuit, Database, Globe, Laptop, Network, Sparkles, Wrench, Workflow } from "lucide-react";

function Box({ to, icon: Icon, title, sub, tone, status, className = "" }) {
  const body = (
    <>
      <Icon className="h-6 w-6 shrink-0" strokeWidth={1.7} aria-hidden />
      <span className="min-w-0 text-center">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className="block text-[11px] leading-snug opacity-75">{sub}</span>
      </span>
      {status && (
        <span
          className={`absolute right-2 top-2 h-2 w-2 rounded-full ${status === "ok" ? "bg-emerald-500" : status === "warn" ? "bg-gold-400" : "bg-rose-400"}`}
          title={status === "ok" ? "Active" : status === "warn" ? "Partly available" : "Off / not configured"}
        />
      )}
    </>
  );
  const cls = `relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 transition-all ${tone} ${className}`;
  return to ? (
    <Link to={to} className={`${cls} hover:-translate-y-0.5 hover:shadow-lift`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const Down = () => (
  <svg className="mx-auto h-7 w-4 text-emerald-600" viewBox="0 0 16 28" aria-hidden>
    <line x1="8" y1="0" x2="8" y2="22" stroke="currentColor" strokeWidth="2" className="flow-line" />
    <path d="M3 19l5 7 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Component diagram of the agent. `ov` = /api/studio/overview response (for live status dots). */
export function ArchitectureDiagram({ ov }) {
  const st = {
    llm: ov ? (ov.llm.available ? "ok" : "warn") : null,
    rag: ov ? (ov.rag.chunks ? "ok" : "warn") : null,
    memory: ov ? "ok" : null,
    mcp: ov ? (ov.mcp.tools ? "ok" : "off") : null,
    live: ov ? (ov.live.active ? "ok" : ov.live.configured ? "warn" : "off") : null,
  };
  const components = [
    { to: "/studio/prompts", icon: Sparkles, title: "LLM", sub: "Reasoning & generation", status: st.llm },
    { to: "/studio/rag", icon: Database, title: "RAG", sub: "Official documents", status: st.rag },
    { to: "/studio/memory", icon: Network, title: "Memory", sub: "Session + long-term", status: st.memory },
    { to: "/studio/mcp", icon: Wrench, title: "MCP Tools", sub: "Verified rule engine", status: st.mcp },
    { to: "/studio/live", icon: Globe, title: "Tavily", sub: "Live official web", status: st.live },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_15rem]">
      <div className="flex flex-col items-stretch">
        <Box icon={Laptop} title="User Interface" sub="React web app · SSE stream" tone="mx-auto w-56 border-plum-200 bg-plum-50 text-plum-800" />
        <Down />
        <Box
          to="/studio/testing"
          icon={BrainCircuit}
          title="Primary AI Agent (LangGraph)"
          sub="understand → plan → act → reflect → retrieve → answer"
          tone="mx-auto w-full max-w-md border-emerald-300 bg-emerald-50 text-emerald-900"
        />
        <Down />
        <div className="relative">
          <div className="absolute left-[10%] right-[10%] top-0 hidden h-0.5 bg-emerald-300 sm:block" aria-hidden />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:pt-4">
            {components.map((c) => (
              <div key={c.title} className="relative">
                <span className="absolute -top-4 left-1/2 hidden h-4 w-0.5 -translate-x-1/2 bg-emerald-300 sm:block" aria-hidden />
                <Box {...c} tone="h-full border-slate-200 bg-cream-50 text-navy-800" />
              </div>
            ))}
          </div>
          <div className="relative mt-4 hidden h-4 sm:block" aria-hidden>
            <div className="absolute left-[10%] right-[10%] top-0 h-0.5 bg-emerald-300" />
          </div>
        </div>
        <Down />
        <Box
          icon={Sparkles}
          title="Grounded Response"
          sub="Accurate · cited · up to date"
          tone="mx-auto w-64 border-plum-300 bg-plum-100 text-plum-800"
        />
      </div>

      <aside className="rounded-2xl border border-gold-300 bg-gold-50 p-4">
        <h3 className="font-display text-base font-semibold text-navy-900">Flow (end-to-end)</h3>
        <ol className="mt-3 space-y-2.5 text-xs text-navy-700">
          {[
            "User query arrives from the UI (privacy guard masks CNIC/phone first)",
            "LangGraph agent understands the request and plans tool calls",
            "MCP tools apply verified rules; RAG retrieves official documents",
            "Tavily checks the 5 official sites live when news is asked or RAG is weak",
            "Reflect adds steps if evidence is incomplete, then the LLM writes",
            "Grounded answer streams back with numbered citations",
          ].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-400 text-[10px] font-bold text-white">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

const NODES = [
  ["load_context", "Load context", "privacy guard + memory"],
  ["understand", "Understand", "intent, facts, language"],
  ["update_profile", "Update profile", "detect corrections"],
  ["plan", "Plan", "LLM planner + rules"],
  ["act", "Act", "MCP tool calls"],
  ["reflect", "Reflect", "add steps / retry"],
  ["retrieve", "Retrieve", "RAG + Tavily fallback"],
  ["answer", "Answer", "cited, validated"],
];

/** The 8-node LangGraph, highlighting nodes that ran in `trace`. */
export function GraphNodes({ trace = [] }) {
  const ran = new Set(trace.map((e) => e.node));
  const loops = trace.filter((e) => e.node === "reflect" && e.title?.includes("adding steps")).length;
  return (
    <div>
      <ol className="flex flex-wrap items-stretch gap-1.5">
        {NODES.map(([id, label, sub], i) => (
          <li key={id} className="flex items-center gap-1.5">
            <div
              className={`rounded-xl border px-3 py-2 ${
                ran.has(id) ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-cream-50 text-navy-700"
              }`}
            >
              <p className="flex items-center gap-1 text-xs font-semibold">
                <Workflow className="h-3 w-3 opacity-60" aria-hidden /> {label}
              </p>
              <p className="text-[10px] opacity-70">{sub}</p>
            </div>
            {i < NODES.length - 1 && <span className="text-slate-300" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-slate-500">
        Conditional edge: <span className="kbd">reflect → act</span> when evidence is incomplete (max 2 loops)
        {trace.length > 0 && <> · last run looped {loops}×</>}
      </p>
    </div>
  );
}
