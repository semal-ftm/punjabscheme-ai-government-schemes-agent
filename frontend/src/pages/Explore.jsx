import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Columns3, Search, SearchX, ShieldCheck, X } from "lucide-react";
import { api } from "../api.js";
import SchemeCard from "../components/SchemeCard.jsx";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "../components/States.jsx";
import { CATEGORIES, LEVELS, STATUSES, TOPICS, matchesTopic } from "../lib/constants.js";
import { useAsync } from "../lib/useAsync.js";

const MAX_COMPARE = 4;

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : o.value)}
            className={`${active ? "chip-on" : "chip-off"} !py-1 text-xs`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [compare, setCompare] = useState([]);
  const { data, error, loading, reload } = useAsync((signal) => api.schemes({}, { signal }), []);

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const level = params.get("level") || "";
  const status = params.get("status") || "";
  // Only schemes with human-verified rules are shown by default; auto-discovered cards are opt-in.
  const verifiedOnly = params.get("discovered") !== "1";
  const topic = params.get("topic") || "";

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Filtering is done client-side so typing feels instant (the full list is small).
  const schemes = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (data || []).filter((s) => {
      if (category && s.category !== category) return false;
      if (level && s.level !== level) return false;
      if (status && s.status !== status) return false;
      if (verifiedOnly && s.origin !== "curated") return false;
      if (topic && !matchesTopic(s, topic)) return false;
      if (ql && !`${s.name} ${s.name_ur || ""} ${s.summary || ""} ${s.department || ""} ${s.sector || ""}`.toLowerCase().includes(ql))
        return false;
      return true;
    });
  }, [data, q, category, level, status, verifiedOnly, topic]);

  const anyFilter = q || category || level || status || !verifiedOnly || topic;
  const toggleCompare = (id) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_COMPARE ? [...c, id] : c));

  return (
    <div className="pb-20">
      <PageHeader
        icon={Search}
        title="Explore Schemes"
        subtitle="CM Punjab initiatives, Punjab department programmes and federal schemes, from official sources."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Topics">
        <button type="button" onClick={() => setParam("topic", "")} className={`${!topic ? "chip-on" : "chip-off"}`}>
          All Schemes
        </button>
        {TOPICS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={topic === t.value}
            onClick={() => setParam("topic", topic === t.value ? "" : t.value)}
            className={topic === t.value ? "chip-on" : "chip-off"}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="scheme-search" className="sr-only">
            Search schemes
          </label>
          <input
            id="scheme-search"
            type="search"
            dir="auto"
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search by name, sector or department (e.g. scholarship, housing, kissan)"
            className="input pl-9"
          />
        </div>
        <div className="flex flex-col gap-3">
          <ChipGroup label="Category" options={CATEGORIES} value={category} onChange={(v) => setParam("category", v)} />
          <ChipGroup label="Level" options={LEVELS} value={level} onChange={(v) => setParam("level", v)} />
          <ChipGroup label="Status" options={STATUSES.map((s) => ({ value: s, label: s === "Unverified" ? "Dates on official portal" : s }))} value={status} onChange={(v) => setParam("status", v)} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-800">
              <input
                type="checkbox"
                checked={!verifiedOnly}
                onChange={(e) => setParam("discovered", e.target.checked ? "1" : "")}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden /> Also show auto-discovered schemes (rules not verified)
            </label>
            {anyFilter && (
              <button type="button" onClick={() => setParams({}, { replace: true })} className="btn-ghost !py-1 text-xs">
                <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
        {data && (
          <>
            <p className="mb-3 text-sm text-slate-500" role="status">
              Showing {schemes.length} of {data.length} schemes
            </p>
            {schemes.length === 0 ? (
              <EmptyState icon={SearchX} title="No schemes match your filters">
                Try a different word (Roman Urdu works in the AI Chat) or clear the filters.
              </EmptyState>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {schemes.map((s) => (
                  <SchemeCard
                    key={s.id}
                    scheme={s}
                    compareChecked={compare.includes(s.id)}
                    compareDisabled={compare.length >= MAX_COMPARE}
                    onCompareToggle={toggleCompare}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {compare.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:pl-72">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-navy-900 p-2 pl-4 text-sm text-white shadow-2xl">
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
              <Columns3 className="h-4 w-4" aria-hidden /> Compare ({compare.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
