import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import SchemeArt from "./art/SchemeArt.jsx";

/**
 * Horizontal, snap-scrolling row of schemes whose rules were verified by a person (origin === "curated").
 * "Featured" here means verified, never "popular": the app has no popularity data and does not invent any.
 */
export default function FeaturedSchemes({ schemes, title = "Checked by a person, quote by quote", moreLink }) {
  const items = (schemes || []).filter((s) => s.origin === "curated");
  if (!items.length) return null;
  return (
    <section aria-labelledby="featured-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">Featured · verified rules</p>
          <h2 id="featured-h" className="text-xl font-bold tracking-tight text-navy-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">Every eligibility rule in these schemes is copied word for word from the official page.</p>
        </div>
        {moreLink && (
          <Link to={moreLink} className="link inline-flex items-center gap-1 text-sm">
            See all verified <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 scroll-thin sm:mx-0 sm:px-0">
        {items.map((s, n) => (
          <Link
            key={s.id}
            to={`/schemes/${encodeURIComponent(s.id)}`}
            className="group w-64 shrink-0 animate-fade-up snap-start overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
            style={{ animationDelay: `${Math.min(n, 6) * 60}ms` }}
          >
            <SchemeArt scheme={s} className="!h-32">
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="h-3 w-3" aria-hidden /> Rules verified
              </span>
            </SchemeArt>
            <div className="p-4">
              <p className="line-clamp-2 min-h-[2.5rem] font-display text-sm font-bold leading-snug text-navy-900">{s.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {s.level === "federal" ? "Federal" : "Provincial (Punjab)"} · {s.sector || "Programme"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
