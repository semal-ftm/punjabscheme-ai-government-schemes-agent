import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, Brain, ChevronRight, CircleCheck, Clock, Database, ExternalLink, FileSearch,
  Lightbulb, ListChecks, MessageSquareText, RefreshCw, ShieldCheck, UserCog, Workflow, Wrench, XCircle,
} from "lucide-react";
import { LANGUAGE_LABELS, fieldLabel } from "../lib/constants.js";
import { formatValue, hostOf } from "../lib/format.js";
import { Spinner } from "./States.jsx";

// LangGraph nodes, in graph order.
const NODES = {
  load_context: { label: "Load context & memory", icon: Database },
  understand: { label: "Understand the request", icon: Brain },
  update_profile: { label: "Update profile", icon: UserCog },
  plan: { label: "Plan", icon: ListChecks },
  act: { label: "Act: MCP tool calls", icon: Wrench },
  reflect: { label: "Reflect", icon: Lightbulb },
  retrieve: { label: "Retrieve official documents (RAG)", icon: FileSearch },
  answer: { label: "Compose answer", icon: MessageSquareText },
};

const TYPES = {
  memory: { icon: Database, dot: "bg-violet-100 text-violet-700", label: "Memory" },
  privacy: { icon: ShieldCheck, dot: "bg-teal-100 text-teal-700", label: "Privacy" },
  understanding: { icon: Brain, dot: "bg-sky-100 text-sky-700", label: "Understanding" },
  plan: { icon: ListChecks, dot: "bg-navy-100 text-navy-700", label: "Plan" },
  replan: { icon: RefreshCw, dot: "bg-amber-400 text-white", label: "Replan" },
  tool_call: { icon: Wrench, dot: "bg-indigo-100 text-indigo-700", label: "Tool call" },
  tool_result: { icon: CircleCheck, dot: "bg-emerald-100 text-emerald-700", label: "Tool result" },
  retrieval: { icon: FileSearch, dot: "bg-cyan-100 text-cyan-700", label: "Retrieval" },
  reflection: { icon: Lightbulb, dot: "bg-purple-100 text-purple-700", label: "Reflection" },
  answer: { icon: MessageSquareText, dot: "bg-emerald-600 text-white", label: "Answer" },
  warning: { icon: AlertTriangle, dot: "bg-amber-100 text-amber-700", label: "Warning" },
  error: { icon: XCircle, dot: "bg-rose-100 text-rose-700", label: "Error" },
};

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const isEmpty = (v) => v == null || (Array.isArray(v) && !v.length) || (isPlainObject(v) && !Object.keys(v).length);

