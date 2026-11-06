import {
  Award, Bike, BookOpen, Coins, Cpu, Factory, Flower2, Gem, GraduationCap, HandCoins, HandHeart, HardHat, HeartPulse, House,
  Landmark, Laptop, Milk, Pill, Rocket, ShoppingBasket, Sparkles, Sprout, Stethoscope, Store, Sun, Tractor, TreePine, Users,
  Wheat, Wifi, Zap,
} from "lucide-react";

/*
 * Illustrated artwork for schemes. Each scheme is mapped to a visual theme using ONLY its own name / sector /
 * department / summary text, so the picture never claims anything the official data does not say.
 * Everything is inline SVG + icons: no network, no licensing questions, crisp at any size, ~0 KB.
 */
import SchemeScene from "./SchemeScenes.jsx";

export const THEMES = {
  housing: { label: "Housing", from: "#f6a723", to: "#b4460b", hero: House, props: [TreePine, Sun], ground: "village",
    match: ["housing", "chhat", "ghar", "home", "house", "makan"] },
  technology: { label: "Laptops & tech", from: "#7c6cf2", to: "#2e1f7a", hero: Laptop, props: [Wifi, Cpu], ground: "city",
    match: ["laptop", "technology", "digital", "computer"] },
  education: { label: "Education", from: "#22a7e8", to: "#2f3aa8", hero: GraduationCap, props: [BookOpen, Award], ground: "city",
    match: ["education", "scholarship", "taleem", "school", "student", "wazaif", "wazifa", "honhaar", "college", "university"] },
  transport: { label: "Transport", from: "#16b8a6", to: "#0b5d75", hero: Bike, props: [Zap, Sparkles], ground: "road",
    match: ["bike", "taxi", "transport", "vehicle", "bus"] },
  energy: { label: "Solar & energy", from: "#fcc419", to: "#e2580b", hero: Sun, props: [Zap, Sparkles], ground: "hills",
    match: ["solar", "energy", "electricity", " power "] },
  livestock: { label: "Livestock", from: "#7cc242", to: "#2f5a12", hero: Milk, props: [Sprout, Sun], ground: "fields",
    match: ["livestock", "cattle", "dairy", "veterinary", "poultry"] },
  agriculture: { label: "Farming", from: "#9bd133", to: "#1f7a3a", hero: Wheat, props: [Tractor, Sun], ground: "fields",
    match: ["agri", "kissan", "kisan", "farm", "wheat", "tractor", "crop"] },
  health: { label: "Health", from: "#fb7185", to: "#a3123a", hero: HeartPulse, props: [Stethoscope, Pill], ground: "city",
    match: ["health", "sehat", "cancer", "medical", "hospital", "medicine", "treatment"] },
  women: { label: "Women & girls", from: "#e23d8f", to: "#6d28d9", hero: Flower2, props: [Gem, HandHeart], ground: "hills",
    match: ["dhee", "women", "woman", "girl", "daughter", "marriage", "female"] },
  industry: { label: "Workers", from: "#5b6b86", to: "#17213b", hero: Factory, props: [HardHat, Zap], ground: "city",
    match: ["worker", "labour", "labor", "pessi", "industr", "employee", "welfare fund"] },
  business: { label: "Loans & business", from: "#12b886", to: "#0b5e5a", hero: HandCoins, props: [Store, Coins], ground: "city",
    match: ["loan", "business", "karobar", "mukhtar", "livelihood", "financ", "enterprise", "startup"] },
  social: { label: "Family support", from: "#10a37f", to: "#123f4a", hero: HandHeart, props: [Users, ShoppingBasket], ground: "hills",
    match: ["social protection", "ration", "himmat", "kafaalat", "relief", "poverty", "nashonuma", "disab", "cash"] },
  youth: { label: "Youth", from: "#8b5cf6", to: "#c81e6f", hero: Rocket, props: [Sparkles, Award], ground: "hills",
    match: ["youth", "skill", "internship", "young"] },
  punjab: { label: "Government programme", from: "#2c3c68", to: "#0f6b62", hero: Landmark, props: [Sparkles, Sun], ground: "skyline",
    match: [] },
};

const ORDER = ["technology", "transport", "energy", "livestock", "agriculture", "health", "housing", "education", "women",
  "business", "industry", "social", "youth"];

