import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, Files, Globe2, Landmark, PartyPopper, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { ErrorState, Skeleton } from "../components/States.jsx";
import { EVENT_TYPES, EventIcon, SourceStatusIcon } from "../components/ChangeMeta.jsx";
import { formatDateTime, timeAgo } from "../lib/format.js";
import { useAsync } from "../lib/useAsync.js";
import Hero, { MatchesPanel } from "../components/dashboard/Hero.jsx";
import { useUser } from "../lib/UserContext.jsx";
import QuickStart from "../components/dashboard/QuickStart.jsx";
import OpenNow from "../components/dashboard/OpenNow.jsx";
import LifeNeeds from "../components/dashboard/LifeNeeds.jsx";
import AgentPulse from "../components/dashboard/AgentPulse.jsx";
import { CountUp } from "../components/dashboard/Animated.jsx";
import FeaturedSchemes from "../components/FeaturedSchemes.jsx";

const MIX = [
  { key: "cm_punjab", label: "CM Punjab", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "punjab_department", label: "Punjab Departments", bar: "bg-sky-500", dot: "bg-sky-500" },
  { key: "federal", label: "Federal", bar: "bg-violet-500", dot: "bg-violet-500" },
];

function KeyNumber({ icon: Icon, value, label, hint, tint, to }) {
  const body = (
    <>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tint}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-3xl font-extrabold leading-none tracking-tight text-navy-900">
          <CountUp value={value} />
        </span>
        <span className="mt-1 block text-sm font-medium text-slate-600">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </>
  );
  const cls = "flex items-center gap-4 p-5";
  return to ? (
    <Link to={to} className={`${cls} transition hover:bg-slate-50`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function NumbersStrip({ data, loading }) {
  if (loading && !data) return <Skeleton className="h-44 rounded-3xl" />;
  if (!data) return null;
  const total = data.schemes_total || 0;
  const online = (data.sources || []).filter((s) => s.status === "ok").length;
  return (
    <section aria-label="Key numbers" className="card overflow-hidden rounded-3xl">
      <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x xl:grid-cols-4 xl:divide-y-0">
        <KeyNumber icon={Landmark} value={total} label="Schemes tracked" hint="Across 3 government levels" tint="bg-navy-50 text-navy-700" to="/schemes" />
        <KeyNumber icon={ShieldCheck} value={data.verified_rules} label="With verified rules" hint="Each rule quotes the official page" tint="bg-emerald-50 text-emerald-700" to="/schemes?verified=1" />
        <KeyNumber icon={Files} value={data.documents} label="Official documents" hint="Pages & PDFs the AI can cite" tint="bg-violet-50 text-violet-700" />
        <KeyNumber icon={Globe2} value={online} label={`of ${data.sources?.length || 0} sources online`} hint="Checked automatically" tint="bg-sky-50 text-sky-700" to="/updates" />
      </div>
      {total > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-200" role="img" aria-label="Schemes by category">
            {MIX.map((m) => {
              const n = data.by_category?.[m.key] || 0;
              return (
                <Link
                  key={m.key}
                  to={`/schemes?category=${m.key}`}
                  className={`${m.bar} h-full transition-all duration-1000 first:rounded-l-full last:rounded-r-full hover:brightness-110`}
                  style={{ width: `${(n / total) * 100}%` }}
                  title={`${m.label}: ${n}`}
                />
              );
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {MIX.map((m) => (
              <Link key={m.key} to={`/schemes?category=${m.key}`} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-navy-900">
                <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
                {m.label} <b className="text-navy-900">{data.by_category?.[m.key] ?? 0}</b>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SourceHealth({ data, loading }) {
  return (
    <section className="card rounded-3xl p-6" aria-labelledby="sources-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sources-h" className="section-title">Official source health</h2>
        {data && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Next check: {data.next_update_check ? formatDateTime(data.next_update_check) : "scheduler off"}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">Shown honestly: some government sites are often down or have certificate problems.</p>
      {loading && !data ? (
        <div className="mt-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : data?.sources?.length ? (
        <ul className="mt-4 space-y-2">
          {data.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-2.5">
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
  );
}

function RecentChanges({ data, loading }) {
  return (
    <section className="card rounded-3xl p-6" aria-labelledby="changes-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="changes-h" className="section-title">What's new</h2>
        <Link to="/updates" className="link inline-flex items-center gap-1 text-sm">
          View all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {data?.pending_review > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {data.pending_review} change(s) waiting for human re-verification
        </p>
      )}
      {loading && !data ? (
        <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : data?.recent_events?.length ? (
        <ol className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-slate-200">
          {data.recent_events.map((e) => {
            const t = EVENT_TYPES[e.event_type] || EVENT_TYPES.default;
            return (
              <li key={e.id} className="relative flex gap-3">
                <EventIcon type={e.event_type} />
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm text-navy-900" dir="auto">{e.summary}</p>
                  <p className="text-xs text-slate-500">
                    {t.label} · {timeAgo(e.detected_at)}
                    {e.severity === "significant" && <span className="font-semibold text-rose-600"> · significant</span>}
                    {e.scheme_id && (
                      <>
                        {" "}·{" "}
                        <Link to={`/schemes/${encodeURIComponent(e.scheme_id)}`} className="link">view scheme</Link>
                      </>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        data && (
          <div className="mt-6 flex flex-col items-center rounded-2xl bg-slate-50 px-4 py-8 text-center">
            <PartyPopper className="h-8 w-8 text-emerald-500" aria-hidden />
            <p className="mt-2 text-sm font-medium text-navy-900">All quiet on the official sites</p>
            <p className="text-xs text-slate-500">New schemes and rule changes will show up here.</p>
          </div>
        )
      )}
    </section>
  );
}

/** Signed-in users: their personal matches, right under the hero. */
function MatchesSection({ userId }) {
  return (
    <section
      aria-label="Your personal matches"
      className="relative isolate grid items-center gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-950 to-[#123b4a] p-5 shadow-lift sm:p-8 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <div className="phulkari absolute inset-0 -z-10 opacity-40" aria-hidden />
      <div className="text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">Welcome back</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {userId}, here is where you stand
        </h2>
        <p className="mt-2 max-w-md text-sm text-navy-200">
          Your saved facts are checked against every scheme with verified official rules. Add more facts to turn
          "needs more info" into a clear answer.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/eligibility" className="btn bg-gradient-to-r from-gold-300 to-gold-500 text-navy-950 hover:brightness-105">
            Update my facts
          </Link>
          <Link to="/saved" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
            My saved schemes
          </Link>
        </div>
      </div>
      <MatchesPanel />
    </section>
  );
}

export default function Dashboard() {
  const { userId } = useUser();
  const { data, error, loading, reload } = useAsync((signal) => api.stats({ signal }), []);
  const schemes = useAsync((signal) => api.schemes({}, { signal }), []);

  return (
    <div className="space-y-12">
      <Hero />
      {userId && <MatchesSection userId={userId} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <OpenNow schemes={schemes.data} loading={schemes.loading} />
      <QuickStart />
      <NumbersStrip data={data} loading={loading} />
      <LifeNeeds schemes={schemes.data} loading={schemes.loading} />
      {schemes.data && <FeaturedSchemes schemes={schemes.data} moreLink="/schemes?verified=1" />}
      <AgentPulse />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <RecentChanges data={data} loading={loading} />
        <SourceHealth data={data} loading={loading} />
      </div>
      <p className="pb-2 text-center text-xs text-slate-400">
        Results are decision support only. Final eligibility is decided by the scheme authority. Always confirm on the official portal.
      </p>
    </div>
  );
}
