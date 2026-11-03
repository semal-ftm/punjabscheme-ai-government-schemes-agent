import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { VERDICTS } from "../lib/constants.js";

export const VERDICT_STYLE = {
  [VERDICTS.ELIGIBLE]: {
    icon: CheckCircle2, badge: "bg-emerald-600 text-white", soft: "border-emerald-200 bg-emerald-50/60", text: "text-emerald-800",
  },
  [VERDICTS.NEED_INFO]: {
    icon: HelpCircle, badge: "bg-amber-500 text-white", soft: "border-amber-200 bg-amber-50/60", text: "text-amber-800",
  },
  [VERDICTS.NOT_ELIGIBLE]: {
    icon: XCircle, badge: "bg-slate-600 text-white", soft: "border-rose-200 bg-rose-50/40", text: "text-rose-800",
  },
};

export default function VerdictBadge({ verdict, size = "sm" }) {
  const s = VERDICT_STYLE[verdict] || { icon: HelpCircle, badge: "bg-slate-400 text-white" };
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.badge} ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
      {verdict}
    </span>
  );
}
