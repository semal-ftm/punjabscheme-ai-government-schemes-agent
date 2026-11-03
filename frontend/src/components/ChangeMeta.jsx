import {
  Ban, CheckCircle2, Clock, FilePlus2, FileDiff, PauseCircle, RefreshCw, ShieldAlert, Sparkles, WifiOff, Info,
} from "lucide-react";

// change_events.event_type -> icon/label
export const EVENT_TYPES = {
  new_scheme: { icon: Sparkles, cls: "bg-emerald-50 text-emerald-700", label: "New scheme" },
  new_document: { icon: FilePlus2, cls: "bg-sky-50 text-sky-700", label: "New document" },
  content_changed: { icon: FileDiff, cls: "bg-amber-50 text-amber-700", label: "Content changed" },
  source_unreachable: { icon: WifiOff, cls: "bg-rose-50 text-rose-700", label: "Source unreachable" },
  rules_reloaded: { icon: RefreshCw, cls: "bg-violet-50 text-violet-700", label: "Rules reloaded" },
  default: { icon: Info, cls: "bg-slate-100 text-slate-600", label: "Event" },
};

// sources.status -> icon/label
export const SOURCE_STATUS = {
  ok: { icon: CheckCircle2, cls: "text-emerald-600", label: "Reachable" },
  unreachable: { icon: WifiOff, cls: "text-rose-600", label: "Unreachable" },
  ssl_error: { icon: ShieldAlert, cls: "text-amber-600", label: "SSL certificate error" },
  suspended: { icon: PauseCircle, cls: "text-slate-500", label: "Suspended" },
  blocked_by_robots: { icon: Ban, cls: "text-slate-500", label: "Blocked by robots.txt" },
  content_signal_blocked: { icon: Ban, cls: "text-slate-500", label: "Crawling disallowed by site" },
  never_checked: { icon: Clock, cls: "text-slate-400", label: "Not checked yet" },
};

export function SourceStatusIcon({ status }) {
  const s = SOURCE_STATUS[status] || { ...SOURCE_STATUS.never_checked, label: status || "Unknown" };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.cls}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {s.label}
    </span>
  );
}

export function EventIcon({ type, size = "md" }) {
  const t = EVENT_TYPES[type] || EVENT_TYPES.default;
  const Icon = t.icon;
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg ${t.cls} ${size === "sm" ? "h-7 w-7" : "h-9 w-9"}`} title={t.label}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}