function Collapsible({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-navy-800"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
        {label}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

function Json({ value }) {
  return (
    <pre className="max-h-56 overflow-auto rounded-lg bg-slate-900 p-2 text-[11px] leading-relaxed text-slate-100 scroll-thin">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function KeyValues({ obj }) {
  return (
    <dl className="mt-1 flex flex-wrap gap-1">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px]">
          <dt className="inline text-slate-500">{fieldLabel(k)}: </dt>
          <dd className="inline font-medium text-navy-800">{formatValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PlanSteps({ steps }) {
  if (!steps?.length) return <p className="mt-1 text-xs text-slate-500">No tool steps.</p>;
  return (
    <ol className="mt-1.5 space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-900 text-[10px] font-bold text-white">{i + 1}</span>
          <div className="min-w-0 text-xs">
            <code className="font-semibold text-indigo-700">{s.tool}</code>
            {!isEmpty(s.args) && <code className="ml-1 break-all text-[11px] text-slate-500">{JSON.stringify(s.args)}</code>}
            {s.why && <p className="mt-0.5 text-slate-600">{s.why}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Links({ urls }) {
  const [all, setAll] = useState(false);
  if (!urls?.length) return null;
  const shown = all ? urls : urls.slice(0, 3);
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-semibold text-slate-500">Links checked ({urls.length})</p>
      <ul className="mt-0.5 space-y-0.5">
        {shown.map((u) => (
          <li key={u} className="min-w-0">
            <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-[11px] text-emerald-700 hover:underline" title={u}>
              <span className="truncate">{hostOf(u)}{(() => { try { return new URL(u).pathname; } catch { return ""; } })()}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      {urls.length > 3 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="text-[11px] font-semibold text-slate-500 hover:text-navy-800">
          {all ? "Show fewer" : `Show all ${urls.length}`}
        </button>
      )}
    </div>
  );
}

/** Type-specific rendering of an event's `data` payload. */
function EventData({ ev }) {
  const { type, data } = ev;
  if (isEmpty(data)) return null;

  if (type === "plan" || (type === "replan" && Array.isArray(data?.steps))) {
    return (
      <>
        <PlanSteps steps={data.steps} />
        {data.planner && <p className="mt-1 text-[11px] text-slate-500">Planner: {data.planner}</p>}
      </>
    );
  }
  if (type === "replan" && Array.isArray(data?.changed)) {
    return (
      <ul className="mt-1.5 space-y-1">
        {data.changed.map((c) => (
          <li key={c.scheme_id} className="rounded-lg bg-white p-1.5 text-xs">
            <span className="font-medium text-navy-900">{c.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1 text-slate-600">
              {c.old} <ArrowRight className="h-3 w-3" aria-hidden /> <strong className="text-navy-900">{c.new}</strong>
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (type === "tool_call") {
    return (
      <div className="mt-1">
        <code className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">{data.tool}</code>
        <Collapsible label="Arguments (JSON)">
          <Json value={data.args} />
        </Collapsible>
      </div>
    );
  }
  if (type === "tool_result" || type === "error") return <Links urls={data.links_checked} />;
  if (type === "retrieval" && Array.isArray(data)) {
    return (
      <ul className="mt-1.5 space-y-1.5">
        {data.map((c, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="min-w-0 font-medium text-navy-900 hover:text-emerald-700 hover:underline" dir="auto">
                {c.title}
                {c.page ? ` (p. ${c.page})` : ""}
              </a>
              <span className="shrink-0 rounded bg-cyan-50 px-1 font-mono text-[10px] text-cyan-800" title="Cosine similarity">
                {typeof c.score === "number" ? c.score.toFixed(2) : c.score}
              </span>
            </div>
            {c.source && <p className="text-[11px] text-slate-500">{c.source}</p>}
            {c.excerpt && <p dir="auto" className="mt-1 line-clamp-4 italic text-slate-600">“{c.excerpt}…”</p>}
          </li>
        ))}
      </ul>
    );
  }
  if (type === "understanding") {
    return (
      <div className="mt-1 space-y-1 text-xs">
        <div className="flex flex-wrap gap-1">
          <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">intent: {data.intent}</span>
          {data.language && (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">
              language: {LANGUAGE_LABELS[data.language] || data.language}
            </span>
          )}
          {data.by && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">by {data.by}</span>}
        </div>
        {data.search_query && <p className="text-slate-600">Search query: “{data.search_query}”</p>}
        {!isEmpty(data.facts_extracted) && (
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Facts extracted</p>
            <KeyValues obj={data.facts_extracted} />
          </div>
        )}
        {!isEmpty(data.schemes_referenced) && (
          <p className="text-slate-600">
            Schemes referenced: {data.schemes_referenced.join(", ")}
            {!isEmpty(data.resolved_from_history) && " (resolved from conversation history)"}
          </p>
        )}
      </div>
    );
  }
  if (type === "memory") {
    // Profile changes: [{field, old, new}]
    if (Array.isArray(data) && data[0]?.field !== undefined) {
      return (
        <ul className="mt-1 space-y-0.5 text-xs">
          {data.map((c) => (
            <li key={c.field} className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-navy-800">{fieldLabel(c.field)}:</span>
              <span className="text-slate-500">{c.old == null ? "—" : formatValue(c.old)}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden />
              <span className="font-semibold text-violet-700">{formatValue(c.new)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (isPlainObject(data) && !("session_id" in data) && !("summary" in data)) return <KeyValues obj={data} />;
    return (
      <Collapsible label="Details">
        <Json value={data} />
      </Collapsible>
    );
  }
  if (type === "answer" && Array.isArray(data)) {
    return (
      <ul className="mt-1 space-y-0.5 text-xs">
        {data.map((c) => (
          <li key={c.n} className="flex gap-1.5">
            <span className="font-bold text-navy-700">[{c.n}]</span>
            {c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-emerald-700 hover:underline" dir="auto">
                {c.title}
              </a>
            ) : (
              <span className="min-w-0 truncate" dir="auto">{c.title}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (type === "reflection" && Array.isArray(data?.new_steps)) return <PlanSteps steps={data.new_steps} />;
  if (type === "reflection" && isPlainObject(data?.verdicts)) {
    return (
      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
        {Object.entries(data.verdicts).map(([name, v]) => (
          <li key={name}>
            <span className="font-medium text-navy-800">{name}</span>: {v}
          </li>
        ))}
      </ul>
    );
  }
  if (type === "reflection" && Array.isArray(data) && data[0]?.question) {
    return (
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
        {data.map((q) => (
          <li key={q.field}>
            {q.question} <span className="text-slate-400">(unblocks {q.unblocks})</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Collapsible label="Details">
      <Json value={data} />
    </Collapsible>
  );
}

function TraceEvent({ ev }) {
  const t = TYPES[ev.type] || TYPES.reflection;
  const Icon = t.icon;
  const replan = ev.type === "replan";
  const privacy = ev.type === "privacy";
  return (
    <li className="relative flex gap-2.5 pb-3 last:pb-0">
      <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.dot}`} title={t.label}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div
        className={`min-w-0 flex-1 ${
          replan ? "rounded-xl border border-amber-300 bg-amber-50 p-2.5" : privacy ? "rounded-xl border border-teal-200 bg-teal-50 p-2.5" : "pt-0.5"
        }`}
      >
        <p className={`text-[13px] font-semibold leading-snug ${replan ? "text-amber-900" : "text-navy-900"}`}>
          <span className="sr-only">{t.label}: </span>
          {ev.title}
        </p>
        {ev.detail && (
          <p dir="auto" className={`mt-0.5 break-words text-xs ${replan ? "text-amber-900" : "text-slate-600"}`}>
            {ev.detail}
          </p>
        )}
        <EventData ev={ev} />
      </div>
    </li>
  );
}

/** Groups consecutive events by node so the graph flow (act -> reflect -> act ...) stays visible. */
function groupByNode(events) {
  const groups = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.node === ev.node) last.events.push(ev);
    else groups.push({ node: ev.node, events: [ev], key: `${ev.node}-${ev.id}` });
  }
  return groups;
}

function useElapsed(startedAt, running) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  return startedAt ? Math.max(0, now - startedAt) : 0;
}

/**
 * Live "How I got this answer" timeline.
 * events: trace events [{id, ts, node, type, title, detail, data}]; final: chat `final` result (optional).
 */
export default function TraceTimeline({ events = [], final, streaming, startedAt }) {
  const liveMs = useElapsed(startedAt, streaming);
  const understanding = final?.understanding?.intent
    ? final.understanding
    : events.find((e) => e.type === "understanding")?.data;
  const planVersion = final?.plan?.version;
  const toolCalls = events.filter((e) => e.type === "tool_call").length;
  const elapsed = final?.elapsed_ms ?? (streaming ? liveMs : null);

  if (!events.length && !streaming) {
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <Workflow className="h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-2 text-sm font-medium text-navy-800">No trace yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Ask a question and you will see every step live: memory, plan, MCP tool calls, document retrieval and
          reflection.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Time</p>
          <p className="flex items-center justify-center gap-1 text-sm font-bold text-navy-900">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {elapsed != null ? `${(elapsed / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">MCP calls</p>
          <p className="text-sm font-bold text-navy-900">{toolCalls}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Plan</p>
          <p className="text-sm font-bold text-navy-900">{planVersion ? `v${planVersion}` : "—"}</p>
        </div>
      </div>

      {understanding?.intent && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs">
          <p className="font-semibold text-sky-900">Understanding</p>
          <p className="mt-1 text-sky-900">
            Intent <strong>{understanding.intent}</strong>
            {understanding.language && (
              <>
                {" "}· Language <strong>{LANGUAGE_LABELS[understanding.language] || understanding.language}</strong>
              </>
            )}
          </p>
          {!isEmpty(understanding.profile_updates || understanding.facts_extracted) && (
            <KeyValues obj={understanding.profile_updates || understanding.facts_extracted} />
          )}
        </div>
      )}

      <ol className="space-y-3" aria-live="polite" aria-relevant="additions">
        {groupByNode(events).map((g) => {
          const n = NODES[g.node] || { label: g.node, icon: Workflow };
          const NodeIcon = n.icon;
          return (
            <li key={g.key} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <NodeIcon className="h-3.5 w-3.5" aria-hidden />
                {n.label}
                <code className="ml-auto font-mono text-[10px] font-normal normal-case text-slate-400">{g.node}</code>
              </p>
              <ul className="relative before:absolute before:bottom-3 before:left-3 before:top-3 before:w-px before:bg-slate-200">
                {g.events.map((ev) => (
                  <TraceEvent key={ev.id} ev={ev} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      {streaming && (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500" role="status">
          <Spinner className="h-3.5 w-3.5" /> Agent is working...
        </p>
      )}
    </div>
  );
}
