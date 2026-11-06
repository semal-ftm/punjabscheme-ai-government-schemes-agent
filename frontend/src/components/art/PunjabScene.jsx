import { useMemo } from "react";

/*
 * Illustrated Lahore evening: Badshahi Mosque, Minar-e-Pakistan, a waving Pakistani flag, twinkling stars,
 * drifting birds and the five rivers of Punjab. Pure inline SVG (SMIL + CSS), no images, no libraries.
 * Animation is skipped for users who prefer reduced motion.
 */

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- geometry helpers
const onion = (cx, base, w, h) =>
  `M${cx - w / 2} ${base} C${cx - w / 2 - w * 0.08} ${base - h * 0.5} ${cx - w * 0.22} ${base - h * 0.78} ${cx} ${base - h}` +
  ` C${cx + w * 0.22} ${base - h * 0.78} ${cx + w / 2 + w * 0.08} ${base - h * 0.5} ${cx + w / 2} ${base} Z`;

// Pointed (Mughal) arch opening.
const arch = (x, bottom, w, h) => {
  const spring = bottom - h * 0.62;
  const apex = bottom - h;
  return `M${x} ${bottom} V${spring} Q${x} ${apex + h * 0.12} ${x + w / 2} ${apex} Q${x + w} ${apex + h * 0.12} ${x + w} ${spring} V${bottom} Z`;
};

