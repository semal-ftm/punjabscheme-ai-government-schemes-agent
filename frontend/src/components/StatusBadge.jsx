import { Ban, CalendarClock, CheckCircle2, HelpCircle, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "./Badges.jsx";

// Application status of a scheme (effective_status on the backend). "Unverified" = no confirmed window.
const STATUS = {
  Open: { tone: "emerald", icon: CheckCircle2, text: "Open" },
  Upcoming: { tone: "sky", icon: CalendarClock, text: "Upcoming" },
  Closed: { tone: "rose", icon: XCircle, text: "Closed" },
  Suspended: { tone: "slate", icon: PauseCircle, text: "Suspended" },
  Unverified: { tone: "amber", icon: HelpCircle, text: "Status not confirmed" },
};

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { tone: "slate", icon: Ban, text: status || "Unknown" };
  return (
    <Badge
      tone={s.tone}
      icon={s.icon}
      title={status === "Unverified" ? "No officially confirmed application window was found" : undefined}
    >
      {s.text}
    </Badge>
  );
}
