import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "../States.jsx";
import SchemeArt, { THEMES, themeKeyFor } from "../art/SchemeArt.jsx";
import { CountUp } from "./Animated.jsx";

// Tiles use the same theme mapping as the Explore page's "Browse by need" filter, so the count on a tile
// always equals the number of results after clicking it.
const SUBTITLES = {
  social: "Cash help, ration, Kafaalat", education: "Scholarships, stipends, schools", agriculture: "Kissan card, machinery, inputs",
  health: "Treatment & health cover", youth: "Internships & skills", business: "Interest-free financing", housing: "Build or repair a home",
  transport: "e-Bikes and transport cards", livestock: "Livestock cards & assets", energy: "Solar for homes & tubewells",
  technology: "Laptops for students", women: "Support for women & daughters", industry: "Worker welfare & social security",
  punjab: "Other government programmes",
};

function FeatureTile({ k, items }) {
  const t = THEMES[k];
  return (
    <Link
      to={`/schemes?theme=${k}`}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <SchemeArt theme={k} size="feature" className="!h-40">
        <span className="absolute bottom-3 left-4 text-4xl font-extrabold leading-none text-white drop-shadow">
          <CountUp value={items.length} />
          <span className="ml-1.5 text-sm font-semibold text-white/85">schemes</span>
        </span>
      </SchemeArt>
      <div className="flex flex-1 items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-navy-900">{t.label}</p>
          <p className="text-sm text-slate-500">{SUBTITLES[k]}</p>
          <ul className="mt-2 space-y-0.5 text-sm text-navy-700">
            {items.slice(0, 2).map((s) => (
              <li key={s.id} className="truncate">• {s.name}</li>
            ))}
          </ul>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700 transition group-hover:bg-navy-900 group-hover:text-white">
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function Tile({ k, items }) {
  const t = THEMES[k];
  const Icon = t.hero;
  return (
    <Link
      to={`/schemes?theme=${k}`}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <span
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] transition-transform duration-500 group-hover:scale-125"
        style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
        aria-hidden
      />
      <span
        className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
        style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 font-semibold text-navy-900">{t.label}</p>
      <p className="text-xs leading-snug text-slate-500">{SUBTITLES[k]}</p>
      <p className="mt-auto flex items-center justify-between pt-3">
        <span className="text-2xl font-extrabold text-navy-900">
          <CountUp value={items.length} />
          <span className="ml-1 text-xs font-medium text-slate-500">schemes</span>
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-navy-900" aria-hidden />
      </p>
    </Link>
  );
}

/** `schemes` = GET /api/schemes (loaded once by the dashboard). */
export default function LifeNeeds({ schemes, loading }) {
  const groups = useMemo(() => {
    if (!schemes) return [];
    const by = {};
    schemes.forEach((s) => {
      const k = themeKeyFor(s);
      (by[k] ||= []).push(s);
    });
    return Object.entries(by)
      .filter(([k]) => k !== "punjab")
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);
  }, [schemes]);

  return (
    <section aria-labelledby="needs-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Browse by what you need</p>
          <h2 id="needs-h" className="text-xl font-bold tracking-tight text-navy-900">What kind of help are you looking for?</h2>
        </div>
        <Link to="/schemes" className="link inline-flex items-center gap-1 text-sm">
          All schemes <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {loading && !schemes ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          <Skeleton className="col-span-2 h-72 rounded-3xl sm:col-span-1 lg:col-span-3" />
          <Skeleton className="col-span-2 h-72 rounded-3xl sm:col-span-1 lg:col-span-3" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {groups.map(([k, items], n) => (
            <div
              key={k}
              className={`flex animate-fade-up ${n < 2 ? "col-span-2 sm:col-span-1 lg:col-span-3" : "lg:col-span-1"}`}
              style={{ animationDelay: `${n * 70}ms` }}
            >
              {n < 2 ? <FeatureTile k={k} items={items} /> : <Tile k={k} items={items} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
