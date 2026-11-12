import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Bot, ChevronDown, Lightbulb, MessageSquarePlus, PanelRightOpen, RefreshCw, Send, Sparkles, Square, UserRound, Workflow, X,
} from "lucide-react";
import { api, streamChat } from "../api.js";
import CitationList from "../components/CitationList.jsx";
import EligibilityCard from "../components/EligibilityCard.jsx";
import MarkdownMessage from "../components/MarkdownMessage.jsx";
import { ErrorState, Spinner } from "../components/States.jsx";
import TraceTimeline from "../components/TraceTimeline.jsx";
import { EXAMPLE_PROMPTS, VERDICTS, fieldLabel } from "../lib/constants.js";
import { formatValue, urduClass } from "../lib/format.js";
import { KEYS, readJSON, writeJSON } from "../lib/storage.js";
import { useUser } from "../lib/UserContext.jsx";

const MAX_LEN = 2000; // ChatRequest.message max_length

// Starter text placed in the input when the user clicks a follow-up question.
const REPLY_PREFIX = {
  age: "I am ",
  gender: "My gender is ",
  province: "My domicile is ",
  district: "I live in ",
  area_type: "I live in a (urban / rural) area: ",
  education_level: "My education level is ",
  currently_enrolled: "Am I currently enrolled? ",
  monthly_household_income: "Our monthly household income is about PKR ",
  employment_type: "The main earner works as ",
  registered_with_pessi: "PESSI registration: ",
  registered_industrial_worker: "Registered industrial worker (Punjab Workers Welfare Fund): ",
  current_semester: "I am in semester ",
  institution_type: "My institution is (public / private): ",
  intermediate_marks_percent: "My Intermediate marks were (%) ",
  received_laptop_before: "Received a government laptop before: ",
  has_driving_licence: "Driving licence / learner's permit: ",
  marital_status: "My marital status is ",
  land_acres: "I own (acres of agricultural land) ",
  bisp_beneficiary: "BISP beneficiary: ",
  owns_plot: "Do I own a plot? ",
  plot_size_marla: "My plot size is (marla) ",
  has_disability: "Disability certificate: ",
};

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function loadStored() {
  const s = readJSON("session", KEYS.chat, null);
  if (!s || !Array.isArray(s.messages)) return { sessionId: null, messages: [] };
  // A message that was streaming when the page closed can never finish.
  const messages = s.messages.map((m) =>
    m.status === "streaming" ? { ...m, status: "error", error: { message: "Interrupted: the page was reloaded while the agent was answering." } } : m
  );
  return { sessionId: s.sessionId || null, messages };
}

/** Citations for messages loaded from history (no `final`): rebuilt from the trace's answer event. */
function citationsOf(m) {
  if (m.final?.citations) return m.final.citations;
  const ev = (m.trace || []).find((e) => e.type === "answer" && Array.isArray(e.data));
  return ev ? ev.data.map((c) => ({ ...c, kind: "source", date: null })) : [];
}

