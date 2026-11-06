import { Activity, CalendarClock, CheckCircle2, ExternalLink, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "./Badges.jsx";
import { daysUntil } from "../lib/format.js";

// Application status of a scheme (effective_status on the backend). Every status other than "Unverified" is
// backed by a verbatim quote from an official page (status_quote / status_source_url).
export const STATUS_STYLE = {
  Open: { tone: "emerald", icon: CheckCircle2, text: "Applications open", hint: "An official page says applications are being accepted now." },
  Ongoing: { tone: "sky", icon: Activity, text: "Ongoing programme", hint: "An official page says the programme is running now." },
  Upcoming: { tone: "violet", icon: CalendarClock, text: "Opening soon", hint: "Applications open on the official opening date." },
  Closed: { tone: "rose", icon: XCircle, text: "Applications closed", hint: "An official page says applications are closed." },
  Suspended: { tone: "slate", icon: PauseCircle, text: "Suspended", hint: "Suspended according to the official page." },
  Unverified: {
    tone: "slate", icon: ExternalLink, text: "Check official site for dates",
    hint: "No official page states the current application window, so we don't guess. Check the official link.",
  },
};

/** `deadline` (optional) adds "· N days left" to an open scheme. */
export default function StatusBadge({ status, deadline }) {
  const s = STATUS_STYLE[status] || { tone: "slate", icon: ExternalLink, text: status || "Unknown", hint: undefined };
  const days = status === "Open" && deadline ? daysUntil(deadline) : null;
  const suffix = days === null || days < 0 ? "" : days === 0 ? " · closes today" : ` · ${days} day${days === 1 ? "" : "s"} left`;
  return (
    <Badge tone={s.tone} icon={s.icon} title={s.hint}>
      {s.text}
      {suffix}
    </Badge>
  );
}
