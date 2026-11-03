import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Columns3, Cpu, ExternalLink } from "lucide-react";
import { api } from "../api.js";
import { LevelBadge, RulesBadge } from "../components/Badges.jsx";
import SchemePicker from "../components/SchemePicker.jsx";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "../components/States.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { NOT_CONFIRMED } from "../lib/constants.js";
import { daysUntil, formatDate, hostOf, isUrl } from "../lib/format.js";

function Bullets({ items }) {
  if (!items?.length || (items.length === 1 && items[0] === NOT_CONFIRMED))
    return <span className="text-slate-400">{NOT_CONFIRMED}</span>;
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((t, i) => (
        <li key={i} dir="auto">
          {t}
        </li>
      ))}
    </ul>
  );
}

const ROWS = [
  ["Category / level", (s) => (
    <div className="flex flex-wrap gap-1">
      <span className="text-navy-900">{s.category_label}</span>
      <LevelBadge level={s.level} />
    </div>
  )],
  ["Status", (s) => (
    <div className="flex flex-wrap gap-1">
      <StatusBadge status={s.status} />
      <RulesBadge rulesStatus={s.rules_status} />
    </div>
  )],
  ["Benefits", (s) => <Bullets items={s.benefits} />],
  ["Key criteria", (s) => <Bullets items={s.key_criteria} />],
  ["Documents", (s) => <Bullets items={s.documents} />],
  ["Deadline", (s) => {
    if (!s.deadline || s.deadline === NOT_CONFIRMED) return <span className="text-slate-400">{NOT_CONFIRMED}</span>;
    const d = daysUntil(s.deadline);
    return (
      <span>
        {formatDate(s.deadline)}
        {d !== null && <span className="block text-xs text-slate-500">{d >= 0 ? `${d} day(s) left` : "passed"}</span>}
      </span>
    );
  }],
  ["Apply", (s) =>
    isUrl(s.application_url) ? (
      <a href={s.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary !px-3 !py-1.5 text-xs">
        Official application <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    ) : (
      <span className="text-slate-400">{NOT_CONFIRMED}</span>
    )],
  ["Sources", (s) =>
    s.sources?.length ? (
      <ul className="space-y-1">
        {s.sources.map((src) => (
          <li key={src.url}>
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs link">
              {hostOf(src.url)} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            <span className="block text-[11px] text-slate-400">verified {formatDate(src.last_verified)}</span>
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-slate-400">{NOT_CONFIRMED}</span>
    )],
];

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const idsKey = ids.join(",");
  const [schemes, setSchemes] = useState([]);
  const [listError, setListError] = useState(null);
  const [state, setState] = useState({ data: null, loading: false, error: null });

  useEffect(() => {
    const ctrl = new AbortController();
    api.schemes({}, { signal: ctrl.signal }).then(setSchemes).catch((e) => e.name !== "AbortError" && setListError(e));
    return () => ctrl.abort();
  }, []);

  // Selection lives in the URL (?ids=a,b) so comparisons are shareable.
  const setIds = (next) => {
    const p = new URLSearchParams(params);
    if (next.length) p.set("ids", next.join(","));
    else p.delete("ids");
    setParams(p, { replace: true });
  };

  useEffect(() => {
    if (ids.length < 2) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .compare(ids, { signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => error.name !== "AbortError" && setState({ data: null, loading: false, error }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const rows = state.data?.schemes || [];

  return (
    <div>
      <PageHeader icon={Columns3} title="Compare Schemes" subtitle="Pick 2 to 4 schemes to see them side by side. Every value comes from the official source." />

      <div className="card p-5">
        {listError && <ErrorState error={listError} compact />}
        <SchemePicker schemes={schemes} value={ids} onChange={setIds} max={4} label="Schemes to compare" />
        {ids.length < 2 && <p className="mt-2 text-xs text-slate-500">Select at least {2 - ids.length} more scheme(s).</p>}
      </div>

      <div className="mt-6">
        {state.error && <ErrorState error={state.error} />}
        {state.loading && <Skeleton className="h-72" />}
        {!state.loading && ids.length < 2 && (
          <EmptyState icon={Columns3} title="Nothing to compare yet">
            Choose schemes above, or tick “Compare” on cards in <Link to="/schemes" className="link">Explore Schemes</Link>.
          </EmptyState>
        )}
        {state.data?.errors?.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {state.data.errors.map((e) => (
              <p key={e.error}>{e.error}</p>
            ))}
          </div>
        )}
        {!state.loading && rows.length > 0 && (
          <>
            <div className="card overflow-x-auto scroll-thin">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <caption className="sr-only">Scheme comparison</caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="sticky left-0 z-10 w-32 bg-slate-50 p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Scheme
                    </th>
                    {rows.map((s) => (
                      <th key={s.scheme_id} scope="col" className="min-w-[200px] p-3 text-left align-top">
                        <Link to={`/schemes/${encodeURIComponent(s.scheme_id)}`} className="font-semibold text-navy-900 hover:underline">
                          {s.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([label, render]) => (
                    <tr key={label} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="sticky left-0 z-10 bg-white p-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </th>
                      {rows.map((s) => (
                        <td key={s.scheme_id} className="p-3 align-top text-navy-800">
                          {render(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {state.data.trace && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Cpu className="h-3.5 w-3.5" aria-hidden /> Compared via MCP tool <code>{state.data.trace.tool}</code> in {state.data.trace.elapsed_ms} ms
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
