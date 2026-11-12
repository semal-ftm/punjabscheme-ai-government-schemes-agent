import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Sparkles } from "lucide-react";
import { api } from "../../api.js";
import { VERDICTS } from "../../lib/constants.js";
import { hexLayout, hexPoints } from "../../lib/districts.js";
import { Spinner } from "../States.jsx";

const LAYOUT = hexLayout(22, 48);
// Forest-green scale from light to dark.
const SCALE = ["#dfe9d6", "#c3d6b4", "#9fbd89", "#79a062", "#5a8546", "#36582b"];

/** Runs `fn` over `items` with at most `limit` requests in flight. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]).catch(() => null);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Hexagon tile map of Punjab's districts. For each district the real rule engine is asked which schemes a
 * resident can use based on location alone (province + district rules), so the colours are not made up.
 */
export default function PunjabMap() {
  const [data, setData] = useState(null); // name -> [{id, name, level}]
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState("Lahore");

  useEffect(() => {
    const ctrl = new AbortController();
    pool(LAYOUT.tiles, 6, (t) =>
      api.eligibility({ district: t.name }, [], { signal: ctrl.signal }).then((r) => [
        t.name,
        (r.results || [])
          .filter((x) => x.verdict !== VERDICTS.NOT_ELIGIBLE)
          .map((x) => ({ id: x.scheme_id, name: x.scheme_name, level: x.level })),
      ])
    ).then((rows) => {
      if (ctrl.signal.aborted) return;
      const ok = rows.filter(Boolean);
      if (!ok.length) setError("Start the backend to load the map data.");
      else setData(Object.fromEntries(ok));
    });
    return () => ctrl.abort();
  }, []);

  // Schemes that only some districts get (e.g. Zewar-e-Taleem in 17 low-literacy districts).
  const { special, min, max } = useMemo(() => {
    if (!data) return { special: new Set(), min: 0, max: 0 };
    const counts = {};
    Object.values(data).forEach((list) => list.forEach((s) => (counts[s.id] = (counts[s.id] || 0) + 1)));
    const n = Object.keys(data).length;
    const sizes = Object.values(data).map((l) => l.length);
    return {
      special: new Set(Object.keys(counts).filter((id) => counts[id] < n)),
      min: Math.min(...sizes),
      max: Math.max(...sizes),
    };
  }, [data]);

  const colorFor = (name) => {
    const n = data?.[name]?.length;
    if (n == null) return "#efe6d5";
    const t = max === min ? 1 : (n - min) / (max - min);
    return SCALE[Math.round(1 + t * (SCALE.length - 2))];
  };

  const focus = hover || selected;
  const list = data?.[focus] || [];
  const local = list.filter((s) => special.has(s.id));

  return (
    <section className="card folk-top overflow-hidden" aria-labelledby="map-h">
      <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
        <div className="relative min-w-0 bg-gradient-to-br from-cream-100 to-emerald-50/40 p-4 sm:p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 id="map-h" className="section-title flex items-center gap-2">
              <MapPin className="h-5 w-5 text-plum-600" aria-hidden /> Schemes across Punjab
            </h2>
            {!data && !error && <Spinner className="h-4 w-4 text-emerald-700" />}
          </div>
          <p className="text-xs text-slate-500">Hover or tap a district. Tiles follow real geography (not to scale).</p>
          <svg
            viewBox={`0 0 ${LAYOUT.width} ${LAYOUT.height}`}
            className="mx-auto mt-2 block max-h-[420px] w-full drop-shadow-sm"
            role="group"
            aria-label="Map of Punjab districts"
          >
            {LAYOUT.tiles.map((t) => {
              const on = t.name === focus;
              return (
                <g
                  key={t.name}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.name}: ${data?.[t.name]?.length ?? "…"} schemes`}
                  aria-pressed={t.name === selected}
                  onMouseEnter={() => setHover(t.name)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(t.name)}
                  onBlur={() => setHover(null)}
                  onClick={() => setSelected(t.name)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(t.name))}
                  className="cursor-pointer outline-none"
                  style={{ transformOrigin: `${t.cx}px ${t.cy}px`, transform: on ? "scale(1.18)" : "none", transition: "transform .2s" }}
                >
                  <polygon
                    points={hexPoints(t.cx, t.cy, LAYOUT.radius - 1.5)}
                    fill={on ? "#763a52" : colorFor(t.name)}
                    stroke={t.name === selected ? "#c08f2f" : "#fffdf9"}
                    strokeWidth={t.name === selected ? 2.5 : 1.5}
                    style={{ transition: "fill .25s" }}
                  />
                  <text
                    x={t.cx}
                    y={t.cy + 3.5}
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                    style={{ fontSize: 9.5, fontWeight: 700, fill: on || (data?.[t.name]?.length ?? 0) >= max ? "#fff" : "#26211c" }}
                  >
                    {t.abbr}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            Fewer
            {SCALE.slice(1).map((c) => (
              <span key={c} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
            ))}
            More schemes
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-t border-slate-200 p-5 md:border-l md:border-t-0">
          {error ? (
            <p className="muted">{error}</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-500">District</p>
              <h3 className="font-display text-2xl font-semibold text-plum-700">{focus}</h3>
              <p className="mt-1 text-sm text-navy-700">
                {data ? (
                  <>
                    <span className="font-display text-3xl font-bold text-emerald-700">{list.length}</span> schemes are open to
                    residents here, based on the official location rules.
                  </>
                ) : (
                  "Checking the official rules for every district…"
                )}
              </p>
              {local.length > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-600 ring-1 ring-gold-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Includes {local.map((s) => s.name).join(", ")}, only in selected districts
                </p>
              )}
              <ul className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1 scroll-thin md:max-h-[300px]">
                {list.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/schemes/${encodeURIComponent(s.id)}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-navy-800 hover:bg-emerald-50"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className={`shrink-0 text-[10px] font-bold ${s.level === "federal" ? "text-violet-700" : "text-sky-700"}`}>
                        {s.level === "federal" ? "FEDERAL" : "PROVINCIAL"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">
                Personal rules (age, income, education) are checked in the quiz or the Eligibility Checker.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
