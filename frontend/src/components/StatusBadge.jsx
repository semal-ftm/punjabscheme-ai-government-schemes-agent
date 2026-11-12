import { Ban, CalendarClock, CheckCircle2, ExternalLink, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "./Badges.jsx";

// Application status of a scheme (effective_status on the backend).
// "Unverified" means no official page states an application window, so we never claim Open/Live.
// Instead of a warning we link to the official portal, which is where the dates live.
const STATUS = {
  Open: { tone: "emerald", icon: CheckCircle2, text: "Open" },
  Upcoming: { tone: "sky", icon: CalendarClock, text: "Upcoming" },
  Closed: { tone: "rose", icon: XCircle, text: "Closed" },
  Suspended: { tone: "slate", icon: PauseCircle, text: "Suspended" },
  Unverified: { tone: "sky", icon: ExternalLink, text: "Apply via official portal" },
};

/**
 * `applyUrl`: the scheme's official application portal (application_url).
 * `pageUrl`: its official information page (source_url), used when there is no separate portal.
 * With a URL the badge becomes a link that opens the official site in a new tab.
 */
export default function StatusBadge({ status, applyUrl, pageUrl }) {
  const s = STATUS[status] || { tone: "slate", icon: Ban, text: status || "Unknown" };
  const url = applyUrl || pageUrl;
  if (url && (status === "Unverified" || status === "Open" || status === "Upcoming")) {
    const label = status === "Unverified" ? (applyUrl ? "Apply on official portal" : "View official page") : s.text;
    const Icon = status === "Unverified" ? ExternalLink : s.icon;
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* ignore */
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Opens ${host || "the official site"} in a new tab. Application dates are published there.`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-sky-200 transition-colors hover:bg-sky-100 hover:text-sky-900 hover:underline focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Badge
      tone={s.tone}
      icon={s.icon}
      title={status === "Unverified" ? "No application dates are published on the official page." : undefined}
    >
      {s.text}
    </Badge>
  );
}
