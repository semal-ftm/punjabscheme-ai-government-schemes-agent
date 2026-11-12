import HowItWorks from "./HowItWorks.jsx";
import { Binary, Database, Globe, Quote, Scissors } from "lucide-react";
import { useMemo, useState } from "react";
import { ExternalLink, FileText, FileUp, Layers, RefreshCw, Search, X } from "lucide-react";
import { api, studioApi } from "../../api.js";
import { CardSkeleton, ErrorState, Spinner } from "../../components/States.jsx";
import { formatDateTime, hostOf } from "../../lib/format.js";
import { useAsync } from "../../lib/useAsync.js";
import { Metric, Panel } from "./ui.jsx";

const SAMPLE_QUERIES = ["Honhaar scholarship eligibility marks", "Benazir Kafaalat registration documents", "Apni Chhat Apna Ghar loan", "PESSI benefits for workers"];

function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const tone = score >= 0.5 ? "bg-emerald-500" : score >= 0.35 ? "bg-gold-400" : "bg-slate-300";
  return (
    <span className="inline-flex items-center gap-2" title={`Cosine similarity ${score}`}>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[11px] text-slate-500">{score.toFixed(3)}</span>
    </span>
  );
}

function Playground() {
  const [q, setQ] = useState("");
  const [k, setK] = useState(5);
  const [level, setLevel] = useState("");
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const run = async (query = q) => {
    if (query.trim().length < 2) return;
    setQ(query);
    setState({ loading: true, error: null, data: null });
    try {
      setState({ loading: false, error: null, data: await studioApi.ragSearch({ query, k, level: level || null }) });
    } catch (error) {
      setState({ loading: false, error, data: null });
    }
  };
  return (
    <Panel title="Retrieval playground" icon={Search} sub="Run the exact semantic search the agent uses and see which official chunks come back.">
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex flex-col gap-2 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" placeholder="e.g. who can apply for the Honhaar scholarship?" className="input flex-1" />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="input sm:w-36" aria-label="Level filter">
          <option value="">All levels</option>
          <option value="provincial">Provincial</option>
          <option value="federal">Federal</option>
        </select>
        <select value={k} onChange={(e) => setK(Number(e.target.value))} className="input sm:w-24" aria-label="Top k">
          {[3, 5, 8, 12].map((n) => <option key={n} value={n}>top {n}</option>)}
        </select>
        <button type="submit" className="btn-primary" disabled={state.loading}>
          {state.loading ? <Spinner /> : <Search className="h-4 w-4" />} Retrieve
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SAMPLE_QUERIES.map((s) => (
          <button key={s} type="button" onClick={() => run(s)} className="chip-off !py-1 text-xs">{s}</button>
        ))}
      </div>
      {state.error && <div className="mt-3"><ErrorState error={state.error} compact /></div>}
      {state.data && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">
            {state.data.results.length} chunk(s) in {state.data.elapsed_ms} ms · the agent drops chunks below score {state.data.min_score_used_by_agent}
          </p>
          <ol className="space-y-2">
            {state.data.results.map((r, i) => (
              <li key={r.chunk_id} className={`rounded-xl border p-3 ${r.score < state.data.min_score_used_by_agent ? "border-dashed border-slate-300 opacity-60" : "border-slate-200 bg-white/70"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold text-navy-900">
                    <span className="mr-1.5 text-slate-400">#{i + 1}</span>
                    {r.title || hostOf(r.url)} {r.page && <span className="text-xs font-normal text-slate-500">· page {r.page}</span>}
                  </p>
                  <ScoreBar score={r.score} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {r.source_name} · {r.level} ·{" "}
                  <a href={r.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-0.5">
                    {hostOf(r.url)} <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
                <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-navy-700" dir="auto">{r.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}

function DocDrawer({ id, onClose }) {
  const { data, error, loading } = useAsync((signal) => studioApi.document(id, { signal }), [id]);
  const [view, setView] = useState("chunks");
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Document">
      <button type="button" className="absolute inset-0 bg-navy-950/30" onClick={onClose} aria-label="Close" />
      <div className="fade-up relative flex h-full w-full max-w-2xl flex-col bg-cream-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-navy-900">{data?.title || "Document"}</p>
            {data && (
              <p className="text-xs text-slate-500">
                {data.content_type} · {data.chars.toLocaleString()} chars · {data.chunk_total} chunks · fetched {formatDateTime(data.fetched_at)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-cream-300" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-2 border-b border-slate-200 px-4 py-2">
          {["chunks", "text"].map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={view === v ? "chip-on !py-1 text-xs" : "chip-off !py-1 text-xs"}>
              {v === "chunks" ? "Chunks (as embedded)" : "Extracted text"}
            </button>
          ))}
          {data && (
            <a href={data.url} target="_blank" rel="noreferrer" className="btn-ghost ml-auto !py-1 text-xs">
              Official page <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scroll-thin">
          {loading && <CardSkeleton lines={6} />}
          {error && <ErrorState error={error} />}
          {data && view === "text" && <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-navy-800" dir="auto">{data.text}</pre>}
          {data && view === "chunks" && (
            <ol className="space-y-2">
              {data.chunks.map((c) => (
                <li key={c.n} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">
                    Chunk {c.n} · {c.chars} chars{c.page ? ` · page ${c.page}` : ""}
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-navy-800" dir="auto">{c.text}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function IngestForm({ onDone }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [state, setState] = useState({ busy: false, msg: "", error: null });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, msg: "", error: null });
    try {
      const r = await api.ingest({ url, title, file });
      setState({ busy: false, msg: `Added. Index: ${r.index.chunks_added} new chunks.`, error: null });
      setUrl(""); setTitle(""); setFile(null);
      onDone();
    } catch (error) {
      setState({ busy: false, msg: "", error });
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
      <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Official URL (used for citations)" className="input" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="input" />
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input !py-1.5 text-xs" aria-label="PDF file (optional)" />
      <button type="submit" disabled={state.busy || !url} className="btn-plum">
        {state.busy ? <Spinner /> : <FileUp className="h-4 w-4" />} Add
      </button>
      {state.msg && <p className="text-xs text-emerald-700 sm:col-span-4">{state.msg}</p>}
      {state.error && <div className="sm:col-span-4"><ErrorState error={state.error} compact /></div>}
    </form>
  );
}

export default function RagDocs() {
  const { data, error, loading, reload } = useAsync((signal) => studioApi.documents({ signal }), []);
  const [filter, setFilter] = useState("");
  const [source, setSource] = useState("");
  const [open, setOpen] = useState(null);
  const [reindex, setReindex] = useState({ busy: false, msg: "" });

  const docs = useMemo(() => {
    const f = filter.toLowerCase();
    return (data?.documents || []).filter(
      (d) => (!source || d.source_id === source) && (!f || `${d.title} ${d.url} ${d.scheme_name || ""}`.toLowerCase().includes(f))
    );
  }, [data, filter, source]);

  const doReindex = async () => {
    setReindex({ busy: true, msg: "" });
    try {
      const r = await studioApi.reindex();
      setReindex({ busy: false, msg: `${r.indexed_documents} re-indexed, ${r.unchanged} unchanged` });
      reload({ silent: true });
    } catch (e) {
      setReindex({ busy: false, msg: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <HowItWorks
        image="/img/studio-rag.webp"
        title="RAG — Retrieval-Augmented Generation"
        summary="Instead of answering from memory, the agent first looks up the official documents and only then writes, quoting what it found."
        steps={[
          { icon: Globe, title: "Crawl", text: "The crawler downloads official pages and PDFs (robots.txt respected, SSL verified, 2 s delay per site).", example: data && `${data.total} documents: ${Object.entries(data.by_type).map(([k, v]) => `${v} ${k}`).join(", ")}` },
          { icon: Scissors, title: "Chunk", text: "Each document is split into overlapping pieces so a single criterion or benefit fits in one chunk. PDF page numbers are kept for citations.", example: data && `chunk size ${data.chunk_size} chars · overlap ${data.chunk_overlap} · ${data.chunks} chunks` },
          { icon: Binary, title: "Embed", text: "A multilingual model turns every chunk into a vector (a list of numbers) so English, Urdu and Roman Urdu can be compared by meaning.", example: data?.embedding_model },
          { icon: Database, title: "Store", text: "Vectors are saved in ChromaDB with metadata: URL, title, source, scheme, page and fetch date.", example: data && `${data.indexed}/${data.total} documents up to date in the index` },
          { icon: Search, title: "Search", text: "The question is embedded the same way and the closest chunks are returned with a similarity score. Try it in the playground below." },
          { icon: Quote, title: "Cite", text: "The best chunks become numbered evidence. The LLM may only use these and must cite them like [2]." },
        ]}
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon={FileText} label="Documents" value={data?.total} hint={data && Object.entries(data.by_type).map(([k, v]) => `${v} ${k}`).join(" · ")} />
        <Metric icon={Layers} label="Chunks in ChromaDB" value={data?.chunks} hint={data && `size ${data.chunk_size} · overlap ${data.chunk_overlap}`} tone="gold" />
        <Metric icon={RefreshCw} label="Indexed (up to date)" value={data && `${data.indexed}/${data.total}`} tone="emerald" />
        <Metric icon={Search} label="Embedding model" value={data ? data.embedding_model.split("/").pop().split("-").slice(0, 2).join("-") : null} hint={data?.embedding_model} tone="plum" />
      </div>

      <Playground />

      <Panel
        title="Document library"
        icon={FileText}
        sub="Every page and PDF the crawler saved from official sources. Click a row to see its chunks."
        actions={
          <>
            {reindex.msg && <span className="text-xs text-slate-500">{reindex.msg}</span>}
            <button type="button" onClick={doReindex} disabled={reindex.busy} className="btn-secondary !py-1.5 text-xs">
              {reindex.busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync index
            </button>
          </>
        }
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by title, URL or scheme" className="input flex-1" />
          <select value={source} onChange={(e) => setSource(e.target.value)} className="input sm:w-72" aria-label="Source">
            <option value="">All sources</option>
            {data?.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {loading && !data ? (
          <CardSkeleton lines={6} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-cream-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Chunks</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/60">
                {docs.map((d) => (
                  <tr key={d.id} onClick={() => setOpen(d.id)} className="cursor-pointer hover:bg-emerald-50/50">
                    <td className="max-w-xs px-3 py-2">
                      <p className="truncate font-medium text-navy-900" title={d.title}>{d.title || hostOf(d.url)}</p>
                      <p className="truncate text-[11px] text-slate-400">{d.scheme_name ? `↳ ${d.scheme_name}` : d.url}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{d.source_name || "Manual"}</td>
                    <td className="px-3 py-2"><span className="pill bg-cream-200 uppercase text-navy-700">{d.content_type}</span></td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{d.chunks}</td>
                    <td className="px-3 py-2">
                      <span className={`pill ${d.indexed ? "bg-emerald-50 text-emerald-800" : "bg-gold-50 text-gold-600"}`}>{d.indexed ? "✓ Indexed" : "Pending"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!docs.length && <p className="p-4 text-center text-sm text-slate-500">No documents match.</p>}
          </div>
        )}
      </Panel>

      <Panel title="Add an official document" icon={FileUp} sub="Manual fallback for sites the crawler cannot reach (e.g. SSL problems). The URL is kept for citations.">
        <IngestForm onDone={() => reload({ silent: true })} />
      </Panel>

      {open && <DocDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
