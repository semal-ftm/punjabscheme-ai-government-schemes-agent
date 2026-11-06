import { useEffect, useRef, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Animates a number from 0 to `value` (ease-out). Renders "—" while the value is unknown. */
export function CountUp({ value, duration = 1100, className = "" }) {
  const [shown, setShown] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (typeof value !== "number") return undefined;
    if (reducedMotion()) {
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{typeof value === "number" ? shown.toLocaleString() : "—"}</span>;
}

/** Circular progress ring (0–100). Children render in the centre. */
export function Ring({ percent = 0, size = 96, stroke = 9, track = "rgba(255,255,255,0.12)", color = "#34d399", children, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(reducedMotion() ? percent : 0);
  useEffect(() => {
    const t = setTimeout(() => setP(percent), 60);
    return () => clearTimeout(t);
  }, [percent]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, p)) / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
