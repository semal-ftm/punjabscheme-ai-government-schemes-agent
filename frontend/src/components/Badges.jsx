import { AlertTriangle, CircleDashed, ShieldCheck } from "lucide-react";
import { CATEGORY_LABELS } from "../lib/constants.js";

const TONES = {
  navy: "bg-navy-50 text-navy-700 ring-navy-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  sky: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  solidNavy: "bg-navy-900 text-white ring-navy-900",
};

export function Badge({ tone = "slate", icon: Icon, children, className = "", title }) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function LevelBadge({ level }) {
  if (!level) return null;
  const federal = level === "federal";
  return (
    <Badge tone={federal ? "violet" : "sky"} title={federal ? "Federal (Government of Pakistan)" : "Provincial (Punjab)"}>
      {federal ? "FEDERAL" : "PROVINCIAL"}
    </Badge>
  );
}

export function CategoryBadge({ category, label }) {
  if (!category && !label) return null;
  return <Badge tone="navy">{label || CATEGORY_LABELS[category] || category}</Badge>;
}

const RULES = {
  verified: { tone: "emerald", icon: ShieldCheck, text: "Rules verified" },
  needs_reverification: { tone: "amber", icon: AlertTriangle, text: "Source changed, re-verification pending" },
  not_curated: { tone: "slate", icon: CircleDashed, text: "Auto-discovered, rules not verified" },
};

export function RulesBadge({ rulesStatus }) {
  const r = RULES[rulesStatus];
  if (!r) return null;
  return (
    <Badge tone={r.tone} icon={r.icon}>
      {r.text}
    </Badge>
  );
}

export function SeverityBadge({ severity }) {
  return severity === "significant" ? <Badge tone="rose">Significant</Badge> : <Badge tone="slate">Info</Badge>;
}

export function ReviewBadge({ reviewStatus }) {
  if (reviewStatus === "pending_review")
    return (
      <Badge tone="amber" icon={AlertTriangle}>
        Pending human re-verification
      </Badge>
    );
  if (reviewStatus === "verified")
    return (
      <Badge tone="emerald" icon={ShieldCheck}>
        Verified
      </Badge>
    );
  return null;
}
