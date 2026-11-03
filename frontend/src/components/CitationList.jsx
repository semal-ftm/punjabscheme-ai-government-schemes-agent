import { ExternalLink, FileText } from "lucide-react";
import { hostOf } from "../lib/format.js";

/** Cited evidence under an assistant message. Items: {n, kind, title, url, date, text}. */
export default function CitationList({ citations = [], idPrefix, activeN }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
      <ol className="space-y-1.5">
        {citations.map((c) => (
          <li
            key={c.n}
            id={`${idPrefix}-src-${c.n}`}
            className={`flex gap-2 rounded-lg p-1.5 text-sm transition-colors ${activeN === c.n ? "flash bg-emerald-50 ring-1 ring-emerald-300" : ""}`}
          >
            <span className="mt-0.5 grid h-5 min-w-5 shrink-0 place-items-center rounded-md bg-navy-900 px-1 text-[11px] font-bold text-white">
              {c.n}
            </span>
            <div className="min-w-0 flex-1">
              {c.url ? (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-medium text-navy-900 hover:text-emerald-700 hover:underline" dir="auto">
                  <span className="break-words">{c.title || hostOf(c.url)}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-navy-900" dir="auto">
                  <FileText className="h-3 w-3 shrink-0" aria-hidden /> {c.title}
                </span>
              )}
              <p className="text-xs text-slate-500">
                {c.kind}
                {c.url ? ` · ${hostOf(c.url)}` : ""} · verified/fetched: {c.date || "Not Officially Confirmed"}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
