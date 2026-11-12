import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BrainCircuit, Database, FileSearch, GitBranch, Lightbulb, ListChecks, MessageSquareText,
  Play, Repeat2, Send, Wrench,
} from "lucide-react";
import { streamChat } from "../../api.js";
import MarkdownMessage from "../MarkdownMessage.jsx";

const STAGES = [
  { key: "memory", nodes: ["load_context", "update_profile"], label: "Memory", icon: Database },
  { key: "understand", nodes: ["understand"], label: "Understand", icon: BrainCircuit },
  { key: "plan", nodes: ["plan"], label: "Plan", icon: ListChecks },
  { key: "act", nodes: ["act"], label: "MCP tools", icon: Wrench },
  { key: "reflect", nodes: ["reflect"], label: "Reflect", icon: Lightbulb },
  { key: "retrieve", nodes: ["retrieve"], label: "RAG search", icon: FileSearch },
  { key: "answer", nodes: ["answer"], label: "Answer", icon: MessageSquareText },
];
const stageOf = (node) => STAGES.findIndex((s) => s.nodes.includes(node));

const EVENT_ICON = {
  tool_call: Wrench, tool_result: Wrench, retrieval: FileSearch, plan: ListChecks, replan: GitBranch,
  memory: Database, understanding: BrainCircuit, reflection: Lightbulb, answer: MessageSquareText,
  warning: AlertTriangle, error: AlertTriangle,
};

const DEMO = "I am a matric student from Lahore. Which schemes can I apply for?";
const CHANGE = "Actually, I'm a university student.";

