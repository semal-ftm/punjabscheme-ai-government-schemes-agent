import { useEffect, useState } from "react";
import {
  Brain, BookOpenText, Cpu, Database, FileSearch, GitBranch, ListChecks, MessageSquareText, Plug, RefreshCcw, UserCog, Wrench,
} from "lucide-react";
import { api } from "../../api.js";
import { CountUp } from "./Animated.jsx";

// Mirrors the LangGraph nodes returned by /api/agent/info (graph.py).
const NODES = {
  load_context: { label: "Load memory", icon: Database },
  understand: { label: "Understand", icon: Brain },
  update_profile: { label: "Update facts", icon: UserCog },
  plan: { label: "Plan", icon: ListChecks },
  act: { label: "Call MCP tools", icon: Wrench },
  reflect: { label: "Reflect", icon: RefreshCcw },
  retrieve: { label: "Retrieve (RAG)", icon: FileSearch },
  answer: { label: "Answer + cite", icon: MessageSquareText },
};
const DEFAULT_GRAPH = Object.keys(NODES);

function useAgentInfo() {
  const [state, setState] = useState({ info: null, health: null, down: false });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const health = await api.health();
        const info = health.status === "ok" ? await api.agentInfo().catch(() => null) : null;
        if (alive) setState({ health, info, down: false });
      } catch {
        if (alive) setState((s) => ({ ...s, down: true }));
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return state;
}

function Pipeline({ graph }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((n) => (n + 1) % graph.length), 900);
    return () => clearInterval(t);
  }, [graph.length]);

  return (
    <div className="relative">
      {/* connecting rail with a travelling pulse (desktop) */}
      <div className="absolute left-[6%] right-[6%] top-6 hidden h-0.5 bg-gradient-to-r from-emerald-400/20 via-sky-400/40 to-violet-400/20 lg:block" aria-hidden>
        <span className="absolute -top-[3px] h-2 w-2 animate-flow rounded-full bg-emerald-300 shadow-[0_0_12px_4px_rgba(52,211,153,0.6)]" />
      </div>
      <ol className="relative grid grid-cols-4 gap-x-2 gap-y-5 lg:grid-cols-8">
        {graph.map((id, n) => {
          const node = NODES[id] || { label: id, icon: GitBranch };
          const Icon = node.icon;
          const on = n === active;
          return (
            <li key={id} className="flex flex-col items-center text-center">
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 transition-all duration-500 ${
                  on ? "scale-110 bg-emerald-400 text-navy-950 shadow-glow ring-emerald-300" : "bg-white/5 text-navy-100 ring-white/15"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className={`mt-2 text-[11px] font-medium leading-tight transition-colors ${on ? "text-white" : "text-navy-300"}`}>
                <span className="block text-[10px] text-navy-400">{n + 1}</span>
                {node.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/10">
      <div className="flex items-center gap-2 text-xs font-medium text-navy-300">
        <Icon className={`h-4 w-4 ${accent}`} aria-hidden /> {label}
      </div>
      <p className="mt-1.5 truncate text-lg font-bold text-white" title={typeof value === "string" ? value : undefined}>{value}</p>
      {sub && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-navy-300" title={sub}>{sub}</p>}
    </div>
  );
}

export default function AgentPulse() {
  const { info, health, down } = useAgentInfo();
  const state = down ? "offline" : health?.status === "ok" ? "online" : health ? "starting" : "checking";
  const badge = {
    online: ["bg-emerald-400", "Agent online"],
    starting: ["bg-amber-300", "Agent starting…"],
    offline: ["bg-rose-400", "Backend offline"],
    checking: ["bg-navy-300", "Connecting…"],
  }[state];
  const tools = info?.mcp_tools || [];
  const llmDown = health?.llm_error || info?.llm_error;

  return (
    <section
      aria-labelledby="agent-h"
      className="relative isolate overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white shadow-lift sm:p-8"
    >
      <div className="hero-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" aria-hidden />
      <div className="absolute -bottom-24 left-10 -z-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Under the hood</p>
          <h2 id="agent-h" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">The agent at work</h2>
          <p className="mt-1 max-w-xl text-sm text-navy-300">
            Every question goes through these eight steps. The AI plans and writes, but eligibility always comes from verified official rules.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15">
          <span className="relative flex h-2.5 w-2.5">
            {state === "online" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${badge[0]} opacity-75`} />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${badge[0]}`} />
          </span>
          {badge[1]}
        </span>
      </div>

      <div className="mt-8">
        <Pipeline graph={info?.graph?.length ? info.graph : DEFAULT_GRAPH} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Cpu}
          accent="text-sky-300"
          label="Language model"
          value={(info?.llm || health?.llm || "—").split(":").pop()}
          sub={llmDown ? "API unavailable: rule-based fallback active" : "Understands, plans and writes answers"}
        />
        <Stat
          icon={Plug}
          accent="text-emerald-300"
          label="MCP server"
          value={info ? <><CountUp value={tools.length} /> tools connected</> : "—"}
          sub={info?.mcp_server?.protocol ? `${info.mcp_server.name} · protocol ${info.mcp_server.protocol}` : "stdio, separate process"}
        />
        <Stat
          icon={BookOpenText}
          accent="text-violet-300"
          label="RAG knowledge base"
          value={typeof info?.chunks_indexed === "number" ? <><CountUp value={info.chunks_indexed} /> chunks</> : "—"}
          sub={info ? `${info.vector_store} · ${(info.embedding_model || "").split("/").pop()}` : "ChromaDB"}
        />
        <Stat
          icon={Database}
          accent="text-amber-300"
          label="Memory"
          value="Short + long term"
          sub={info?.memory ? `${info.memory.short_term} · ${info.memory.long_term}` : "Session checkpointer · SQLite"}
        />
      </div>

      {tools.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tools.map((t) => (
            <span
              key={t.name}
              title={t.description}
              className="rounded-full bg-white/5 px-3 py-1 font-mono text-[11px] text-emerald-200 ring-1 ring-emerald-300/20 transition hover:bg-emerald-400/15"
            >
              {t.name}()
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
