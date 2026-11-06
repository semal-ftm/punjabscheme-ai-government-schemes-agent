import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Columns3, Landmark, LayoutGrid, Search, SearchX, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { api } from "../api.js";
import SchemeCard from "../components/SchemeCard.jsx";
import { PunjabSkyline, THEMES, themeKeyFor } from "../components/art/SchemeArt.jsx";
import FeaturedSchemes from "../components/FeaturedSchemes.jsx";
import { EmptyState, ErrorState, Skeleton } from "../components/States.jsx";
import { CountUp } from "../components/dashboard/Animated.jsx";
import { CATEGORIES, LEVELS, STATUSES } from "../lib/constants.js";
import { STATUS_STYLE } from "../components/StatusBadge.jsx";

const RUNNING_NOW = new Set(["Open", "Ongoing"]);
const STATUS_RANK = { Open: 0, Ongoing: 1, Upcoming: 2, Closed: 3 };
import { useAsync } from "../lib/useAsync.js";

const MAX_COMPARE = 4;

const CATEGORY_STYLE = {
  "": { label: "All schemes", sub: "Every level of government", tint: "from-navy-800 to-navy-950", icon: LayoutGrid },
  cm_punjab: { label: "CM Punjab", sub: "Chief Minister initiatives", tint: "from-emerald-500 to-teal-700", icon: Landmark },
  punjab_department: { label: "Punjab Departments", sub: "PSPA, PESSI, PWWF…", tint: "from-sky-500 to-indigo-700", icon: Landmark },
  federal: { label: "Federal", sub: "Government of Pakistan", tint: "from-violet-500 to-phulkari-600", icon: Landmark },
};

