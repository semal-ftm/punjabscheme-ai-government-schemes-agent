import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, Radio } from "lucide-react";
import { timeAgo } from "../../lib/format.js";

const SOURCE_LABEL = {
  ok: "reachable",
  never_checked: "saved snapshot",
  unreachable: "site offline",
  blocked_by_robots: "blocked by robots.txt",
  content_signal_blocked: "crawling not allowed",
};

/** Live feed of what the crawler found on the official sites. Shows only real data from /api/stats. */
export default function UpdatesFeed({ stats }) {
  const events = stats?.recent_events || [];
  const sources = stats?.sources || [];
  const checked = sources.some((s) => s.last_checked_at);
  return (
    <section className="card folk-top flex flex-col p-5" aria-labelledby="feed-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="feed-h" className="section-title flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          Live from official sources
        </h2>
        <Link to="/updates" className="link text-sm">All updates →</Link>
      </div>

      {events.length > 0 ? (
        <ol className="mt-4 space-y-3 border-l-2 border-gold-300 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gold-400 ring-4 ring-cream-50" />
              <p className="text-sm font-medium text-navy-900">{e.summary}</p>
              <p className="text-xs text-slate-500">
                {timeAgo(e.detected_at)}
                {e.severity === "significant" && <span className="ml-2 font-semibold text-rose-600">Significant</span>}
              </p>
            </li>
          ))}
        </ol>
      ) : checked ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No changes detected on the official pages since the last check.
        </p>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-gold-50 p-3 text-sm text-navy-800 ring-1 ring-gold-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden />
          <span>
            Built from saved copies of the official pages. Run a live check on the{" "}
            <Link to="/updates" className="link">Updates page</Link> to compare them with the sites today.
          </span>
        </p>
      )}

      <ul className="mt-4 space-y-1.5">
        {sources.map((s) => {
          const ok = s.status === "ok" || s.status === "never_checked";
          return (
            <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-navy-700">
                {ok ? (
                  <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <CircleAlert className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                )}
                <span className="truncate">{s.name}</span>
              </span>
              <span className="shrink-0 text-slate-400">{s.last_checked_at && s.status === "ok" ? `checked ${timeAgo(s.last_checked_at)}` : SOURCE_LABEL[s.status] || s.status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
