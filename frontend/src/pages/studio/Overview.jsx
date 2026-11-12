import HowItWorks from "./HowItWorks.jsx";
import { Brain, FileSearch, Lightbulb, ListChecks, MessageSquareText, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Code2, Database, FlaskConical, Globe, Layers, Network, RefreshCw, Share2, Sparkles, Wrench,
} from "lucide-react";
import { studioApi } from "../../api.js";
import TraceTimeline from "../../components/TraceTimeline.jsx";
import { CardSkeleton, ErrorState } from "../../components/States.jsx";
import { timeAgo } from "../../lib/format.js";
import { useAsync } from "../../lib/useAsync.js";
import { ArchitectureDiagram, GraphNodes } from "./Architecture.jsx";
import { Collapse, Panel, PipelineStrip, Toggle } from "./ui.jsx";

function FeatureCard({ icon: Icon, title, text, children, to, cta, tone = "bg-cream-200 text-navy-700", right }) {
  return (
    <div className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-navy-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{text}</p>
          </div>
        </div>
        {right}
      </div>
      <div className="mt-3 flex flex-1 flex-wrap items-end gap-2">{children}</div>
      {to && (
        <Link to={to} className="btn-secondary mt-4 self-start !py-1.5 text-xs">
          {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

const Tag = ({ children, tone = "bg-cream-200 text-navy-700" }) => <span className={`pill ${tone}`}>{children}</span>;

export default function Overview() {
  const { data: ov, error, loading, reload, setData } = useAsync((signal) => studioApi.overview({ signal }), []);
  const [savingLive, setSavingLive] = useState(false);
  const [liveError, setLiveError] = useState("");

  const toggleLive = async (on) => {
    setSavingLive(true);
    setLiveError("");
    try {
      await studioApi.saveSettings({ tavily_enabled: on });
      setData((d) => ({ ...d, live: { ...d.live, enabled: on, active: on && d.live.configured } }));
    } catch (e) {
      setLiveError(e.message);
    } finally {
      setSavingLive(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !ov) return <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>;

  const last = ov.last_run;
  return (
    <div className="space-y-6">
      <HowItWorks
        image="/img/studio-graph.webp"
        eyebrow="How the agent thinks"
        title="One question, eight steps"
        summary="Every message travels through a LangGraph state machine. Each node does one job and writes what it did into the trace, so nothing is hidden."
        steps={[
          { icon: ShieldCheck, title: "Load context", text: "Privacy guard removes CNIC / phone numbers, then short-term (this chat) and long-term (saved profile) memory are loaded.", example: `${ov.memory.sessions} sessions and ${ov.memory.saved_profiles} saved profiles in memory` },
          { icon: Brain, title: "Understand", text: "The LLM reads the message and returns JSON: language, intent, facts (age, district, education…) and which scheme “it” refers to.", example: ov.llm.available ? `Model: ${ov.llm.name}` : "LLM off: a rule-based fallback treats the message as a search" },
          { icon: UserCog, title: "Update profile", text: "New facts are merged into the profile. If a fact changed (e.g. matric → university) this is recorded as a reason to replan." },
          { icon: ListChecks, title: "Plan", text: "The planner picks which MCP tools to call and why. If the user corrected a fact, it replans (plan v1 → v2).", example: `${ov.mcp.tools} tools available to the planner` },
          { icon: Wrench, title: "Act (MCP)", text: "Each planned tool runs on the MCP server in a separate process. Eligibility comes only from verified rules here.", example: `${ov.schemes.verified} schemes with human-verified rules` },
          { icon: Lightbulb, title: "Reflect", text: "The agent checks its own evidence. Missing eligibility check, unknown scheme id or news question? It adds steps and loops back to Act (max 2×)." },
          { icon: FileSearch, title: "Retrieve", text: "RAG finds the most similar official document chunks. If fewer than 2 are strong, Tavily checks the official sites live.", example: `${ov.rag.chunks ?? "…"} chunks indexed · Tavily ${ov.live.active ? "on" : "off"}` },
          { icon: MessageSquareText, title: "Answer", text: "The LLM writes only from numbered evidence and cites [1][2]. Citations that don't exist are removed automatically." },
        ]}
      />
      {!ov.llm.available && (
        <div className="rounded-2xl border border-gold-300 bg-gold-50 p-4 text-sm text-navy-800">
          <strong>LLM not configured:</strong> the agent is running with its rule-based planner and template answers.
          Add <code className="kbd">DEEPSEEK_API_KEY</code> to <code className="kbd">backend/.env</code> and restart the API for full reasoning.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureCard
          icon={Layers}
          title="RAG Documents"
          text="Official scheme pages and PDFs, chunked and embedded into ChromaDB for retrieval."
          tone="bg-gold-50 text-gold-600"
          to="/studio/rag"
          cta="Browse documents"
        >
          <Tag>{ov.rag.documents} documents</Tag>
          <Tag tone="bg-emerald-50 text-emerald-800">✓ {ov.rag.indexed} indexed</Tag>
          <Tag>{ov.rag.chunks ?? "…"} chunks</Tag>
        </FeatureCard>

        <FeatureCard
          icon={Globe}
          title="Tavily Live Search"
          text="Up-to-date announcements, deadlines and news — from the 5 official domains only."
          tone="bg-emerald-50 text-emerald-700"
          to="/studio/live"
          cta="Open live search"
          right={<Toggle checked={ov.live.enabled} disabled={savingLive} onChange={toggleLive} label="Tavily live search" />}
        >
          <Tag tone={ov.live.active ? "bg-emerald-50 text-emerald-800" : ov.live.configured ? "bg-gold-50 text-gold-600" : "bg-rose-50 text-rose-700"}>
            Status: {ov.live.active ? "Connected" : ov.live.configured ? "Disabled" : "No API key"}
          </Tag>
          <Tag>{ov.live.sources} official sources</Tag>
          {ov.live.auto && <Tag>auto fallback</Tag>}
          {liveError && <span className="text-xs text-rose-600">{liveError}</span>}
        </FeatureCard>

        <FeatureCard
          icon={Database}
          title="Memory"
          text="Conversation history (short-term) and consented user context (long-term) for better answers."
          tone="bg-plum-50 text-plum-600"
          to="/studio/memory"
          cta="Inspect memory"
        >
          <Tag>Sessions: {ov.memory.sessions}</Tag>
          <Tag>{ov.memory.messages} messages</Tag>
          <Tag>{ov.memory.saved_profiles} saved profiles</Tag>
        </FeatureCard>

        <FeatureCard
          icon={Share2}
          title="MCP Tools"
          text="A real MCP server (stdio, separate process) exposing the verified rule engine and live search."
          tone="bg-cream-200 text-navy-700"
          to="/studio/mcp"
          cta="Open playground"
        >
          <Tag>{ov.mcp.tools} tools configured</Tag>
          <Tag>{ov.mcp.server?.name}</Tag>
          <Tag>{ov.schemes.verified} verified schemes</Tag>
        </FeatureCard>

        <FeatureCard
          icon={Code2}
          title="Prompt Studio"
          text="Edit and validate the system and stage prompts (understand, plan, answer). Changes apply instantly."
          tone="bg-plum-50 text-plum-700"
          to="/studio/prompts"
          cta="Edit prompts"
        >
          <Tag>{ov.prompts.total} prompts</Tag>
          <Tag tone={ov.prompts.customized ? "bg-gold-50 text-gold-600" : "bg-cream-200 text-navy-700"}>
            {ov.prompts.customized} customized
          </Tag>
          <Tag>{ov.llm.available ? ov.llm.name : "LLM: fallback"}</Tag>
        </FeatureCard>

        <FeatureCard
          icon={FlaskConical}
          title="Simulation & Testing"
          text="Run scripted personas through the real agent and check planning, tools, privacy and citations."
          tone="bg-emerald-50 text-emerald-700"
          to="/studio/testing"
          cta="Open testing"
        >
          <Tag>{ov.simulations.runs} runs this session</Tag>
          {ov.simulations.runs > 0 && (
            <Tag tone="bg-emerald-50 text-emerald-800">
              {ov.simulations.passed}/{ov.simulations.runs} passed
            </Tag>
          )}
        </FeatureCard>
      </div>

      <Panel
        title="Execution Trace (Last Run)"
        icon={Activity}
        sub={last ? `${last.kind === "simulation" ? "Simulation" : "Chat"} · ${timeAgo(last.at)} · “${last.message}”` : undefined}
        actions={
          <button type="button" onClick={() => reload()} className="btn-ghost !py-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
          </button>
        }
      >
        <PipelineStrip stages={last?.pipeline} />
        {last && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {last.tools?.map((t, i) => (
                <span key={i} className="pill bg-cream-200 font-mono text-navy-700">
                  <Wrench className="h-3 w-3" aria-hidden /> {t}
                </span>
              ))}
              {last.elapsed_ms != null && <span className="pill bg-emerald-50 text-emerald-800">{(last.elapsed_ms / 1000).toFixed(1)} s</span>}
            </div>
            <GraphNodes trace={last.trace} />
            <Collapse label={`Full trace (${last.trace?.length || 0} events)`}>
              <div className="rounded-xl border border-slate-200 bg-white/60 p-3">
                <TraceTimeline events={last.trace || []} final={null} streaming={false} />
              </div>
            </Collapse>
          </div>
        )}
      </Panel>

      <Panel title="Agent Architecture" icon={Network} sub="LangGraph multi-step agent for grounded, reliable scheme assistance. Click a component to open it.">
        <ArchitectureDiagram ov={ov} />
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="LLM" icon={Sparkles}>
          <p className="font-mono text-sm text-navy-800">{ov.llm.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {ov.llm.available ? "Used for understanding, planning and writing. Never decides eligibility." : ov.llm.error}
          </p>
        </Panel>
        <Panel title="Embeddings" icon={Layers}>
          <p className="break-all font-mono text-sm text-navy-800">{ov.rag.embedding_model.split("/").pop()}</p>
          <p className="mt-1 text-xs text-slate-500">Multilingual (English / Urdu / Roman Urdu) · {ov.rag.vector_store} · top-k {ov.rag.top_k}</p>
        </Panel>
        <Panel title="MCP server" icon={Share2}>
          <p className="font-mono text-sm text-navy-800">
            {ov.mcp.server?.name} v{ov.mcp.server?.version}
          </p>
          <p className="mt-1 text-xs text-slate-500">Protocol {ov.mcp.server?.protocol} · stdio transport · {ov.mcp.tools} tools</p>
        </Panel>
      </div>
    </div>
  );
}