const star = (cx, cy, r, rot = -18) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + rr * Math.sin(a)).toFixed(2)},${(cy - rr * Math.cos(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
};

// Flag outline with a travelling wave (amplitude grows away from the pole).
const FLAG = { x: 64, y: 70, w: 118, h: 78 };
function flagOutline(phase) {
  const { x, y, w, h } = FLAG;
  const N = 14;
  const wave = (i) => {
    const t = i / N;
    return Math.sin(t * Math.PI * 2.2 - phase) * 6 * t;
  };
  const top = [];
  const bottom = [];
  for (let i = 0; i <= N; i++) {
    const px = x + (w * i) / N - Math.abs(wave(i)) * 0.6;
    top.push(`${px.toFixed(1)},${(y + wave(i)).toFixed(1)}`);
    bottom.push(`${px.toFixed(1)},${(y + h + wave(i)).toFixed(1)}`);
  }
  return `M${top.join(" L")} L${bottom.reverse().join(" L")} Z`;
}

const STARS = [
  [40, 30, 1.4], [92, 18, 1], [150, 42, 1.2], [210, 14, 1.6], [262, 36, 1], [318, 20, 1.3], [372, 44, 1], [420, 16, 1.5],
  [470, 34, 1.1], [520, 12, 1.4], [574, 30, 1], [612, 52, 1.3], [250, 70, 0.9], [440, 74, 1], [600, 92, 0.9], [20, 80, 1],
];

const RIVERS = ["Jhelum", "Chenab", "Ravi", "Sutlej", "Beas"];

export default function PunjabScene({ className = "" }) {
  const motion = !reducedMotion();
  const flagFrames = useMemo(() => [0, 1.6, 3.2, 4.8, 6.4].map(flagOutline), []);
  const stoneShade = "#8f3423";

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-white/15 ${className}`}>
      <svg viewBox="0 0 640 440" className="block h-auto w-full" role="img" aria-labelledby="punjab-scene-title">
        <title id="punjab-scene-title">
          Evening in Lahore: Badshahi Mosque, Minar-e-Pakistan and a waving Pakistani flag above the five rivers of Punjab
        </title>
        <defs>
          <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#141a42" />
            <stop offset="0.38" stopColor="#3b2a6b" />
            <stop offset="0.62" stopColor="#a6466f" />
            <stop offset="0.8" stopColor="#f08a4b" />
            <stop offset="0.86" stopColor="#fbc35a" />
          </linearGradient>
          <radialGradient id="ps-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset="0.35" stopColor="#fdd36a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ps-stone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0643f" />
            <stop offset="1" stopColor="#8f3423" />
          </linearGradient>
          <linearGradient id="ps-marble" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#f3ebe0" />
            <stop offset="1" stopColor="#cdbfae" />
          </linearGradient>
          <linearGradient id="ps-minar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#e9eef5" />
            <stop offset="1" stopColor="#aab6c8" />
          </linearGradient>
          <linearGradient id="ps-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a1f3f" />
            <stop offset="1" stopColor="#120d26" />
          </linearGradient>
          <linearGradient id="ps-river" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ps-flag-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.25" stopColor="#000" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="0.75" stopColor="#000" stopOpacity="0.22" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <clipPath id="ps-flag-clip">
            <path d={flagFrames[0]}>
              {motion && (
                <animate attributeName="d" dur="2.6s" repeatCount="indefinite" values={flagFrames.join(";")} />
              )}
            </path>
          </clipPath>
        </defs>

        {/* sky, sun, stars */}
        <rect width="640" height="440" fill="url(#ps-sky)" />
        <circle cx="318" cy="300" r="120" fill="url(#ps-sun)" />
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.8">
            {motion && (
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2.2 + (i % 5) * 0.7}s`} begin={`${(i % 7) * 0.4}s`} repeatCount="indefinite" />
            )}
          </circle>
        ))}
        {/* crescent moon */}
        <g transform="translate(612 122)">
          <circle r="16" fill="#fff6d8" />
          <circle cx="7" cy="-5" r="14" fill="#1d1f4b" />
        </g>

        {/* birds */}
        <g fill="none" stroke="#2a1630" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
          {motion && <animateTransform attributeName="transform" type="translate" values="-80 0; 720 -30" dur="26s" repeatCount="indefinite" />}
          <path d="M0 120 q5 -5 10 0 q5 -5 10 0" />
          <path d="M22 108 q4 -4 8 0 q4 -4 8 0" />
          <path d="M36 126 q3.5 -3.5 7 0 q3.5 -3.5 7 0" />
        </g>

        {/* far city silhouette */}
        <path d="M0 352 V330 h30 v-12 h18 v16 h26 v-22 h14 v22 h40 V352 Z M470 352 v-26 h20 v-10 h16 v36 Z M600 352 v-30 h16 v-8 h24 v38 Z" fill="#5a2a4f" opacity="0.6" />

        {/* ---------------------------------------------------- Badshahi Mosque */}
        <g>
          {/* tall corner minarets */}
          {[134, 466].map((cx) => (
            <g key={cx}>
              <rect x={cx - 9} y="128" width="18" height="224" fill="url(#ps-stone)" />
              <rect x={cx - 9} y="128" width="5" height="224" fill="#fff" opacity="0.12" />
              {[300, 240, 180].map((y) => (
                <g key={y}>
                  <rect x={cx - 13} y={y} width="26" height="5" fill="#f3ebe0" />
                  <rect x={cx - 11} y={y + 5} width="22" height="3" fill={stoneShade} />
                </g>
              ))}
              {/* chhatri on top */}
              <rect x={cx - 12} y="122" width="24" height="6" fill="#f3ebe0" />
              {[-9, -3, 3, 9].map((dx) => (
                <rect key={dx} x={cx + dx - 1.2} y="108" width="2.4" height="14" fill="#f3ebe0" />
              ))}
              <path d={onion(cx, 109, 26, 22)} fill="url(#ps-marble)" />
              <rect x={cx - 0.8} y="80" width="1.6" height="9" fill="#fbbf24" />
            </g>
          ))}

          {/* platform */}
          <rect x="112" y="350" width="376" height="10" fill="#6e2618" />
          {/* prayer hall body */}
          <rect x="160" y="268" width="280" height="84" fill="url(#ps-stone)" />
          {/* parapet merlons */}
          {Array.from({ length: 24 }).map((_, i) => (
            <rect key={i} x={162 + i * 11.6} y="262" width="6" height="7" fill="#c75a38" />
          ))}
          {/* side arcades */}
          {[170, 202, 362, 394].map((x) => (
            <g key={x}>
              <path d={arch(x - 2, 346, 30, 66)} fill="#f3ebe0" opacity="0.9" />
              <path d={arch(x + 2, 346, 22, 58)} fill="#4a1810" />
            </g>
          ))}
          {/* central iwan (portal) */}
          <rect x="256" y="226" width="88" height="126" fill="#c85c39" />
          <rect x="256" y="226" width="88" height="126" fill="none" stroke="#f3ebe0" strokeWidth="3" />
          <path d={arch(268, 350, 64, 108)} fill="#f3ebe0" />
          <path d={arch(274, 350, 52, 100)} fill="#3d120c" />
          <path d={arch(286, 350, 28, 52)} fill="#5c1d12" />
          {/* little kiosks on the portal corners */}
          {[262, 338].map((cx) => (
            <g key={cx}>
              <rect x={cx - 4} y="210" width="8" height="16" fill="#f3ebe0" />
              <path d={onion(cx, 211, 12, 11)} fill="url(#ps-marble)" />
            </g>
          ))}
          {/* hall corner turrets */}
          {[164, 436].map((cx) => (
            <g key={cx}>
              <rect x={cx - 6} y="228" width="12" height="40" fill="url(#ps-stone)" />
              <rect x={cx - 8} y="226" width="16" height="4" fill="#f3ebe0" />
              <path d={onion(cx, 227, 16, 15)} fill="url(#ps-marble)" />
            </g>
          ))}
          {/* three marble domes */}
          {[
            [210, 268, 58, 50, 10],
            [390, 268, 58, 50, 10],
            [300, 228, 92, 76, 14],
          ].map(([cx, base, w, h, drum]) => (
            <g key={cx}>
              <rect x={cx - w / 2 + 4} y={base - drum} width={w - 8} height={drum} fill="#e9dfd1" />
              <path d={onion(cx, base - drum, w, h)} fill="url(#ps-marble)" />
              <path d={onion(cx, base - drum, w, h)} fill="none" stroke="#cdbfae" strokeWidth="0.8" />
              <rect x={cx - 1} y={base - drum - h - 12} width="2" height="14" fill="#fbbf24" />
              <circle cx={cx} cy={base - drum - h - 13} r="2.4" fill="#fbbf24" />
            </g>
          ))}
        </g>

        {/* ---------------------------------------------------- Minar-e-Pakistan */}
        <g>
          {/* flower-petal base */}
          {[
            [-44, 0.75], [-26, 0.9], [-8, 1], [10, 1], [28, 0.9], [46, 0.75],
          ].map(([dx, s]) => (
            <path
              key={dx}
              d={`M${560 + dx - 10} 352 Q${560 + dx - 12} ${352 - 34 * s} ${560 + dx} ${352 - 44 * s} Q${560 + dx + 12} ${352 - 34 * s} ${560 + dx + 10} 352 Z`}
              fill="url(#ps-minar)"
              stroke="#c5cfdd"
              strokeWidth="0.6"
            />
          ))}
          {/* tapering tower */}
          <path d="M546 330 L554 92 L566 92 L574 330 Z" fill="url(#ps-minar)" />
          <path d="M563 92 L566 92 L574 330 L568 330 Z" fill="#9aa7bb" opacity="0.5" />
          {/* galleries */}
          <rect x="545" y="196" width="30" height="5" rx="1" fill="#f8fafc" />
          <rect x="549" y="140" width="22" height="4" rx="1" fill="#f8fafc" />
          {/* top dome + finial */}
          <rect x="552" y="88" width="16" height="5" fill="#f8fafc" />
          <path d={onion(560, 89, 18, 18)} fill="url(#ps-minar)" />
          <rect x="559.2" y="58" width="1.6" height="13" fill="#fbbf24" />
        </g>

        {/* ---------------------------------------------------- Pakistani flag */}
        <g>
          <rect x="60" y="62" width="4" height="290" rx="2" fill="#d4d4d8" />
          <circle cx="62" cy="60" r="5" fill="#fbbf24" />
          <g clipPath="url(#ps-flag-clip)">
            <rect x={FLAG.x - 4} y={FLAG.y - 10} width={FLAG.w + 8} height={FLAG.h + 20} fill="#01411c" />
            <rect x={FLAG.x - 4} y={FLAG.y - 10} width={FLAG.w / 4 + 4} height={FLAG.h + 20} fill="#ffffff" />
            {/* crescent + star, opening toward the upper fly */}
            <circle cx="133" cy="111" r="22" fill="#ffffff" />
            <circle cx="139" cy="106" r="19" fill="#01411c" />
            <path d={star(145, 99, 7.5, 36)} fill="#ffffff" />
            {/* moving fold shading */}
            <rect x={FLAG.x - 60} y={FLAG.y - 10} width="120" height={FLAG.h + 20} fill="url(#ps-flag-shade)">
              {motion && <animate attributeName="x" values={`${FLAG.x - 120};${FLAG.x + FLAG.w}`} dur="2.6s" repeatCount="indefinite" />}
            </rect>
          </g>
        </g>

        {/* ---------------------------------------------------- ground + five rivers */}
        <rect y="352" width="640" height="88" fill="url(#ps-ground)" />
        {RIVERS.map((_, i) => {
          const y = 368 + i * 15;
          return (
            <path
              key={i}
              d={`M-20 ${y} Q80 ${y - 6} 160 ${y} T320 ${y} T480 ${y} T660 ${y}`}
              fill="none"
              stroke="url(#ps-river)"
              strokeWidth={2.2 - i * 0.2}
              strokeLinecap="round"
              strokeDasharray="38 22"
              opacity={0.85 - i * 0.1}
            >
              {motion && <animate attributeName="stroke-dashoffset" values="0;-120" dur={`${4 + i * 0.6}s`} repeatCount="indefinite" />}
            </path>
          );
        })}
      </svg>

      {/* ---------------------------------------------------- text overlays */}
      <div className="pointer-events-none absolute inset-0">
        {/* caption, top centre */}
        <p className="absolute left-[47%] top-[2%] -translate-x-1/2 font-urdu text-xl leading-[2] text-gold-200 drop-shadow sm:text-2xl" dir="rtl" lang="ur">
          پنجاب
        </p>

        {/* landmark labels, each pinned to its building with a short stem */}
        <span className="absolute left-[46.9%] top-[19%] hidden -translate-x-1/2 flex-col items-center sm:flex">
          <span className="rounded-xl bg-black/35 px-2.5 py-1 text-center ring-1 ring-white/20 backdrop-blur-md">
            <span className="block text-[11px] font-bold text-white">Badshahi Mosque</span>
            <span className="block text-[10px] text-white/75">Lahore · 1673</span>
          </span>
          <span className="h-3 w-px bg-white/50" />
        </span>
        <span className="absolute right-[1.5%] top-[2.5%] hidden flex-col items-center sm:flex">
          <span className="rounded-xl bg-black/35 px-2.5 py-1 text-center ring-1 ring-white/20 backdrop-blur-md">
            <span className="block text-[11px] font-bold text-white">Minar-e-Pakistan</span>
            <span className="block text-[10px] text-white/75">Lahore · 1968</span>
          </span>
        </span>

        <div className="absolute inset-x-0 bottom-2 text-center font-semibold uppercase sm:bottom-3">
          <p className="hidden text-[9px] tracking-[0.3em] text-gold-200 sm:block">Land of five rivers</p>
          <p className="whitespace-nowrap text-[9px] tracking-[0.2em] text-sky-100/75 sm:text-[10px]">{RIVERS.join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}
