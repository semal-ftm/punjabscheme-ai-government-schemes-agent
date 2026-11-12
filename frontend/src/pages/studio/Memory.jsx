import HowItWorks from "./HowItWorks.jsx";
import { Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Clock, Database, HardDrive, MessageSquare, Trash2, UserRound, Users, X } from "lucide-react";
import { studioApi } from "../../api.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import MarkdownMessage from "../../components/MarkdownMessage.jsx";
import { CardSkeleton, ErrorState } from "../../components/States.jsx";
import { fieldLabel } from "../../lib/constants.js";
import { formatValue, timeAgo } from "../../lib/format.js";
import { useAsync } from "../../lib/useAsync.js";
import { JsonView, Metric, Panel } from "./ui.jsx";

function SessionDrawer({ id, onClose }) {
  const { data, error, loading } = useAsync((signal) => studioApi.memorySession(id, { signal }), [id]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Session">
      <button type="button" className="absolute inset-0 bg-navy-950/30" onClick={onClose} aria-label="Close" />
      <div className="fade-up relative flex h-full w-full max-w-2xl flex-col bg-cream-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-navy-900">Session</p>
            <p className="truncate font-mono text-xs text-slate-500">{id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/chat?session=${encodeURIComponent(id)}`} className="btn-secondary !py-1.5 text-xs">Open in chat</Link>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-cream-300" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 scroll-thin">
          {loading && <CardSkeleton lines={6} />}
          {error && <ErrorState error={error} />}
          {data && (
            <>
              <div className="rounded-xl border border-plum-200 bg-plum-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-plum-700">Short-term memory (LangGraph checkpointer)</p>
                {data.short_term?.messages_in_memory ? (
                  <div className="mt-2"><JsonView value={data.short_term} maxHeight="max-h-60" /></div>
                ) : (
                  <p className="mt-1 text-xs text-slate-600">Not in process memory (the API restarted since, or this session ended). Long-term messages are below.</p>
                )}
              </div>
              <ol className="space-y-3">
                {data.messages.map((m, i) => (
                  <li key={i} className={`rounded-xl p-3 ${m.role === "user" ? "ml-10 bg-plum-100/70" : "mr-6 border border-slate-200 bg-white/70"}`}>
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                      {m.role === "user" ? "User" : "Assistant"} · {timeAgo(m.created_at)}
                      {m.trace && ` · ${m.trace.length} trace events`}
                    </p>
                    {m.role === "user" ? <p className="text-sm" dir="auto">{m.content}</p> : <MarkdownMessage text={m.content} />}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Memory() {
  const { data, error, loading, reload } = useAsync((signal) => studioApi.memory({ signal }), []);
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    setBusy(true);
    try {
      await studioApi.deleteSession(confirm);
      setConfirm(null);
      reload({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <CardSkeleton lines={6} />;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <HowItWorks
        image="/img/studio-memory.webp"
        title="Memory — short-term and long-term"
        summary="Short-term memory keeps one conversation coherent. Long-term memory remembers a user across days, but only with their permission."
        steps={[
          { icon: MessageSquare, title: "Each message", text: "Every turn is stored in the session's LangGraph state: messages, profile facts, recently mentioned schemes and last verdicts.", example: `${t.short_term_threads ?? 0} live session thread(s) in RAM` },
          { icon: Link2, title: "Follow-ups", text: "“What documents do I need for the second one?” works because the agent resolves “the second one” from recent_schemes in short-term memory." },
          { icon: RefreshCw, title: "Corrections", text: "If the user changes a fact (matric → university), the newest value wins and the agent replans and re-checks eligibility." },
          { icon: ShieldCheck, title: "Consent", text: "Only when “Remember my profile” is ON are eligibility facts saved to SQLite. Never CNIC, phone or bank details.", example: `${t.consenting_users} of ${t.users} users gave consent` },
          { icon: Database, title: "Next visit", text: "A new chat with the same username loads the saved profile and the previous conversation summary automatically.", example: `${t.saved_profiles} saved profiles · ${t.sessions} conversations stored` },
        ]}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric icon={MessageSquare} label="Sessions" value={t.sessions} />
        <Metric icon={Clock} label="Messages" value={t.messages} tone="gold" />
        <Metric icon={Brain} label="Live threads (RAM)" value={t.short_term_threads ?? "—"} tone="plum" hint="short-term checkpoints" />
        <Metric icon={Users} label="Users" value={t.users} tone="ink" />
        <Metric icon={UserRound} label="Saved profiles" value={t.saved_profiles} hint={`${t.consenting_users} with consent`} />
        <Metric icon={HardDrive} label="Saved schemes" value={t.saved_schemes} tone="gold" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Short-term memory", Brain, data.short_term, "bg-plum-50 text-plum-700", "Lets follow-ups like “documents for the second one?” resolve within a conversation."],
          ["Long-term memory", Database, data.long_term, "bg-emerald-50 text-emerald-700", "Remembers eligibility facts across sessions, only after the user switches on “Remember my profile”."],
        ].map(([title, Icon, m, tone, why]) => (
          <div key={title} className="card p-5">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
              <div>
                <h3 className="font-semibold text-navy-900">{title}</h3>
                <p className="text-xs text-slate-500">{m.store}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-navy-700">{why}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.keeps.map((k) => <span key={k} className="pill bg-cream-200 text-navy-700">{k}</span>)}
            </div>
          </div>
        ))}
      </div>

      <Panel title="Conversations" icon={MessageSquare} sub="Click a session to see messages, traces and its short-term state.">
        {data.conversations.length ? (
          <ul className="divide-y divide-slate-100">
            {data.conversations.map((c) => (
              <li key={c.session_id} className="flex items-center gap-3 py-2.5">
                <button type="button" onClick={() => setOpen(c.session_id)} className="min-w-0 flex-1 rounded-lg p-1 text-left hover:bg-cream-200">
                  <p className="truncate text-sm font-medium text-navy-900">{c.summary || "Conversation"}</p>
                  <p className="text-[11px] text-slate-500">
                    {c.user_id ? <span className="font-medium text-plum-700">{c.user_id}</span> : c.session_id.startsWith("sim-") ? "simulation" : "anonymous"} · {c.messages} messages · {timeAgo(c.last_message_at)}
                  </p>
                </button>
                <button type="button" onClick={() => setConfirm(c.session_id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete session">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No conversations yet. Ask the <Link to="/chat" className="link">AI Assistant</Link> something.</p>
        )}
      </Panel>

      <Panel title="Users & saved profiles" icon={Users} sub="Pseudonymous usernames. Profiles hold eligibility facts only — never CNIC, phone or bank details.">
        {data.users.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.users.map((u) => (
              <div key={u.user_id} className="rounded-xl border border-slate-200 bg-white/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-semibold text-navy-900">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-plum-600 text-xs font-bold uppercase text-white">{u.user_id[0]}</span>
                    {u.user_id}
                  </p>
                  <span className={`pill ${u.consent_to_store ? "bg-emerald-50 text-emerald-800" : "bg-cream-200 text-slate-600"}`}>
                    {u.consent_to_store ? "remembers profile" : "no consent"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{u.sessions} sessions · {u.saved} saved schemes · seen {timeAgo(u.last_seen_at)}</p>
                {Object.keys(u.profile).length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {Object.entries(u.profile).map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="truncate text-slate-400">{fieldLabel(k)}</dt>
                        <dd className="truncate font-medium text-navy-800">{formatValue(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No users yet. Pick a username from the avatar menu (top right).</p>
        )}
      </Panel>

      {open && <SessionDrawer id={open} onClose={() => setOpen(null)} />}
      <ConfirmDialog open={!!confirm} title="Delete this conversation?" confirmLabel="Delete" danger busy={busy} onConfirm={del} onCancel={() => setConfirm(null)}>
        Removes its messages and traces from SQLite and clears its short-term checkpoint.
      </ConfirmDialog>
    </div>
  );
}
