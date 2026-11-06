import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, CalendarCheck } from "lucide-react";
import { RulesBadge } from "./Badges.jsx";
import SchemeArt from "./art/SchemeArt.jsx";
import { CATEGORY_LABELS } from "../lib/constants.js";
import StatusBadge from "./StatusBadge.jsx";
import { useUser } from "../lib/UserContext.jsx";
import { formatDate, urduClass } from "../lib/format.js";

/** Save / unsave button. Shows an inline hint when no username is set. */
export function SaveButton({ schemeId, compact = false, onImage = false }) {
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
          onImage
            ? `grid h-9 w-9 place-items-center rounded-full shadow-lg ring-1 backdrop-blur-md transition ${
                saved ? "bg-white text-emerald-700 ring-white" : "bg-black/25 text-white ring-white/30 hover:bg-white hover:text-navy-900"
              }`
            : compact
            ? `rounded-lg p-2 transition-colors ${saved ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"}`
            : saved
              ? "btn border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              : "btn-secondary"
        }
      >
        <Icon className={compact || onImage ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
        {compact || onImage ? <span className="sr-only">{saved ? "Saved" : "Save"}</span> : saved ? "Saved" : "Save"}
      </button>
      {msg && (
        <span role="status" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg bg-navy-900 px-2 py-1 text-right text-[11px] text-white shadow">
          {msg}
        </span>
      )}
    </span>
  );
}

/** Scheme summary card (Explore page, featured rows). `scheme` = item from GET /api/schemes. */
export default function SchemeCard({ scheme, compareChecked, onCompareToggle, compareDisabled, size = "card" }) {
  const s = scheme;
  const federal = s.level === "federal";
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <SchemeArt scheme={s} size={size}>
        <div className="p-3 pr-14">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-md">
              {CATEGORY_LABELS[s.category] || s.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 backdrop-blur-md ${
                federal ? "bg-violet-500/80 text-white ring-violet-200/40" : "bg-white/85 text-navy-900 ring-white"
              }`}
              title={federal ? "Federal (Government of Pakistan)" : "Provincial (Punjab)"}
            >
              {federal ? "FEDERAL" : "PROVINCIAL"}
            </span>
          </div>
        </div>
      </SchemeArt>
      {/* outside the artwork's stacking context so it sits above the card's stretched link */}
      <span className="absolute right-3 top-3 z-10">
        <SaveButton schemeId={s.id} onImage />
      </span>

      <div className="flex flex-1 flex-col p-5">
        {s.sector && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{s.sector}</p>
        )}
        <h3 className="font-display text-[1.05rem] font-bold leading-snug text-navy-900">
          {/* stretched link: the whole card opens the scheme */}
          <Link to={`/schemes/${encodeURIComponent(s.id)}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {s.name}
          </Link>
        </h3>
        {s.name_ur && (
          <p dir="rtl" className={`mt-0.5 text-sm text-slate-500 ${urduClass(s.name_ur)}`}>
            {s.name_ur}
          </p>
        )}
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600" dir="auto">
          {s.summary || "No official summary stored yet."}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <StatusBadge status={s.status} deadline={s.deadline} />
          <RulesBadge rulesStatus={s.rules_status} />
        </div>
        {s.status_note && s.status !== "Unverified" && (
          <p className="mt-2 line-clamp-2 text-xs leading-snug text-slate-500" title={s.status_quote ? `Official: “${s.status_quote}”` : undefined}>
            {s.status_note}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden /> Verified: {formatDate(s.last_verified)}
          </span>
          {onCompareToggle ? (
            <label
              className={`relative z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                compareChecked
                  ? "bg-navy-900 text-white"
                  : compareDisabled
                    ? "cursor-not-allowed text-slate-400"
                    : "bg-slate-100 text-navy-700 hover:bg-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={compareChecked}
                disabled={compareDisabled && !compareChecked}
                onChange={() => onCompareToggle(s.id)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Compare
            </label>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              View <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