/** "Watch the AI think": streams a real agent run and lights up each LangGraph stage as it happens. */
export default function AgentLive() {
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [custom, setCustom] = useState("");
  const [turn, setTurn] = useState(null); // "1 of 2" during the replanning demo
  const abort = useRef(null);
  const feed = useRef(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!running) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    return () => clearInterval(id);
  }, [running, question]);
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [events]);

  const ask = async (message, sessionId, ctrl) => {
    setQuestion(message);
    setEvents([]);
    setAnswer(null);
    let sid = sessionId;
    const final = await streamChat({
      message,
      sessionId,
      signal: ctrl.signal,
      onSession: (s) => (sid = s?.session_id || sid),
      onTrace: (ev) => setEvents((list) => [...list, ev]),
    });
    setAnswer(final);
    return sid;
  };

  const run = async (messages) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRunning(true);
    setError(null);
    try {
      let sid = null;
      for (let i = 0; i < messages.length; i += 1) {
        setTurn(messages.length > 1 ? `${i + 1} of ${messages.length}` : null);
        sid = await ask(messages[i], sid, ctrl);
      }
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (abort.current === ctrl) setRunning(false);
    }
  };

  const latest = events[events.length - 1];
  const activeIdx = running && latest ? stageOf(latest.node) : -1;
  const seen = new Set(events.map((e) => stageOf(e.node)));
  const tools = events.filter((e) => e.type === "tool_call").length;
  const docs = events.filter((e) => e.type === "retrieval").reduce((n, e) => n + (Array.isArray(e.data) ? e.data.length : 0), 0);
  const replan = events.find((e) => e.type === "replan" && /->|→/.test(e.title));
  const started = events.length > 0 || running;

  return (
    <section className="card folk-top relative overflow-hidden" aria-labelledby="live-h">
      <div className="jaali-dark relative p-5 text-cream-50 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${running ? "animate-ping" : ""}`} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live agent
            </p>
            <h2 id="live-h" className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">Watch the AI think</h2>
            <p className="mt-1 max-w-xl text-sm text-cream-200/80">
              Every step of the LangGraph agent, live: memory, planning, MCP tool calls, reflection, RAG over official documents
              and the cited answer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={running} onClick={() => run([DEMO])} className="btn bg-gold-400 text-navy-950 hover:bg-gold-300">
              <Play className="h-4 w-4" aria-hidden /> Try a demo question
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => run([DEMO, CHANGE])}
              className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
              title={`Asks "${DEMO}" and then "${CHANGE}"`}
            >
              <Repeat2 className="h-4 w-4" aria-hidden /> Watch it change its mind
            </button>
          </div>
        </div>

        {/* Stage track */}
        <div className="relative">
        {/* Glowing "data" dot travelling between the first and last stage */}
        <span className="pointer-events-none absolute left-[7.14%] right-[7.14%] top-[2.75rem] z-[5] h-0.5" aria-hidden>
          <span className={`agent-dot ${running ? "agent-dot-fast" : ""}`} />
          <span className={`agent-dot ${running ? "agent-dot-fast" : ""}`} style={{ animationDelay: running ? "-0.7s" : "-2.2s" }} />
        </span>
        <ol className="mt-6 grid grid-cols-7 gap-1" aria-label="Agent stages">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = i === activeIdx;
            const done = seen.has(i) && !active;
            return (
              <li key={s.key} className="relative flex flex-col items-center text-center">
                {i > 0 && (
                  <span
                    className={`absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2 ${seen.has(i) ? "bg-gradient-to-r from-gold-400 to-emerald-400" : "bg-white/15"}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 grid h-10 w-10 place-items-center rounded-full ring-2 transition-all duration-300 sm:h-11 sm:w-11 ${
                    active
                      ? "scale-110 bg-gold-400 text-navy-950 ring-gold-200 shadow-[0_0_24px_rgba(212,166,74,0.8)]"
                      : done
                        ? "bg-emerald-500 text-white ring-emerald-300"
                        : "bg-white/10 text-cream-200/60 ring-white/15"
                  }`}
                >
                  {active && <span className="absolute inset-0 animate-ping rounded-full bg-gold-400/40" aria-hidden />}
                  <Icon className="relative h-5 w-5" aria-hidden />
                </span>
                <span className={`mt-2 text-[10px] font-semibold leading-tight sm:text-xs ${active ? "text-gold-300" : done ? "text-emerald-200" : "text-cream-200/50"}`}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
        </div>

        {/* Counters */}
        {started && (
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {turn && <span className="rounded-full bg-plum-500/30 px-3 py-1 font-semibold text-plum-100 ring-1 ring-plum-300/40">Message {turn}</span>}
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">⏱ {elapsed.toFixed(1)}s</span>
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">🔧 {tools} MCP calls</span>
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">📄 {docs} official excerpts</span>
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">🧠 {events.length} steps</span>
          </div>
        )}
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        {/* Event feed */}
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          {question ? (
            <p className="mb-3 rounded-2xl rounded-tr-md bg-plum-100 px-3 py-2 text-sm text-plum-900">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-plum-500">You</span> {question}
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) run([custom.trim()]);
              }}
              className="mb-3 flex gap-2"
            >
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                dir="auto"
                placeholder="…or type your own question"
                className="input"
                aria-label="Your own question for the live agent"
              />
              <button type="submit" disabled={running || !custom.trim()} className="btn-primary !px-3" aria-label="Run">
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          )}
          {replan && (
            <div className="fade-up mb-3 flex items-center gap-2 rounded-xl border border-plum-200 bg-plum-50 px-3 py-2 text-sm font-semibold text-plum-800">
              <GitBranch className="h-4 w-4" aria-hidden /> {replan.title}
            </div>
          )}
          <ol ref={feed} className="max-h-72 space-y-2 overflow-y-auto pr-1 scroll-thin" aria-live="polite">
            {!started && (
              <li className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Press <b>Try a demo question</b>. Each step the agent takes will appear here as it happens.
              </li>
            )}
            {events.map((e) => {
              const Icon = EVENT_ICON[e.type] || BrainCircuit;
              const hot = e.type === "replan";
              return (
                <li key={`${question}-${e.id}`} className={`fade-up flex gap-2.5 rounded-xl border px-3 py-2 ${hot ? "border-plum-200 bg-plum-50/70" : "border-slate-200 bg-cream-50"}`}>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${hot ? "text-plum-600" : e.type?.startsWith("tool") ? "text-gold-500" : "text-emerald-700"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">{e.title}</p>
                    {e.detail && <p className="line-clamp-2 text-xs text-slate-500">{e.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Answer */}
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Answer</p>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {!answer && !error && (
            <div className="space-y-2" aria-hidden>
              {[90, 75, 82, 60].map((w, i) => (
                <div key={i} className={`h-3 rounded bg-slate-200/70 ${running ? "animate-pulse" : ""}`} style={{ width: `${w}%` }} />
              ))}
              <p className="pt-2 text-xs text-slate-400">{running ? "The agent is working…" : "The cited answer will appear here."}</p>
            </div>
          )}
          {answer && (
            <div className="fade-up">
              <div className="relative max-h-72 overflow-hidden">
                <MarkdownMessage text={answer.answer} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cream-50 to-transparent" />
              </div>
              <Link to="/chat" className="link mt-3 inline-flex items-center gap-1 text-sm">
                Continue in AI Assistant <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
