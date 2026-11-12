import { Moon, Sun, Sunrise } from "lucide-react";

// Time of day drives the hero: dawn colours in the morning, golden light in the afternoon, dusk with stars
// and lamp glows in the evening. Greeting in Urdu to match.
export const DAY_PHASES = {
  morning: { en: "Good morning", ur: "صبح بخیر", icon: Sunrise },
  afternoon: { en: "Good afternoon", ur: "دوپہر بخیر", icon: Sun },
  evening: { en: "Good evening", ur: "شام بخیر", icon: Moon },
};

export function dayPhase(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

/** "صبح بخیر · Good morning" chip shown above the hero title. */
export function DayGreeting({ phase }) {
  const p = DAY_PHASES[phase];
  const Icon = p.icon;
  return (
    <span className="greet-chip inline-flex items-center gap-2 rounded-full bg-cream-100/90 px-3 py-1 text-xs font-semibold text-navy-700 ring-1 ring-gold-300/60">
      <Icon className={`h-3.5 w-3.5 ${phase === "evening" ? "text-plum-500" : "text-gold-500"}`} aria-hidden />
      <span lang="ur" dir="rtl" className="font-urdu text-sm !leading-none text-plum-600">{p.ur}</span>
      <span className="text-slate-400">·</span>
      {p.en}
    </span>
  );
}

const BIRDS = [
  { top: "14%", delay: "0s", dur: "22s", scale: 1 },
  { top: "20%", delay: "-6s", dur: "26s", scale: 0.75 },
  { top: "10%", delay: "-12s", dur: "20s", scale: 0.6 },
  { top: "24%", delay: "-17s", dur: "28s", scale: 0.85 },
];
const STARS = [
  [12, 10], [22, 22], [34, 8], [48, 16], [61, 6], [72, 19], [84, 9], [90, 26], [28, 30], [55, 28],
];
const LAMPS = [
  [38, 74], [46, 70], [53, 72], [60, 69], [67, 73], [74, 71], [43, 80], [64, 79],
];

/**
 * The Badshahi Mosque drawing with a sunrise fade-in, a glowing sun behind the minarets, birds drifting
 * across the sky and a time-of-day tint (stars and lamp glows in the evening).
 */
export default function HeroArt({ phase }) {
  return (
    <div className="hero-art relative overflow-hidden rounded-2xl shadow-card ring-1 ring-gold-100" data-phase={phase}>
      <img
        src="/img/hero.webp"
        alt="Watercolour illustration of the Badshahi Mosque, Lahore"
        className="dawn-in block w-full object-cover lg:h-[clamp(14rem,calc(100dvh-28rem),24rem)]"
      />
      {/* Sun rising behind the minarets */}
      <span className="hero-sun" aria-hidden />
      {/* Time-of-day colour wash */}
      <span className="hero-tint" aria-hidden />
      {phase === "evening" && (
        <>
          {STARS.map(([x, y], i) => (
            <span key={`s${i}`} className="hero-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.37}s` }} aria-hidden />
          ))}
          {LAMPS.map(([x, y], i) => (
            <span key={`l${i}`} className="hero-lamp" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s` }} aria-hidden />
          ))}
        </>
      )}
      {/* Birds drifting across the sky */}
      {BIRDS.map((b, i) => (
        <svg
          key={i}
          viewBox="0 0 24 10"
          className="hero-bird"
          style={{ top: b.top, animationDelay: b.delay, animationDuration: b.dur, width: 22 * b.scale }}
          aria-hidden
        >
          <path d="M1 6 Q6 0 12 6 Q18 0 23 6" fill="none" stroke="#5a3a2a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

const FLOWERS = [
  { left: "4%", top: "12%", size: 30, color: "#b03a48", dur: 11, delay: 0 },
  { left: "40%", top: "6%", size: 20, color: "#c08f2f", dur: 13, delay: -3 },
  { left: "30%", top: "78%", size: 26, color: "#36582b", dur: 12, delay: -6 },
  { left: "8%", top: "70%", size: 18, color: "#763a52", dur: 9, delay: -2 },
  { left: "52%", top: "40%", size: 16, color: "#2f6f8f", dur: 14, delay: -8 },
  { left: "88%", top: "8%", size: 24, color: "#b03a48", dur: 10, delay: -4 },
  { left: "94%", top: "66%", size: 20, color: "#c08f2f", dur: 12, delay: -7 },
  { left: "62%", top: "86%", size: 22, color: "#763a52", dur: 15, delay: -1 },
  { left: "20%", top: "38%", size: 14, color: "#36582b", dur: 13, delay: -5 },
];

/** Embroidered-style (phulkari) flowers floating gently in the hero background. */
export function PhulkariFloat() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {FLOWERS.map((f, i) => (
        <svg
          key={i}
          viewBox="-20 -20 40 40"
          className="phulkari"
          style={{ left: f.left, top: f.top, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
        >
          <g fill="none" stroke={f.color} strokeWidth="1.6" strokeDasharray="2.2 1.6" strokeLinecap="round">
            {Array.from({ length: 8 }, (_, k) => (
              <ellipse key={k} cx="0" cy="-10" rx="4" ry="8" transform={`rotate(${k * 45})`} />
            ))}
          </g>
          <circle r="3.5" fill={f.color} />
        </svg>
      ))}
    </div>
  );
}