function PlanUpdatedBanner({ changes }) {
  if (!changes?.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-1.5 font-semibold">
        <RefreshCw className="h-4 w-4" aria-hidden /> Plan updated: recommendations changed
      </p>
      <ul className="mt-1.5 space-y-1">
        {changes.map((c) => (
          <li key={c.scheme_id} className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{c.name}:</span>
            <span className="text-amber-800">{c.old}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            <strong>{c.new}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EligibilityResults({ results }) {
  const [showNot, setShowNot] = useState(false);
  if (!results?.length) return null;
  const main = results.filter((r) => r.verdict !== VERDICTS.NOT_ELIGIBLE);
  const not = results.filter((r) => r.verdict === VERDICTS.NOT_ELIGIBLE);
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Eligibility check ({results.length} scheme{results.length === 1 ? "" : "s"}, deterministic rules)
      </p>
      {main.map((r) => (
        <EligibilityCard key={r.scheme_id} result={r} />
      ))}
      {not.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowNot((s) => !s)}
            aria-expanded={showNot}
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-navy-900"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showNot ? "rotate-180" : ""}`} aria-hidden />
            {showNot ? "Hide" : "Show"} {not.length} not eligible based on known rules
          </button>
          {showNot && not.map((r) => <EligibilityCard key={r.scheme_id} result={r} />)}
        </>
      )}
    </div>
  );
}

function AssistantMessage({ m, selected, onSelect, onCite, activeCite, onQuickReply, onRetry }) {
  const citations = citationsOf(m);
  const validCites = useMemo(() => new Set(citations.map((c) => c.n)), [citations]);
  const lastEvent = m.trace?.[m.trace.length - 1];
  const final = m.final;

  return (
    <div className="flex gap-3">
      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden>
        <Bot className="h-4 w-4" />
      </span>
      <div
        className={`min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-white p-4 shadow-card transition-shadow ${
          selected ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"
        }`}
      >
        {m.status === "streaming" && !m.content && (
          <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <Spinner />
            <span className="truncate">{lastEvent ? lastEvent.title : "Connecting to the agent..."}</span>
          </div>
        )}
        {m.content && <MarkdownMessage text={m.content} validCites={validCites} onCite={(n) => onCite(m.id, n)} />}
        {m.status === "error" && (
          <div className="mt-2">
            <ErrorState error={m.error} onRetry={onRetry} compact />
          </div>
        )}

        <PlanUpdatedBanner changes={final?.verdict_changes?.changed} />
        <CitationList citations={citations} idPrefix={`msg-${m.id}`} activeN={activeCite?.msgId === m.id ? activeCite.n : null} />
        <EligibilityResults results={final?.eligibility} />

        {final?.questions?.length > 0 && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-900">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Answering these would unlock more results
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {final.questions.map((q) => (
                <button
                  key={q.field}
                  type="button"
                  onClick={() => onQuickReply(q)}
                  className="rounded-full border border-sky-300 bg-white px-3 py-1 text-left text-xs font-medium text-sky-900 hover:bg-sky-100"
                  title={`Affects ${q.unblocks} scheme(s)`}
                >
                  {q.question}
                </button>
              ))}
            </div>
          </div>
        )}

        {(m.trace?.length > 0 || m.status === "streaming") && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <button type="button" onClick={() => onSelect(m.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
              <Workflow className="h-3.5 w-3.5" aria-hidden /> How I got this answer ({m.trace?.length || 0} steps)
            </button>
            {final?.elapsed_ms != null && <span className="text-xs text-slate-400">{(final.elapsed_ms / 1000).toFixed(1)}s</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ m }) {
  return (
    <div data-msg-id={m.id} className="flex justify-end gap-3">
      <div dir="auto" className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-plum-100 px-4 py-2.5 text-[0.95rem] text-plum-900 ${urduClass(m.content)}`}>
        {m.content}
      </div>
      <span className="mt-1 hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-navy-700 sm:grid" aria-hidden>
        <UserRound className="h-4 w-4" />
      </span>
    </div>
  );
}

function TransparencyPanel({ message, onClose }) {
  const profile = message?.final?.profile;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
            <Workflow className="h-4 w-4 text-emerald-600" aria-hidden /> How I got this answer
          </h2>
          <p className="text-[11px] text-slate-500">Live agent trace: memory, plan, MCP tools, RAG, reflection</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close trace panel">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scroll-thin">
        {profile && Object.keys(profile).length > 0 && (
          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
            <p className="text-xs font-semibold text-violet-900">Facts the agent is using (this session)</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Object.entries(profile).map(([k, v]) => (
                <span key={k} className="rounded-md bg-white px-1.5 py-0.5 text-[11px]">
                  <span className="text-slate-500">{fieldLabel(k)}:</span> <span className="font-medium text-navy-800">{formatValue(v)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <TraceTimeline
          events={message?.trace || []}
          final={message?.final}
          streaming={message?.status === "streaming"}
          startedAt={message?.startedAt}
        />
      </div>
    </div>
  );
}

export default function Chat() {
  const { userId } = useUser();
  const [params, setParams] = useSearchParams();
  const initial = useMemo(loadStored, []);
  const [sessionId, setSessionId] = useState(initial.sessionId);
  const [messages, setMessages] = useState(initial.messages);
  const [input, setInput] = useState(() => params.get("q") || "");
  const [selectedId, setSelectedId] = useState(() => [...initial.messages].reverse().find((m) => m.role === "assistant")?.id || null);
  const [activeCite, setActiveCite] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ loading: false, error: null });
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottom = useRef(true);
  // Id of the question just sent: keep it pinned at the top so the answer is read from its start.
  const anchorId = useRef(null);
  const autoSend = useRef(null); // ?q=...&send=1 from the Home search box

  const streaming = messages.some((m) => m.status === "streaming");
  const selected = messages.find((m) => m.id === selectedId) || null;

  // Persist the current session (skip while streaming: too many writes, and incomplete anyway).
  useEffect(() => {
    if (!streaming) writeJSON("session", KEYS.chat, { sessionId, messages });
  }, [sessionId, messages, streaming]);

  // Abort an in-flight stream when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // ?q= prefill (e.g. "Ask AI about this scheme")
  useEffect(() => {
    const q = params.get("q");
    if (q) {
      if (params.get("send") === "1") autoSend.current = q;
      else {
        setInput(q);
        inputRef.current?.focus();
      }
      params.delete("q");
      params.delete("send");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // ?session= loads a past conversation from the server (Saved page link).
  useEffect(() => {
    const sid = params.get("session");
    if (!sid) return undefined;
    const ctrl = new AbortController();
    setHistoryState({ loading: true, error: null });
    api
      .sessionMessages(sid, { signal: ctrl.signal })
      .then((rows) => {
        const loaded = rows.map((r) => ({
          id: newId(), role: r.role, content: r.content, trace: r.trace || [], status: "done", fromHistory: true,
        }));
        abortRef.current?.abort();
        setMessages(loaded);
        setSessionId(sid);
        setSelectedId([...loaded].reverse().find((m) => m.role === "assistant")?.id || null);
        setHistoryState({ loading: false, error: null });
        params.delete("session");
        setParams(params, { replace: true });
      })
      .catch((err) => {
        if (err.name !== "AbortError") setHistoryState({ loading: false, error: err });
      });
    return () => ctrl.abort();
  }, [params, setParams]);

  // After sending, pin the new question to the top of the list so the answer shows from its beginning
  // (the browser clamps scrollTop, so a short answer simply stays fully visible). Re-applied while the
  // answer grows until the user scrolls by hand. Without an anchor (e.g. a loaded conversation), show the end.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (anchorId.current) {
      const q = el.querySelector(`[data-msg-id="${anchorId.current}"]`);
      if (q) el.scrollTop = q.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 16;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const releaseAnchor = () => {
    anchorId.current = null;
    stickToBottom.current = false;
  };

  const patch = useCallback((id, fn) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...fn(m) } : m))), []);

  const send = useCallback(
    async (raw) => {
      const text = (raw ?? "").trim().slice(0, MAX_LEN);
      if (!text || streaming) return;
      const userMsg = { id: newId(), role: "user", content: text };
      const botId = newId();
      const botMsg = { id: botId, role: "assistant", content: "", trace: [], status: "streaming", startedAt: Date.now(), question: text };
      setMessages((ms) => [...ms, userMsg, botMsg]);
      setSelectedId(botId);
      setInput("");
      anchorId.current = userMsg.id;
      stickToBottom.current = false;

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        await streamChat({
          message: text,
          sessionId,
          userId,
          signal: ctrl.signal,
          onSession: (s) => s?.session_id && setSessionId(s.session_id),
          onTrace: (ev) => patch(botId, (m) => ({ trace: [...m.trace, ev] })),
          onFinal: (final) =>
            patch(botId, (m) => ({
              status: "done",
              content: final.answer || "_The agent returned an empty answer._",
              final,
              trace: final.trace?.length ? final.trace : m.trace,
            })),
        });
      } catch (err) {
        if (err.name === "AbortError") {
          patch(botId, (m) => ({ status: "error", content: m.content, error: { message: "Stopped. You can ask again." } }));
        } else {
          patch(botId, () => ({ status: "error", error: { message: err.message, unreachable: err.unreachable } }));
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [streaming, sessionId, userId, patch]
  );

  useEffect(() => {
    if (autoSend.current && !streaming) {
      const q = autoSend.current;
      autoSend.current = null;
      send(q);
    }
  }, [send, streaming]);

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setSelectedId(null);
    setActiveCite(null);
    setInput("");
    setHistoryState({ loading: false, error: null });
    writeJSON("session", KEYS.chat, null);
    inputRef.current?.focus();
  };

  const onCite = (msgId, n) => {
    setActiveCite({ msgId, n, at: Date.now() });
    requestAnimationFrame(() =>
      document.getElementById(`msg-${msgId}-src-${n}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  };

  const selectTrace = (id) => {
    setSelectedId(id);
    setPanelOpen(true); // only visible below lg; the desktop panel is always shown
  };

  const onQuickReply = (q) => {
    setInput(REPLY_PREFIX[q.field] || "");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-cream-50 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-navy-900">
              <Sparkles className="h-5 w-5 shrink-0 text-gold-500" aria-hidden /> AI Assistant
            </h1>
            <p className="truncate text-xs text-slate-500">
              English, اردو or Roman Urdu · {userId ? `signed in as ${userId}` : "anonymous (pick a username to remember you)"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setPanelOpen(true)} className="btn-secondary !px-3 lg:hidden" aria-label="Show how I got this answer">
              <PanelRightOpen className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Trace</span>
            </button>
            <button type="button" onClick={newChat} className="btn-secondary !px-3">
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
        </div>

        <div
          ref={listRef}
          onScroll={(e) => {
            if (anchorId.current) return; // programmatic scroll while a question is pinned
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          // Any manual scroll stops the pinning so the user can read freely.
          onWheel={releaseAnchor}
          onTouchMove={releaseAnchor}
          onKeyDown={(e) => {
            if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) releaseAnchor();
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) releaseAnchor(); // dragging the scrollbar
          }}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        >
          <div className="mx-auto max-w-3xl space-y-5">
            {historyState.loading && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner /> Loading conversation...
              </p>
            )}
            {historyState.error && <ErrorState error={historyState.error} compact />}

            {messages.length === 0 && !historyState.loading && (
              <div className="py-6 text-center">
                <img src="/img/chat.webp" alt="" className="mx-auto h-28 w-28 rounded-3xl object-cover shadow-card ring-1 ring-slate-200" />
                <h2 className="mt-4 font-display text-2xl font-semibold text-navy-900">Ask about government schemes in Punjab</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                  Tell me about yourself (age, district, education, work) and I will find matching CM Punjab, Punjab
                  department and federal schemes, check eligibility against the official rules and cite every source.
                  Never share your CNIC, phone or bank details: they are not needed.
                </p>
                <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {EXAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      dir="auto"
                      className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-navy-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <UserMessage key={m.id} m={m} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  m={m}
                  selected={m.id === selectedId}
                  onSelect={selectTrace}
                  onCite={onCite}
                  activeCite={activeCite}
                  onQuickReply={onQuickReply}
                  onRetry={
                    m.status === "error" && !streaming
                      ? () => send(m.question || messages[i - 1]?.content)
                      : undefined
                  }
                />
              )
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {messages.length > 0 && (
              <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 scroll-thin" aria-label="Example prompts">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={streaming}
                    onClick={() => send(p)}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-navy-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="chat-input" className="sr-only">
                Your message
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                dir="auto"
                rows={1}
                placeholder="Ask in English, اردو or Roman Urdu..."
                className={`input max-h-40 min-h-[44px] resize-none py-2.5 ${urduClass(input)}`}
                style={{ height: `${Math.min(160, 44 + Math.max(0, input.split("\n").length - 1) * 22)}px` }}
              />
              {streaming ? (
                <button type="button" onClick={() => abortRef.current?.abort()} className="btn-secondary h-11 shrink-0 !px-3" aria-label="Stop">
                  <Square className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="btn-primary h-11 shrink-0 !px-4" aria-label="Send">
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              )}
            </form>
            <p className="mt-1.5 flex justify-between gap-2 text-[11px] text-slate-400">
              <span>
                Guidance only. Confirm on the official portal. <Link to="/eligibility" className="underline hover:text-navy-700">Prefer a form?</Link>
              </span>
              {input.length > MAX_LEN - 200 && <span>{input.length}/{MAX_LEN}</span>}
            </p>
          </div>
        </div>
      </section>

      {/* Desktop transparency panel */}
      <aside className="hidden w-[400px] shrink-0 border-l border-slate-200 bg-slate-50 lg:block xl:w-[440px]" aria-label="How I got this answer">
        <TransparencyPanel message={selected} />
      </aside>

      {/* Mobile slide-over */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="How I got this answer">
          <button type="button" className="absolute inset-0 bg-navy-950/50" aria-label="Close trace panel" onClick={() => setPanelOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-slate-50 shadow-2xl">
            <TransparencyPanel message={selected} onClose={() => setPanelOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