/** Pick a theme key for a scheme (name/sector first, then the summary). */
export function themeKeyFor(scheme) {
  if (!scheme) return "punjab";
  const primary = ` ${scheme.name || ""} ${scheme.sector || ""} ${scheme.department || ""} `.toLowerCase();
  const secondary = ` ${scheme.summary || ""} `.toLowerCase();
  for (const text of [primary, secondary]) {
    const key = ORDER.find((k) => THEMES[k].match.some((w) => text.includes(w)));
    if (key) return key;
  }
  return "punjab";
}

/* ------------------------------------------------------------- silhouettes */

/** Lahore-inspired skyline: mosque domes, minarets and a tapering tower. */
export function PunjabSkyline({ className = "", style }) {
  const onion = (cx, base, w, h) =>
    `M${cx - w / 2} ${base} C${cx - w / 2 - 1} ${base - h * 0.45} ${cx - w * 0.2} ${base - h * 0.75} ${cx} ${base - h}` +
    ` C${cx + w * 0.2} ${base - h * 0.75} ${cx + w / 2 + 1} ${base - h * 0.45} ${cx + w / 2} ${base} Z`;
  const minaret = (cx, top) => (
    <g key={cx}>
      <rect x={cx - 3.5} y={top} width="7" height={70 - top} />
      <rect x={cx - 5.5} y={top + 10} width="11" height="2" />
      <rect x={cx - 5.5} y={top + 26} width="11" height="2" />
      <path d={onion(cx, top + 1, 10, 9)} />
      <rect x={cx - 0.6} y={top - 13} width="1.2" height="6" />
    </g>
  );
  return (
    <svg viewBox="0 0 400 80" preserveAspectRatio="xMidYMax slice" className={className} style={style} fill="currentColor" aria-hidden>
      {/* low old-city buildings */}
      <rect x="0" y="56" width="22" height="24" />
      <rect x="24" y="48" width="18" height="32" />
      <rect x="44" y="60" width="26" height="20" />
      <rect x="72" y="52" width="16" height="28" />
      <path d={onion(80, 52, 12, 10)} />
      <rect x="90" y="62" width="24" height="18" />
      {/* mosque */}
      {minaret(124, 22)}
      {minaret(276, 22)}
      <rect x="136" y="50" width="128" height="30" />
      <path d={onion(200, 50, 46, 34)} />
      <rect x="199.3" y="8" width="1.4" height="10" />
      <path d={onion(166, 50, 22, 17)} />
      <path d={onion(234, 50, 22, 17)} />
      {/* tapering tower */}
      <path d="M326 80 L332 22 L338 22 L344 80 Z" />
      <path d={onion(335, 23, 10, 8)} />
      <rect x="318" y="72" width="34" height="8" />
      {/* right buildings */}
      <rect x="296" y="60" width="18" height="20" />
      <rect x="356" y="50" width="20" height="30" />
      <rect x="378" y="58" width="22" height="22" />
    </svg>
  );
}

/** Stable 0..3 variation per scheme (mirrored and/or evening light) so cards of one theme don't look identical. */
function variantFor(scheme) {
  if (!scheme?.id) return 0;
  let h = 0;
  for (const ch of scheme.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 4;
}

const SIZES = {
  card: { box: "h-44" },
  feature: { box: "h-44" },
  banner: { box: "h-48 sm:h-60" },
};

/**
 * Illustrated header for a scheme. `children` render on top (badges, buttons).
 * Pass `scheme` (preferred) or a `theme` key.
 */
export default function SchemeArt({ scheme, theme, size = "card", className = "", children, rounded = "" }) {
  const key = theme || themeKeyFor(scheme);
  const t = THEMES[key] || THEMES.punjab;
  const s = SIZES[size] || SIZES.card;
  return (
    <div
      className={`relative isolate overflow-hidden ${s.box} ${rounded} ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)` }}
      role="img"
      aria-label={`${t.label} illustration`}
    >
      {/* illustrated scene; gentle zoom on card hover */}
      <SchemeScene theme={key} variant={variantFor(scheme)} className="origin-bottom transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
      {/* soft shading so badges and text stay readable on any scene */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/25 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" aria-hidden />
      {children && <div className="absolute inset-0">{children}</div>}
    </div>
  );
}
