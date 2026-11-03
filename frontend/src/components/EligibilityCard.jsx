import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, ChevronDown, ExternalLink, HelpCircle, Landmark, X } from "lucide-react";
import { CategoryBadge, LevelBadge, RulesBadge } from "./Badges.jsx";
import StatusBadge from "./StatusBadge.jsx";
import VerdictBadge, { VERDICT_STYLE } from "./VerdictBadge.jsx";
import { fieldLabel } from "../lib/constants.js";
import { formatDate, formatValue, hostOf } from "../lib/format.js";

const CRITERION = {
  pass: { icon: Check, cls: "bg-emerald-100 text-emerald-700", label: "Meets" },
  fail: { icon: X, cls: "bg-rose-100 text-rose-700", label: "Does not meet" },
  unknown: { icon: HelpCircle, cls: "bg-amber-100 text-amber-700", label: "Unknown" },
  manual: { icon: Landmark, cls: "bg-slate-100 text-slate-700", label: "Official check" },
};

/** Per-criterion breakdown with the verbatim official quote. not_applicable criteria are hidden. */
export function CriteriaList({ criteria = [], onMissingField }) {
  const shown = criteria.filter((c) => c.status !== "not_applicable");
  if (!shown.length) return <p className="muted">No officially verified criteria are stored for this scheme.</p>;
  return (
    <ul className="space-y-2">
      {shown.map((c) => {
        const s = CRITERION[c.status] || CRITERION.unknown;
        const Icon = s.icon;
        return (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.cls}`} title={s.label}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{s.label}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium text-navy-900">{c.label}</p>
                  {c.status === "manual" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">official check</span>
                  )}
                </div>
                {c.field && c.status !== "manual" && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    You: <span className="font-medium text-navy-800">{c.status === "unknown" ? "not provided" : formatValue(c.user_value)}</span>
                    {c.required !== null && c.required !== undefined && (
                      <>
                        {" "}· Required: <span className="font-medium text-navy-800">{formatValue(c.required)}</span>
                      </>
                    )}
                  </p>
                )}
                {c.status === "unknown" && c.missing_field && onMissingField && (
                  <button type="button" onClick={() => onMissingField(c.missing_field)} className="mt-1 text-xs font-semibold text-amber-700 hover:underline">
                    Add "{fieldLabel(c.missing_field)}" →
                  </button>
                )}
                {c.quote && (
                  <blockquote dir="auto" className="mt-2 border-l-2 border-emerald-300 pl-2.5 text-xs italic leading-relaxed text-slate-600">
                    “{c.quote}”
                  </blockquote>
                )}
                {c.source_url && (
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs link">
                    {hostOf(c.source_url)} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** One scheme's eligibility result (shape of check_scheme() + status + sources from the MCP tool). */
export default function EligibilityCard({ result, defaultOpen = false, onMissingField }) {
  const [open, setOpen] = useState(defaultOpen);
  const style = VERDICT_STYLE[result.verdict] || {};
  const counts = (result.criteria || []).reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
  const panelId = `elig-${result.scheme_id}`;

  return (
    <div className={`rounded-2xl border ${style.soft || "border-slate-200 bg-white"} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/schemes/${encodeURIComponent(result.scheme_id)}`} className="font-semibold text-navy-900 hover:underline">
            {result.scheme_name}
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <LevelBadge level={result.level} />
            <CategoryBadge category={result.category} />
            {result.status && <StatusBadge status={result.status} />}
            {result.rules_status && result.rules_status !== "verified" && <RulesBadge rulesStatus={result.rules_status} />}
          </div>
        </div>
        <VerdictBadge verdict={result.verdict} />
      </div>

      {result.missing_fields?.length > 0 && (
        <div className="mt-3 text-sm text-amber-900">
          <span className="font-medium">Missing information: </span>
          <span className="inline-flex flex-wrap gap-1.5 align-middle">
            {result.missing_fields.map((f) =>
              onMissingField ? (
                <button
                  key={f}
                  type="button"
                  onClick={() => onMissingField(f)}
                  className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {fieldLabel(f)}
                </button>
              ) : (
                <span key={f} className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {fieldLabel(f)}
                </span>
              )
            )}
          </span>
        </div>
      )}
      {result.failed?.length > 0 && (
        <p className="mt-2 text-sm text-rose-800">
          <span className="font-medium">Not met: </span>
          {result.failed.join("; ")}
        </p>
      )}
      {result.warnings?.map((w) => (
        <p key={w} className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
        </p>
      ))}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-navy-900"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          {open ? "Hide" : "Show"} criteria
          <span className="font-normal text-slate-500">
            ({counts.pass || 0} met · {counts.fail || 0} not met · {counts.unknown || 0} unknown
            {counts.manual ? ` · ${counts.manual} official check` : ""})
          </span>
        </button>
        <span className="text-xs text-slate-500">Rules verified: {formatDate(result.last_verified)}</span>
      </div>

      {open && (
        <div id={panelId} className="mt-3 space-y-3">
          <CriteriaList criteria={result.criteria} onMissingField={onMissingField} />
          {result.source_url && (
            <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm link">
              Official source <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          {result.disclaimer && <p className="text-xs text-slate-500">{result.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}
