import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, ExternalLink, ListChecks, RotateCw, ShieldCheck } from "lucide-react";
import { VerifiedSeal } from "../Badges.jsx";
import { formatDate, hostOf } from "../../lib/format.js";
import { schemeImage } from "../../lib/constants.js";

/** Scheme card that flips on hover / focus / tap to show the official facts behind it. */
export default function FlipSchemeCard({ scheme: s, Icon, tone }) {
  const [flipped, setFlipped] = useState(false);
  const deadline = s.deadline ? Math.ceil((new Date(s.deadline) - new Date()) / 86400000) : null;
  return (
    <div className="flip h-[19rem]" data-flipped={flipped}>
      <div className="flip-inner">
        {/* Front */}
        <article className="flip-face card flex flex-col overflow-hidden">
          <span className="relative block h-28 shrink-0 overflow-hidden">
            <img src={schemeImage(s)} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className={`absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-lg shadow ${tone}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-navy-950/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur"
              aria-label={`Show official facts for ${s.name}`}
            >
              <RotateCw className="h-3 w-3" aria-hidden /> Flip
            </button>
          </span>
          <div className="flex flex-1 flex-col items-start p-4 pt-3">
            <VerifiedSeal rulesStatus={s.rules_status} sourceUrl={s.source_url} />
            <p className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-navy-900">{s.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.summary}</p>
            <span className="mt-auto pt-2 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
              {s.level === "federal" ? "Federal" : "Provincial"}
            </span>
          </div>
        </article>

        {/* Back */}
        <article className="flip-face flip-back jaali-dark flex flex-col rounded-2xl p-4 text-cream-50 shadow-lift">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">Official facts</p>
          <p className="mt-1 line-clamp-2 font-display text-base font-semibold text-white">{s.name}</p>
          <ul className="mt-3 space-y-2 text-xs text-cream-100">
            {s.department && (
              <li className="flex gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-gold-300" aria-hidden />
                <span className="line-clamp-2">{s.department}</span>
              </li>
            )}
            {s.criteria_count > 0 && (
              <li className="flex gap-2">
                <ListChecks className="h-4 w-4 shrink-0 text-gold-300" aria-hidden />
                {s.criteria_count} eligibility rules, each quoted word-for-word
              </li>
            )}
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-gold-300" aria-hidden />
              Checked on {hostOf(s.source_url) || "the official site"}, {formatDate(s.last_verified)}
            </li>
          </ul>
          {deadline != null && deadline >= 0 && (
            <p className="mt-3 rounded-lg bg-gold-400/20 px-2 py-1 text-xs font-semibold text-gold-200 ring-1 ring-gold-300/40">
              ⏳ {deadline} days left to apply
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            <Link to={`/schemes/${encodeURIComponent(s.id)}`} className="btn bg-gold-400 !px-3 !py-1.5 text-xs text-navy-950 hover:bg-gold-300">
              Details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {s.application_url && (
              <a
                href={s.application_url}
                target="_blank"
                rel="noreferrer"
                className="btn border border-white/25 bg-white/10 !px-3 !py-1.5 text-xs text-white hover:bg-white/20"
              >
                Official portal <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            {flipped && (
              <button type="button" onClick={() => setFlipped(false)} className="ml-auto text-[11px] text-cream-200/70 underline">
                Back
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
