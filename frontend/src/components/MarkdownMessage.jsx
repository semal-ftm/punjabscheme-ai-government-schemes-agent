import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { urduClass } from "../lib/format.js";

const CITE_HREF = "#cite-";

// "[2]" or "[1, 3]" -> markdown links "[2](#cite-2)" that we render as superscript chips.
// Skip markers already followed by "(" (real markdown links) or ":" (reference definitions).
function linkCitations(text) {
  return (text || "").replace(/\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\](?![(:])/g, (_, nums) =>
    nums
      .split(",")
      .map((n) => `[${n.trim()}](${CITE_HREF}${n.trim()})`)
      .join("")
  );
}

function MarkdownMessage({ text, validCites, onCite }) {
  return (
    <div dir="auto" className={`md ${urduClass(text)}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children }) => {
            if (href.startsWith(CITE_HREF)) {
              const n = Number(href.slice(CITE_HREF.length));
              const known = !validCites || validCites.has(n);
              return (
                <sup>
                  <button
                    type="button"
                    onClick={() => known && onCite?.(n)}
                    disabled={!known}
                    className="mx-0.5 inline-grid h-4 min-w-4 place-items-center rounded bg-emerald-100 px-1 align-super text-[10px] font-bold not-italic leading-none text-emerald-800 no-underline hover:bg-emerald-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400"
                    aria-label={`Source ${n}`}
                    title={`Show source ${n}`}
                  >
                    {n}
                  </button>
                </sup>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {linkCitations(text)}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessage);
