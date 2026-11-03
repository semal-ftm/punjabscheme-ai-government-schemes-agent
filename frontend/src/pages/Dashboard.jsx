import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, CalendarClock, ClipboardCheck, FileText, Files, Landmark, MessagesSquare, Search, ShieldCheck,
} from "lucide-react";
import { api } from "../api.js";
import { ErrorState, Skeleton } from "../components/States.jsx";
import { EVENT_TYPES, EventIcon, SourceStatusIcon } from "../components/ChangeMeta.jsx";
import { formatDateTime, timeAgo } from "../lib/format.js";
import { useAsync } from "../lib/useAsync.js";

function StatCard({ label, value, icon: Icon, tone = "navy", hint, to }) {
  const tones = {
    navy: "bg-navy-50 text-navy-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    sky: "bg-sky-50 text-sky-700",
  };
  const body = (
    <>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-2xl font-bold tracking-tight text-navy-900">{value ?? "—"}</p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-4 transition-shadow hover:shadow-lg">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

const QUICK = [
  { to: "/chat", icon: MessagesSquare, title: "Ask the AI", text: "Describe your situation in English, Urdu or Roman Urdu." },
  { to: "/eligibility", icon: ClipboardCheck, title: "Check eligibility", text: "Fill a short form, get a per-criterion verdict." },
  { to: "/schemes", icon: Search, title: "Explore schemes", text: "Browse CM Punjab, department and federal programmes." },
];

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync((signal) => api.stats({ signal }), []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 px-6 py-8 text-white shadow-card sm:px-10 sm:py-10">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-white/15">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Answers grounded in official sources, with citations
        </p>
        <h1 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
          Find the government schemes you can apply for in Punjab
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-navy-200 sm:text-base">
          An AI agent that searches CM Punjab initiatives, Punjab department programmes and federal schemes, checks your
          eligibility against verified rules, and shows exactly how it reached every answer.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/chat" className="btn-primary">
            <MessagesSquare className="h-4 w-4" aria-hidden /> Ask the AI
          </Link>
          <Link to="/eligibility" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
            <ClipboardCheck className="h-4 w-4" aria-hidden /> Check eligibility
          </Link>
        </div>
      </section>

      {error && <ErrorState error={error} onRetry={reload} />}

      {/* Stats */}
      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="sr-only">
          Statistics
        </h2>
        {loading && !data ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card space-y-3 p-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total schemes" value={data.schemes_total} icon={Landmark} to="/schemes" />
            <StatCard label="CM Punjab" value={data.by_category?.cm_punjab} icon={Landmark} tone="emerald" />
            <StatCard label="Punjab Departments" value={data.by_category?.punjab_department} icon={Landmark} tone="sky" />
            <StatCard label="Federal" value={data.by_category?.federal} icon={Landmark} tone="violet" />
            <StatCard label="Verified-rule schemes" value={data.verified_rules} icon={ShieldCheck} tone="emerald" hint="Criteria copied with official quotes" />
            <StatCard label="Documents indexed" value={data.documents} icon={Files} tone="navy" />
          </div>
        ) : null}
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-h">
        <h2 id="quick-h" className="section-title mb-3">
          Quick actions
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK.map(({ to, icon: Icon, title, text }) => (
            <Link key={to} to={to} className="card group flex items-start gap-3 p-5 transition-shadow hover:shadow-lg">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold text-navy-900">
                  {title} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="mt-0.5 block text-sm text-slate-500">{text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Source health */}
        <section className="card p-5" aria-labelledby="sources-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sources-h" className="section-title">
              Official source health
            </h2>
            {data && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Next check: {data.next_update_check ? formatDateTime(data.next_update_check) : "scheduler off"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Shown honestly: some government sites are often down or have certificate problems.
          </p>
          {loading && !data ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : data?.sources?.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.sources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                  <span className="min-w-0 text-sm font-medium text-navy-900">{s.name}</span>
                  <span className="flex items-center gap-3">
                    <SourceStatusIcon status={s.status} />
                    <span className="text-xs text-slate-400">{timeAgo(s.last_checked_at, "never")}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            data && <p className="mt-4 muted">No sources registered.</p>
          )}
        </section>

        {/* Recent changes */}
        <section className="card p-5" aria-labelledby="changes-h">
          <div className="flex items-center justify-between gap-2">
            <h2 id="changes-h" className="section-title">
              Recent changes
            </h2>
            <Link to="/updates" className="text-sm link">
              View all
            </Link>
          </div>
          {data?.pending_review > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {data.pending_review} change(s) pending human re-verification
            </p>
          )}
          {loading && !data ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data?.recent_events?.length ? (
            <ul className="mt-4 space-y-3">
              {data.recent_events.map((e) => {
                const t = EVENT_TYPES[e.event_type] || EVENT_TYPES.default;
                return (
                  <li key={e.id} className="flex gap-3">
                    <EventIcon type={e.event_type} />
                    <div className="min-w-0">
                      <p className="text-sm text-navy-900" dir="auto">
                        {e.summary}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.label} · {timeAgo(e.detected_at)}
                        {e.severity === "significant" && <span className="font-semibold text-rose-600"> · significant</span>}
                        {e.scheme_id && (
                          <>
                            {" "}·{" "}
                            <Link to={`/schemes/${encodeURIComponent(e.scheme_id)}`} className="link">
                              scheme
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            data && (
              <p className="mt-4 flex items-center gap-2 muted">
                <FileText className="h-4 w-4" aria-hidden /> No changes detected yet.
              </p>
            )
          )}
        </section>
      </div>

      {data?.by_status && Object.keys(data.by_status).length > 0 && (
        <section className="card p-5" aria-labelledby="status-h">
          <h2 id="status-h" className="section-title">
            Application status across schemes
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            A scheme is only marked Open, Upcoming or Closed when official dates are confirmed. Everything else is
            "Unverified".
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.by_status).map(([st, n]) => (
              <Link
                key={st}
                to={`/schemes?status=${encodeURIComponent(st)}`}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:border-navy-300"
              >
                <span className="font-bold text-navy-900">{n}</span> <span className="text-slate-600">{st}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
