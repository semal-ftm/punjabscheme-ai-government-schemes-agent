import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { LevelBadge } from "./Badges.jsx";

/**
 * Searchable multi-select of schemes.
 * schemes: [{id, name, level, origin}], value: [id], onChange(ids), max: number.
 */
export default function SchemePicker({ schemes = [], value = [], onChange, max = 4, placeholder = "Search schemes...", label }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const byId = useMemo(() => Object.fromEntries(schemes.map((s) => [s.id, s])), [schemes]);
  const full = value.length >= max;

  const matches = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return schemes
      .filter((s) => !value.includes(s.id))
      .filter((s) => !ql || `${s.name} ${s.sector || ""} ${s.department || ""}`.toLowerCase().includes(ql))
      .slice(0, 30);
  }, [schemes, value, q]);

  const add = (id) => {
    if (full) return;
    onChange([...value, id]);
    setQ("");
  };

  return (
    <div>
      {label && <p className="label">{label}</p>}
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-navy-900 py-1 pl-3 pr-1 text-sm text-white">
              <span className="truncate">{byId[id]?.name || id}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="rounded-full p-0.5 hover:bg-navy-700"
                aria-label={`Remove ${byId[id]?.name || id}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) {
              e.preventDefault();
              add(matches[0].id);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          disabled={full}
          placeholder={full ? `Maximum ${max} selected` : placeholder}
          className="input pl-9"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {open && !full && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg scroll-thin">
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No matching schemes</li>}
            {matches.map((s) => (
              <li key={s.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 focus:bg-slate-50"
                >
                  <span className="min-w-0 truncate text-navy-900">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {s.origin === "curated" && <span className="text-[10px] font-semibold text-emerald-700">VERIFIED</span>}
                    <LevelBadge level={s.level} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
