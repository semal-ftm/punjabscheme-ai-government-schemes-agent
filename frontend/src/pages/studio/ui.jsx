import { useState } from "react";
import { AlertTriangle, Check, ChevronRight, Copy, Minus } from "lucide-react";

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-600" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function Panel({ title, icon: Icon, actions, children, className = "", sub }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
              {Icon && <Icon className="h-5 w-5 text-gold-500" aria-hidden />}
              {title}
            </h2>
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metric({ label, value, hint, icon: Icon, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700", plum: "bg-plum-50 text-plum-600", gold: "bg-gold-50 text-gold-600",
    ink: "bg-cream-200 text-navy-700",
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-navy-900">{value ?? "—"}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400" title={typeof hint === "string" ? hint : undefined}>{hint}</p>}
    </div>
  );
}

export function JsonView({ value, maxHeight = "max-h-96" }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-2 top-2 rounded-md bg-white/10 p-1 text-slate-300 hover:bg-white/20"
        aria-label="Copy JSON"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className={`${maxHeight} overflow-auto rounded-xl bg-[#1f1b16] p-3 text-[11.5px] leading-relaxed text-[#efe6d5] scroll-thin`}>{text}</pre>
    </div>
  );
}

export function Collapse({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-800">
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden /> {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

/** "User Query ✓ → Plan ✓ → ..." execution strip. stages: [{key,label,status,detail}] */
export function PipelineStrip({ stages = [] }) {
  if (!stages.length) return <p className="text-sm text-slate-500">No runs yet. Ask the AI Assistant or run a simulation.</p>;
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {stages.map((s, i) => {
        const tone =
          s.status === "done"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : s.status === "warning"
            ? "border-gold-300 bg-gold-50 text-gold-600"
            : "border-slate-200 bg-cream-100 text-slate-400";
        const Icon = s.status === "done" ? Check : s.status === "warning" ? AlertTriangle : Minus;
        return (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${tone}`} title={s.detail}>
              {s.label}
              {s.detail && <span className="font-normal opacity-75">({s.detail})</span>}
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            {i < stages.length - 1 && <span className="text-slate-300" aria-hidden>→</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function StatusDot({ ok, warn, label }) {
  const c = ok ? "bg-emerald-500" : warn ? "bg-gold-400" : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700">
      <span className={`h-2 w-2 rounded-full ${c}`} aria-hidden /> {label}
    </span>
  );
}
