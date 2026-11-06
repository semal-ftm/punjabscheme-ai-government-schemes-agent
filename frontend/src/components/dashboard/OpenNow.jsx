import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ExternalLink, Hourglass, ShieldCheck } from "lucide-react";
import SchemeArt, { THEMES, themeKeyFor } from "../art/SchemeArt.jsx";
import { Skeleton } from "../States.jsx";
import { daysUntil, formatDate } from "../../lib/format.js";

/*
 * "Happening now": schemes whose status an official page confirms (Open = accepting applications,
 * Ongoing = programme running). Every item here is backed by a verbatim official quote in rules.yaml.
 */

function Countdown({ deadline }) {
  const d = deadline ? daysUntil(deadline) : null;
  if (d === null || d < 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold-300 px-2.5 py-1 text-[11px] font-extrabold text-navy-950 shadow">
      <Hourglass className="h-3.5 w-3.5" aria-hidden />
      {d === 0 ? "Closes today" : `${d} day${d === 1 ? "" : "s"} left`}
    </span>
  );
}

function OpenCard({ s }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-emerald-200 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <SchemeArt scheme={s} className="!h-36">
        <div className="flex items-start justify-between gap-2 p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Applications open
          </span>
          <Countdown deadline={s.deadline} />
        </div>
      </SchemeArt>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold leading-snug text-navy-900">
          <Link to={`/schemes/${encodeURIComponent(s.id)}`} className="after:absolute after:inset-0 after:content-['']">
            {s.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-slate-600">{s.status_note}</p>
        {s.deadline && <p className="mt-1 text-xs font-semibold text-emerald-700">Last date: {formatDate(s.deadline)}</p>}
        <div className="relative z-10 mt-auto flex flex-wrap gap-2 pt-4">
          {(s.application_url || s.status_source_url) && (
            <a href={s.application_url || s.status_source_url} target="_blank" rel="noopener noreferrer" className="btn-primary !px-3 !py-1.5 text-xs">
              Apply on official portal <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function OngoingRow({ s }) {
  const t = THEMES[themeKeyFor(s)] || THEMES.punjab;
  const Icon = t.hero;
  return (
    <li className="min-w-0 border-b border-slate-100 last:border-0 lg:[&:nth-last-child(2):nth-child(odd)]:border-0">
      <Link
        to={`/schemes/${encodeURIComponent(s.id)}`}
        className="group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy-900">{s.name}</span>
          <span className="block truncate text-xs text-slate-500" title={s.status_note}>{s.status_note}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200 sm:inline">
          {s.level === "federal" ? "Federal" : "Punjab"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-navy-900" aria-hidden />
      </Link>
    </li>
  );
}

/** `schemes` = GET /api/schemes. */
export default function OpenNow({ schemes, loading }) {
  if (loading && !schemes) return <Skeleton className="h-80 rounded-3xl" />;
  if (!schemes) return null;
  const open = schemes
    .filter((s) => s.status === "Open")
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  const ongoing = schemes.filter((s) => s.status === "Ongoing");
  if (!open.length && !ongoing.length) return null;
  const checked = schemes.map((s) => s.status_checked).filter(Boolean).sort().pop();

  return (
    <section aria-labelledby="now-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Happening now
          </p>
          <h2 id="now-h" className="text-xl font-bold tracking-tight text-navy-900">
            {open.length} open for applications · {ongoing.length} programmes running
          </h2>
          {checked && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              Checked on the official websites on {formatDate(checked)}. Every status links to the official sentence it comes from.
            </p>
          )}
        </div>
        <Link to="/schemes?now=1" className="link inline-flex items-center gap-1 text-sm">
          See all open &amp; running <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {open.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.slice(0, 3).map((s) => (
            <OpenCard key={s.id} s={s} />
          ))}
        </div>
      )}
      {ongoing.length > 0 && (
        <div className="mt-5 rounded-3xl bg-white p-3 shadow-card ring-1 ring-slate-200/70">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-sky-700">
            Ongoing programmes · register through the official channel shown
          </p>
          <ul className="grid lg:grid-cols-2 lg:gap-x-4">
            {ongoing.slice(0, 8).map((s) => (
              <OngoingRow key={s.id} s={s} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