const haystack = (s) => `${s.name} ${s.name_ur || ""} ${s.summary || ""} ${s.department || ""} ${s.sector || ""}`.toLowerCase();

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-navy-900 text-white shadow-md" : "bg-white text-navy-700 ring-1 ring-slate-200 hover:ring-navy-300"
      }`}
    >
      {children}
    </button>
  );
}

function CardSkeletonArt() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70" aria-hidden>
      <Skeleton className="h-36 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [compare, setCompare] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const { data, error, loading, reload } = useAsync((signal) => api.schemes({}, { signal }), []);

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const level = params.get("level") || "";
  const status = params.get("status") || "";
  const theme = params.get("theme") || "";
  const verifiedOnly = params.get("verified") === "1";
  const nowOnly = params.get("now") === "1";

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const withTheme = useMemo(() => (data || []).map((s) => ({ ...s, _theme: themeKeyFor(s) })), [data]);

  // Filtering is done client-side so typing feels instant (the full list is small).
  const schemes = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return withTheme.filter((s) => {
      if (category && s.category !== category) return false;
      if (level && s.level !== level) return false;
      if (status && s.status !== status) return false;
      if (theme && s._theme !== theme) return false;
      if (verifiedOnly && s.origin !== "curated") return false;
      if (nowOnly && !RUNNING_NOW.has(s.status)) return false;
      if (ql && !haystack(s).includes(ql)) return false;
      return true;
    }).sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)); // stable: keeps API order within a status
  }, [withTheme, q, category, level, status, theme, verifiedOnly, nowOnly]);

  const counts = useMemo(() => {
    const byCat = { "": withTheme.length };
    const byTheme = {};
    withTheme.forEach((s) => {
      byCat[s.category] = (byCat[s.category] || 0) + 1;
      byTheme[s._theme] = (byTheme[s._theme] || 0) + 1;
    });
    return {
      byCat, byTheme,
      verified: withTheme.filter((s) => s.origin === "curated").length,
      now: withTheme.filter((s) => RUNNING_NOW.has(s.status)).length,
    };
  }, [withTheme]);

  const themeOptions = Object.entries(THEMES)
    .filter(([k]) => counts.byTheme[k])
    .sort((a, b) => (counts.byTheme[b[0]] || 0) - (counts.byTheme[a[0]] || 0));

  const anyFilter = q || category || level || status || theme || verifiedOnly || nowOnly;
  const toggleCompare = (id) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_COMPARE ? [...c, id] : c));

  return (
    <div className="pb-24">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-950 via-navy-900 to-[#0f5c57] px-5 pb-20 pt-8 text-white shadow-lift sm:px-10 sm:pt-12">
        <div className="phulkari absolute inset-0 -z-10 opacity-50" aria-hidden />
        <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 animate-blob rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 left-10 -z-10 h-72 w-72 animate-blob rounded-full bg-emerald-400/20 blur-3xl [animation-delay:-6s]" aria-hidden />
        <PunjabSkyline className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full text-white/[0.07] sm:h-32" />

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">Explore schemes</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Every scheme in Punjab,{" "}
          <span className="bg-gradient-to-r from-gold-200 via-gold-300 to-phulkari-300 bg-clip-text text-transparent">one place</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-navy-200 sm:text-base">
          CM Punjab initiatives, Punjab department programmes and federal schemes, each linked to its official source.
        </p>

        <div className="relative mt-6 max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="scheme-search" className="sr-only">Search schemes</label>
          <input
            id="scheme-search"
            type="search"
            dir="auto"
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search: laptop, housing, kissan, scholarship…"
            className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-4 text-base text-navy-900 shadow-lift placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-gold-300/50"
          />
        </div>

        {data && (
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="glass rounded-full px-3 py-1.5"><b className="text-white"><CountUp value={data.length} /></b> <span className="text-navy-100">schemes</span></span>
            <span className="glass rounded-full px-3 py-1.5">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-300" aria-hidden />
              <b className="text-white"><CountUp value={counts.verified} /></b> <span className="text-navy-100">with verified rules</span>
            </span>
            <span className="glass rounded-full px-3 py-1.5"><b className="text-white">3</b> <span className="text-navy-100">levels of government</span></span>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ category tiles (overlap the hero) */}
      <div className="relative z-10 -mt-12 grid grid-cols-2 gap-3 px-2 sm:px-6 lg:grid-cols-4">
        {[{ value: "" }, ...CATEGORIES].map(({ value }) => {
          const c = CATEGORY_STYLE[value];
          const active = category === value;
          const Icon = c.icon;
          return (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setParam("category", value)}
              className={`group relative overflow-hidden rounded-2xl p-4 text-left shadow-lift transition duration-300 hover:-translate-y-1 ${
                active ? `bg-gradient-to-br ${c.tint} text-white ring-2 ring-gold-300` : "bg-white text-navy-900 ring-1 ring-slate-200"
              }`}
            >
              <Icon className={`absolute -bottom-3 -right-3 h-16 w-16 transition-transform duration-500 group-hover:scale-110 ${active ? "text-white/15" : "text-slate-100"}`} aria-hidden />
              <span className="block text-2xl font-extrabold leading-none">
                {data ? <CountUp value={counts.byCat[value] || 0} /> : "—"}
              </span>
              <span className="mt-1.5 block text-sm font-bold">{c.label}</span>
              <span className={`block text-xs ${active ? "text-white/80" : "text-slate-500"}`}>{c.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------ themes + filters */}
      <div className="mt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Browse by need</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scroll-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <Chip active={!theme} onClick={() => setParam("theme", "")}>All</Chip>
          {themeOptions.map(([k, t]) => {
            const Icon = t.hero;
            return (
              <Chip key={k} active={theme === k} onClick={() => setParam("theme", theme === k ? "" : k)}>
                <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
                  <Icon className="h-3 w-3" aria-hidden />
                </span>
                {t.label}
                <span className="opacity-60">{counts.byTheme[k]}</span>
              </Chip>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={nowOnly}
            onClick={() => setParam("now", nowOnly ? "" : "1")}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              nowOnly ? "bg-emerald-600 text-white shadow-md" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:ring-emerald-400"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${nowOnly ? "bg-white" : "bg-emerald-400"} opacity-75`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${nowOnly ? "bg-white" : "bg-emerald-500"}`} />
            </span>
            Open &amp; running now {data && <span className="opacity-75">({counts.now})</span>}
          </button>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore || Boolean(level || status)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 ring-1 ring-slate-200 hover:ring-navy-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> More filters
            {(level || status) && <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />}
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 ring-1 ring-slate-200">
            <span className="relative inline-flex h-4 w-7 items-center">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setParam("verified", e.target.checked ? "1" : "")}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2" />
              <span className="absolute left-0.5 h-3 w-3 rounded-full bg-white shadow transition peer-checked:translate-x-3" />
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Verified rules only
          </label>
          {anyFilter && (
            <button type="button" onClick={() => setParams({}, { replace: true })} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-phulkari-700 hover:bg-phulkari-50">
              <X className="h-3.5 w-3.5" aria-hidden /> Clear all
            </button>
          )}
          {data && (
            <p className="ml-auto text-sm text-slate-500" role="status">
              Showing <b className="text-navy-900">{schemes.length}</b> of {data.length}
            </p>
          )}
        </div>

        {(showMore || level || status) && (
          <div className="mt-3 flex animate-fade-up flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div role="group" aria-label="Level" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-14 text-xs font-semibold uppercase tracking-wide text-slate-500">Level</span>
              {LEVELS.map((o) => (
                <Chip key={o.value} active={level === o.value} onClick={() => setParam("level", level === o.value ? "" : o.value)}>{o.label}</Chip>
              ))}
            </div>
            <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-14 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              {STATUSES.map((st) => (
                <Chip key={st} active={status === st} onClick={() => setParam("status", status === st ? "" : st)}>
                  {STATUS_STYLE[st]?.text || st}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {!anyFilter && data && (
        <div className="mt-10">
          <FeaturedSchemes schemes={withTheme} />
        </div>
      )}

      {/* ------------------------------------------------------------ grid */}
      <section className="mt-10" aria-labelledby="all-h">
        {!anyFilter && <h2 id="all-h" className="mb-4 text-xl font-bold tracking-tight text-navy-900">All schemes</h2>}
        {anyFilter && <h2 id="all-h" className="sr-only">Results</h2>}
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeletonArt key={i} />)}
          </div>
        )}
        {data &&
          (schemes.length === 0 ? (
            <EmptyState icon={SearchX} title="No schemes match your filters" action={<button type="button" className="btn-secondary" onClick={() => setParams({}, { replace: true })}>Clear filters</button>}>
              Try a different word, or ask the AI Chat in Urdu or Roman Urdu.
            </EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {schemes.map((s, n) => (
                <div key={s.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(n, 9) * 45}ms` }}>
                  <SchemeCard
                    scheme={s}
                    compareChecked={compare.includes(s.id)}
                    compareDisabled={compare.length >= MAX_COMPARE}
                    onCompareToggle={toggleCompare}
                  />
                </div>
              ))}
            </div>
          ))}
      </section>

      {compare.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:pl-72">
          <div className="pointer-events-auto flex animate-fade-up items-center gap-2 rounded-2xl bg-navy-900/95 p-2 pl-4 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur">
            <span className="hidden sm:inline">{compare.length} selected (max {MAX_COMPARE})</span>
            <button type="button" onClick={() => setCompare([])} className="rounded-lg px-2 py-1.5 text-navy-200 hover:bg-navy-800 hover:text-white">
              Clear
            </button>
            <button
              type="button"
              disabled={compare.length < 2}
              onClick={() => navigate(`/compare?ids=${compare.map(encodeURIComponent).join(",")}`)}
              className="btn-primary !py-1.5"
              title={compare.length < 2 ? "Select at least 2 schemes" : undefined}
            >
              <Columns3 className="h-4 w-4" aria-hidden /> Compare ({compare.length}) <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
