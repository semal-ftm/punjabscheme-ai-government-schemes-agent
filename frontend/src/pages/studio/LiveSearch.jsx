import HowItWorks from "./HowItWorks.jsx";
import { HelpCircle, Lock, Quote } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ExternalLink, Globe, KeyRound, Search, Settings2, ShieldCheck, Zap } from "lucide-react";
import { studioApi } from "../../api.js";
import { CardSkeleton, ErrorState, Spinner } from "../../components/States.jsx";
import { hostOf, timeAgo } from "../../lib/format.js";
import { useAsync } from "../../lib/useAsync.js";
import { Panel, Toggle } from "./ui.jsx";

const SAMPLES = [
  { q: "Benazir Kafaalat payment latest announcement", src: ["bisp"] },
  { q: "Taleemi Wazaif stipend amount", src: ["bisp"] },
  { q: "workers children scholarship application", src: ["pwwf"] },
  { q: "PESSI registered worker benefits", src: ["pessi"] },
  { q: "new CM Punjab scheme launched", src: ["punjab_gov"] },
  { q: "Zewar-e-Taleem stipend for girls", src: ["pspa"] },
];

export default function LiveSearch() {
  const { data, error, loading, reload, setData } = useAsync((signal) => studioApi.live({ signal }), []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const [n, setN] = useState(5);
  const [res, setRes] = useState({ loading: false, error: null, data: null });
  const [saving, setSaving] = useState(false);

  const save = async (changes) => {
    setSaving(true);
    try {
      const s = await studioApi.saveSettings(changes);
      setData((d) => ({ ...d, enabled: s.tavily_enabled, auto: s.tavily_auto, max_results: s.tavily_max_results,
        active: s.tavily_enabled && d.configured }));
    } finally {
      setSaving(false);
    }
  };

  const search = async (query = q, src = selected) => {
    if (query.trim().length < 2) return;
    setQ(query);
    setSelected(src);
    setRes({ loading: true, error: null, data: null });
    try {
      const r = await studioApi.liveSearch({ query, source_ids: src, max_results: n });
      setRes({ loading: false, error: null, data: r });
      reload({ silent: true });
    } catch (e) {
      setRes({ loading: false, error: e, data: null });
    }
  };

  const toggleSrc = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <CardSkeleton lines={5} />;

  return (
    <div className="space-y-6">
      <HowItWorks
        image="/img/studio-live.webp"
        title="Tavily Live Search"
        summary="Saved documents can be days old. Live search asks Tavily to look at the official websites right now — and only those websites."
        steps={[
          { icon: HelpCircle, title: "Trigger", text: "The planner adds live_web_search for news, deadlines or “is it open?” questions, or the retrieve node calls it when RAG finds fewer than 2 strong matches.", example: `Automatic fallback is ${data.auto ? "ON" : "OFF"}` },
          { icon: Lock, title: "Restrict", text: "The search is locked to 5 official domains with Tavily's include_domains option.", example: data.sources.map((s) => s.domains[0]).join(" · ") },
          { icon: Zap, title: "Search", text: "Tavily searches those sites live and returns titles, URLs and the relevant text.", example: `depth: ${data.search_depth} · up to ${data.max_results} results per agent search` },
          { icon: ShieldCheck, title: "Filter", text: "Every URL is checked again on our server. Anything not on an official domain (e.g. pwwb.com.pk copies) is dropped." },
          { icon: Quote, title: "Cite", text: "Results become evidence labelled “live official web result — not verified rules”. They can inform the answer but never decide eligibility." },
        ]}
      />
      {!data.configured && (
        <div className="card border-gold-300 bg-gold-50 p-5">
          <h3 className="flex items-center gap-2 font-semibold text-navy-900">
            <KeyRound className="h-5 w-5 text-gold-500" /> Connect Tavily
          </h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-navy-700">
            <li>Create a free API key at <a className="link" href="https://app.tavily.com" target="_blank" rel="noreferrer">app.tavily.com</a>.</li>
            <li>Add <code className="kbd">TAVILY_API_KEY=tvly-...</code> to <code className="kbd">backend/.env</code>.</li>
            <li>Restart the API (<code className="kbd">uvicorn app.api:app</code>). This page will show “Connected”.</li>
          </ol>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Panel
          title="Tavily Live Search"
          icon={Globe}
          sub="Gets up-to-date information (announcements, deadlines, news) from official government websites only."
          actions={
            <span className={`pill ${data.active ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${data.active ? "animate-pulse bg-emerald-500" : "bg-rose-400"}`} />
              {data.active ? "Connected" : data.configured ? "Disabled" : "Not configured"}
            </span>
          }
        >
          <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. BISP Kafaalat new payment phase" className="input pl-9" dir="auto" />
            </div>
            <select value={n} onChange={(e) => setN(Number(e.target.value))} className="input sm:w-28" aria-label="Max results">
              {[3, 5, 8, 10].map((x) => <option key={x} value={x}>{x} results</option>)}
            </select>
            <button type="submit" className="btn-primary" disabled={res.loading || !data.configured}>
              {res.loading ? <Spinner /> : <Zap className="h-4 w-4" />} Search live
            </button>
          </form>
          <p className="mt-2 text-[11px] text-slate-500">
            Restrict to: {selected.length ? selected.map((id) => data.sources.find((s) => s.id === id)?.name).join(", ") : "all 5 official sources"} · runs through the MCP tool <code className="kbd">live_web_search</code>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button key={s.q} type="button" disabled={!data.configured} onClick={() => search(s.q, s.src)} className="chip-off !py-1 text-xs disabled:opacity-50">
                {s.q}
              </button>
            ))}
          </div>

          {res.error && <div className="mt-4"><ErrorState error={res.error} compact /></div>}
          {res.data && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-slate-500">
                {res.data.count} official result(s) · Tavily {res.data.elapsed_ms} ms · via {res.data.via}
                {res.data.dropped_non_official > 0 && ` · ${res.data.dropped_non_official} non-official result(s) dropped`}
              </p>
              {!res.data.results.length && <p className="rounded-xl bg-cream-200 p-4 text-sm text-slate-600">No pages on the selected official sites matched. Try broader words.</p>}
              <ol className="space-y-2">
                {res.data.results.map((r, i) => (
                  <li key={r.url + i} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 font-semibold text-emerald-800 hover:underline">
                        {r.title} <ExternalLink className="inline h-3 w-3" />
                      </a>
                      <span className="pill bg-cream-200 font-mono text-navy-700">score {r.score}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {r.source_name} · {r.level === "federal" ? "Federal" : "Provincial"} · {hostOf(r.url)}
                      {r.published_date && ` · published ${r.published_date.slice(0, 10)}`}
                    </p>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-navy-700" dir="auto">{r.content}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-gold-50 p-3 text-xs text-navy-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" /> {res.data.note}
              </p>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Settings" icon={Settings2}>
            <div className="space-y-4 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium text-navy-900">Enable live search</span>
                  <span className="block text-xs text-slate-500">Agent may call Tavily</span>
                </span>
                <Toggle checked={data.enabled} disabled={saving} onChange={(v) => save({ tavily_enabled: v })} label="Enable live search" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium text-navy-900">Automatic fallback</span>
                  <span className="block text-xs text-slate-500">When RAG is weak or news is asked</span>
                </span>
                <Toggle checked={data.auto} disabled={saving || !data.enabled} onChange={(v) => save({ tavily_auto: v })} label="Automatic fallback" />
              </label>
              <label className="block">
                <span className="font-medium text-navy-900">Results per agent search: {data.max_results}</span>
                <input type="range" min="1" max="8" value={data.max_results} onChange={(e) => save({ tavily_max_results: Number(e.target.value) })} className="mt-1 w-full accent-emerald-700" />
              </label>
              <p className="text-xs text-slate-500">Search depth: <code className="kbd">{data.search_depth}</code></p>
            </div>
          </Panel>
          <Panel title="Recent searches" icon={Clock}>
            {data.recent.length ? (
              <ul className="space-y-2">
                {data.recent.map((r, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => search(r.query, [])} className="w-full rounded-lg p-1.5 text-left hover:bg-cream-200">
                      <p className="truncate text-sm text-navy-800">{r.query}</p>
                      <p className="text-[11px] text-slate-400">{r.count} results · {timeAgo(r.at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No searches yet.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Official sources" icon={ShieldCheck} sub="Tavily is only allowed to search these domains. Any other result is dropped server-side. Tick sources to restrict a search.">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2"><span className="sr-only">Use</span></th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Kis kaam ke liye</th>
                <th className="px-3 py-2">Domain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/60">
              {data.sources.map((s) => (
                <tr key={s.id} className="hover:bg-emerald-50/40">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSrc(s.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600" aria-label={`Restrict to ${s.name}`} />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-navy-900">{s.name}</p>
                    <span className={`pill mt-0.5 ${s.level === "federal" ? "bg-plum-50 text-plum-700" : "bg-emerald-50 text-emerald-800"}`}>{s.level}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{s.purpose}</td>
                  <td className="px-3 py-2 font-mono text-xs text-navy-700">{s.domains.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="How the agent uses live search" icon={Zap}>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          {[
            ["1 · Planned", "For news, deadlines, “is it open?” or new-scheme questions, the planner adds live_web_search as an MCP step."],
            ["2 · Fallback", "If RAG returns fewer than 2 strong document matches, the retrieve node checks the official sites live."],
            ["3 · Cited, not trusted blindly", "Live results become numbered evidence marked “not verified rules”. Eligibility still comes only from the verified rule engine."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-cream-200/70 p-3">
              <p className="font-semibold text-navy-900">{t}</p>
              <p className="mt-1 text-xs text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <Link to="/studio/testing" className="link mt-3 inline-block text-sm">Run the “Latest announcements” simulation →</Link>
      </Panel>
    </div>
  );
}
