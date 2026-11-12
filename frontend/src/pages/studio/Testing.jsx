import HowItWorks from "./HowItWorks.jsx";
import { Activity, Bot, ListChecks, UserRound } from "lucide-react";
import { useState } from "react";
import { CheckCircle2, Circle, FlaskConical, History, MinusCircle, Play, PlayCircle, Wrench, XCircle } from "lucide-react";
import { studioApi } from "../../api.js";
import MarkdownMessage from "../../components/MarkdownMessage.jsx";
import TraceTimeline from "../../components/TraceTimeline.jsx";
import { CardSkeleton, ErrorState, Spinner } from "../../components/States.jsx";
import { timeAgo } from "../../lib/format.js";
import { useAsync } from "../../lib/useAsync.js";
import { GraphNodes } from "./Architecture.jsx";
import { Collapse, Panel, PipelineStrip } from "./ui.jsx";

const CAT_TONE = {
  Planning: "bg-emerald-50 text-emerald-800", Replanning: "bg-gold-50 text-gold-600", Safety: "bg-rose-50 text-rose-700",
  Language: "bg-plum-50 text-plum-700", Memory: "bg-plum-50 text-plum-600", "Live search": "bg-emerald-50 text-emerald-700",
};

function CheckRow({ c }) {
  const Icon = c.skipped ? MinusCircle : c.passed ? CheckCircle2 : XCircle;
  const tone = c.skipped ? "text-slate-400" : c.passed ? "text-emerald-600" : "text-rose-600";
  return (
    <li className="flex items-start gap-2 text-xs">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      <span className="min-w-0">
        <span className="font-medium text-navy-900">{c.label}</span>
        {c.detail && <span className="text-slate-500"> — {c.detail}</span>}
      </span>
    </li>
  );
}

function Result({ r }) {
  const last = r.turns[r.turns.length - 1];
  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">{r.checks.map((c, i) => <CheckRow key={i} c={c} />)}</ul>
      <PipelineStrip stages={last.pipeline} />
      <Collapse label={`Conversation (${r.turns.length} turn${r.turns.length > 1 ? "s" : ""}) · ${(r.total_ms / 1000).toFixed(1)} s · ${r.llm}`}>
        <ol className="space-y-3">
          {r.turns.map((t, i) => (
            <li key={i} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-plum-100 px-3 py-2 text-sm text-plum-900" dir="auto">{t.message}</p>
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white/70 p-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="pill bg-cream-200 text-navy-700">intent: {t.intent}</span>
                  {t.tools.map((x, j) => <span key={j} className="pill bg-emerald-50 font-mono text-emerald-800"><Wrench className="h-3 w-3" />{x}</span>)}
                  <span className="pill bg-cream-200 text-navy-700">{t.citations?.length || 0} citations</span>
                </div>
                <MarkdownMessage text={t.answer || "_(no answer)_"} />
              </div>
            </li>
          ))}
        </ol>
      </Collapse>
      <Collapse label="LangGraph nodes & full trace">
        <GraphNodes trace={last.trace || []} />
        <div className="mt-3 rounded-xl border border-slate-200 bg-white/60 p-3">
          <TraceTimeline events={last.trace || []} streaming={false} />
        </div>
      </Collapse>
    </div>
  );
}

