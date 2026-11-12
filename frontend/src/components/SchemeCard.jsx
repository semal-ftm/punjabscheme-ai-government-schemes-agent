import { schemeImage } from "../lib/constants.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, CalendarCheck } from "lucide-react";
import { CategoryBadge, LevelBadge, VerifiedSeal } from "./Badges.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useUser } from "../lib/UserContext.jsx";
import { formatDate, urduClass } from "../lib/format.js";

/** Save / unsave button. Shows an inline hint when no username is set. */
export function SaveButton({ schemeId, compact = false }) {
  const { userId, savedIds, toggleSaved } = useUser();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const saved = savedIds.has(schemeId);

  const onClick = async () => {
    if (!userId) {
      setMsg("Pick a username in the menu first");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await toggleSaved(schemeId);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={saved}
        title={saved ? "Remove from saved" : "Save scheme"}
        className={
          compact
            ? `rounded-lg p-2 transition-colors ${saved ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"}`
            : saved
              ? "btn border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              : "btn-secondary"
        }
      >
        <Icon className={compact ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
        {compact ? <span className="sr-only">{saved ? "Saved" : "Save"}</span> : saved ? "Saved" : "Save"}
      </button>
      {msg && (
        <span role="status" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg bg-navy-900 px-2 py-1 text-right text-[11px] text-white shadow">
          {msg}
        </span>
      )}
    </span>
  );
}

/** Scheme summary card (Explore page). `scheme` = item from GET /api/schemes. */
export default function SchemeCard({ scheme, compareChecked, onCompareToggle, compareDisabled }) {
  const s = scheme;
  return (
    <article className="card card-hover flex h-full flex-col overflow-hidden">
      <Link to={`/schemes/${encodeURIComponent(s.id)}`} className="block h-32 overflow-hidden bg-cream-200" tabIndex={-1} aria-hidden>
        <img src={schemeImage(s)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge category={s.category} />
          <LevelBadge level={s.level} />
        </div>
        <SaveButton schemeId={s.id} compact />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-navy-900">
        <Link to={`/schemes/${encodeURIComponent(s.id)}`} className="hover:underline">
          {s.name}
        </Link>
      </h3>
      {s.name_ur && (
        <p dir="rtl" className={`text-sm text-slate-500 ${urduClass(s.name_ur)}`}>
          {s.name_ur}
        </p>
      )}
      {s.sector && <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{s.sector}</p>}
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600" dir="auto">
        {s.summary || "No official summary stored yet."}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <VerifiedSeal rulesStatus={s.rules_status} sourceUrl={s.source_url} />
        <StatusBadge status={s.status} applyUrl={s.application_url} pageUrl={s.source_url} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden /> Checked on {formatDate(s.last_verified)}
        </span>
        {onCompareToggle && (
          <label className={`inline-flex items-center gap-1.5 text-xs font-medium ${compareDisabled && !compareChecked ? "text-slate-400" : "text-navy-700"}`}>
            <input
              type="checkbox"
              checked={compareChecked}
              disabled={compareDisabled && !compareChecked}
              onChange={() => onCompareToggle(s.id)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Compare
          </label>
        )}
      </div>
      </div>
    </article>
  );
}
