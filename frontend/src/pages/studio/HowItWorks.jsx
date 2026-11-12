import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Visual explainer shown at the top of every Agent Studio tab.
 * steps: [{ icon, title, text, example? }] — `example` is live data from the running system (string or node).
 */
export default function HowItWorks({ image, eyebrow = "How it works", title, summary, steps, footer }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!playing || hover || steps.length < 2) return undefined;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 3200);
    return () => clearInterval(t);
  }, [playing, hover, steps.length]);

  const step = steps[active];
  const StepIcon = step.icon;

  return (
    <section
      className="card mb-6 overflow-hidden"
      aria-label={`${title}: how it works`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="grid lg:grid-cols-[minmax(0,21rem)_1fr]">
        <div className="relative min-h-48 bg-cream-200">
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/70 to-transparent p-4 pt-12 lg:hidden">
            <p className="font-display text-lg font-semibold text-white">{title}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-500">{eyebrow}</p>
              <h2 className="hidden font-display text-2xl font-semibold text-navy-900 lg:block">{title}</h2>
              {summary && <p className="mt-1 max-w-2xl text-sm text-slate-600">{summary}</p>}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="btn-ghost shrink-0 !px-2 !py-1 text-xs"
              aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pause" : "Play"}
            </button>
          </div>

          {/* Stepper */}
          <ol className="relative mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            <span className="absolute left-[6%] right-[6%] top-5 hidden h-0.5 bg-slate-200 sm:block" aria-hidden />
            <span
              className="absolute left-[6%] top-5 hidden h-0.5 bg-emerald-500 transition-all duration-700 sm:block"
              style={{ width: `${(active / Math.max(steps.length - 1, 1)) * 88}%` }}
              aria-hidden
            />
            {steps.map((s, i) => {
              const Icon = s.icon;
              const state = i === active ? "active" : i < active ? "done" : "todo";
              return (
                <li key={s.title} className="relative flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={i === active ? "step" : undefined}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 transition-all duration-300 ${
                      state === "active"
                        ? "scale-110 border-emerald-600 bg-emerald-600 text-white shadow-lift"
                        : state === "done"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-cream-50 text-slate-400 hover:border-emerald-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </button>
                  <span className={`mt-1.5 hidden text-[11px] font-semibold leading-tight sm:block ${state === "active" ? "text-emerald-800" : "text-slate-500"}`}>
                    {s.title}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Active step detail */}
          <div key={active} className="fade-up mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">{active + 1}</span>
              <StepIcon className="h-4 w-4" aria-hidden /> {step.title}
            </p>
            <p className="mt-1.5 text-sm text-navy-700">{step.text}</p>
            {step.example && (
              <div className="mt-2 rounded-xl bg-cream-50 px-3 py-2 text-xs text-navy-800 ring-1 ring-slate-200">
                <span className="mr-1.5 font-semibold uppercase tracking-wide text-gold-500">Live</span>
                {step.example}
              </div>
            )}
          </div>
          {footer && <div className="mt-3 text-xs text-slate-500">{footer}</div>}
        </div>
      </div>
    </section>
  );
}