export default function Testing() {
  const { data, error, loading, reload } = useAsync((signal) => studioApi.scenarios({ signal }), []);
  const runs = useAsync((signal) => studioApi.runs({ signal }), []);
  const [results, setResults] = useState({}); // id -> {status, data, error}
  const [batch, setBatch] = useState(false);
  const [custom, setCustom] = useState("I am a 22 year old female student in Multan, family income 35000.\nWhich scholarships can I get?");

  const runOne = async (id, body) => {
    setResults((r) => ({ ...r, [id]: { status: "running" } }));
    try {
      const res = await studioApi.simulate(body);
      setResults((r) => ({ ...r, [id]: { status: res.passed ? "pass" : "fail", data: res } }));
      runs.reload({ silent: true });
      return res;
    } catch (e) {
      setResults((r) => ({ ...r, [id]: { status: "error", error: e } }));
      return null;
    }
  };
  const runAll = async () => {
    setBatch(true);
    for (const s of data.scenarios) {
      // eslint-disable-next-line no-await-in-loop
      await runOne(s.id, { scenario_id: s.id });
    }
    setBatch(false);
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <CardSkeleton lines={6} />;

  const done = Object.values(results).filter((r) => r.status === "pass" || r.status === "fail");
  const passed = done.filter((r) => r.status === "pass").length;
  const running = Object.values(results).some((r) => r.status === "running");

  return (
    <div className="space-y-6">
      <HowItWorks
        image="/img/studio-testing.webp"
        title="Simulation & Testing"
        summary="Scripted users talk to the real agent and automatic checks verify its behaviour — like an exam for the AI."
        steps={[
          { icon: UserRound, title: "Persona", text: "Each scenario is a short script: one or more messages a real user might send (English, Roman Urdu, follow-ups, corrections).", example: `${data.scenarios.length} scenarios ready` },
          { icon: Bot, title: "Run agent", text: "The full agent runs in a fresh session with the real LLM, MCP tools, RAG, memory and Tavily — nothing is mocked." },
          { icon: Activity, title: "Record trace", text: "Every node, tool call, retrieval and answer is captured with timing." },
          { icon: ListChecks, title: "Check", text: "Rules verify behaviour: right intent, right tools, replanning happened, citations present, CNIC never leaks, off-topic declined." },
          { icon: CheckCircle2, title: "Report", text: "Pass/fail per check, plus the conversation and trace, so you can see exactly why something passed or failed." },
        ]}
      />
      <Panel
        title="Scenario suite"
        icon={FlaskConical}
        sub="Each scenario runs the real agent (LLM, MCP, RAG, memory, Tavily) in a fresh session and checks its behaviour automatically."
        actions={
          <>
            {done.length > 0 && (
              <span className={`pill ${passed === done.length ? "bg-emerald-50 text-emerald-800" : "bg-gold-50 text-gold-600"}`}>
                {passed}/{done.length} passed
              </span>
            )}
            <button type="button" onClick={runAll} disabled={batch || running} className="btn-primary !py-1.5 text-xs">
              {batch ? <Spinner className="h-3.5 w-3.5" /> : <PlayCircle className="h-4 w-4" />} Run all
            </button>
          </>
        }
      >
        {data.llm_available === false && (
          <p className="mb-3 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2 text-xs text-navy-800">
            <strong>No LLM key:</strong> the agent runs on its rule-based fallback, so checks that need language understanding
            (fact extraction, out-of-scope detection, “it” follow-ups) are expected to fail. Add <code className="kbd">DEEPSEEK_API_KEY</code> to backend/.env.
          </p>
        )}
        {!data.live_search_active && (
          <p className="mb-3 rounded-xl bg-cream-200 px-3 py-2 text-xs text-slate-600">
            Tavily live search is off or has no API key, so the live-search check will be skipped.
          </p>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {data.scenarios.map((s) => {
            const r = results[s.id];
            const st = r?.status;
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  st === "pass" ? "border-emerald-300 bg-emerald-50/40" : st === "fail" || st === "error" ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`pill ${CAT_TONE[s.category] || "bg-cream-200 text-navy-700"}`}>{s.category}</span>
                    <h3 className="mt-1 font-semibold text-navy-900">{s.title}</h3>
                  </div>
                  <button type="button" onClick={() => runOne(s.id, { scenario_id: s.id })} disabled={st === "running" || batch} className="btn-secondary shrink-0 !py-1.5 text-xs">
                    {st === "running" ? <Spinner className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {st ? "Re-run" : "Run"}
                  </button>
                </div>
                <ol className="mt-2 space-y-1">
                  {s.messages.map((m, i) => (
                    <li key={i} className="rounded-lg bg-plum-50 px-2.5 py-1.5 text-xs text-plum-900" dir="auto">
                      <span className="mr-1 font-semibold text-plum-500">{i + 1}.</span>{m}
                    </li>
                  ))}
                </ol>
                {!r && (
                  <ul className="mt-3 space-y-1">
                    {s.checks.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Circle className="h-3 w-3" /> {c.type.replace(/_/g, " ")}{c.value != null && `: ${Array.isArray(c.value) ? c.value.join("/") : c.value}`}
                      </li>
                    ))}
                  </ul>
                )}
                {st === "running" && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-3.5 w-3.5" /> Agent is working… (LLM calls can take 5–20 s per turn)</p>}
                {r?.error && <div className="mt-3"><ErrorState error={r.error} compact /></div>}
                {r?.data && <div className="mt-3"><Result r={r.data} /></div>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Custom simulation" icon={Play} sub="One message per line — each line is a turn in the same session (tests short-term memory and replanning).">
        <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={4} className="input" dir="auto" />
        <button
          type="button"
          className="btn-plum mt-2"
          disabled={results.custom?.status === "running" || !custom.trim()}
          onClick={() => runOne("custom", { messages: custom.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6) })}
        >
          {results.custom?.status === "running" ? <Spinner /> : <PlayCircle className="h-4 w-4" />} Run simulation
        </button>
        {results.custom?.error && <div className="mt-3"><ErrorState error={results.custom.error} compact /></div>}
        {results.custom?.data && <div className="mt-4"><Result r={results.custom.data} /></div>}
      </Panel>

      <Panel title="Run history" icon={History} sub="Chats and simulations since the API started (kept in memory).">
        {runs.data?.runs?.length ? (
          <ul className="divide-y divide-slate-100">
            {runs.data.runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
                <span className={`pill ${r.kind === "chat" ? "bg-plum-50 text-plum-700" : "bg-emerald-50 text-emerald-800"}`}>{r.kind}</span>
                {r.passed != null && (r.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />)}
                <span className="min-w-0 flex-1 truncate text-navy-800" dir="auto">{r.title ? `${r.title}: ` : ""}{r.message}</span>
                <span className="font-mono text-slate-500">{r.tools.length} tools</span>
                <span className="text-slate-400">{r.elapsed_ms != null ? `${(r.elapsed_ms / 1000).toFixed(1)} s · ` : ""}{timeAgo(r.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No runs yet.</p>
        )}
      </Panel>
    </div>
  );
}
