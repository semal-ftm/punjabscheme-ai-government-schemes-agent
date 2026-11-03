/** Renders a unified diff: "+" lines green, "-" lines red, "@@" hunks muted. */
export default function DiffView({ diff }) {
  if (!diff) return <p className="muted">No text diff stored for this event.</p>;
  const lines = diff.split(/\r?\n/);
  return (
    <pre className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs leading-relaxed scroll-thin">
      {lines.map((line, i) => {
        let cls = "text-slate-300";
        if (line.startsWith("+++") || line.startsWith("---")) cls = "text-slate-400 font-semibold";
        else if (line.startsWith("+")) cls = "bg-emerald-900/50 text-emerald-200";
        else if (line.startsWith("-")) cls = "bg-rose-900/50 text-rose-200";
        else if (line.startsWith("@@")) cls = "text-sky-300";
        return (
          <div key={i} dir="auto" className={`whitespace-pre-wrap break-words px-1 ${cls}`}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
