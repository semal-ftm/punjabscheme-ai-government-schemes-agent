import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronDown, ExternalLink, FileUp, History, Play, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { ReviewBadge, SeverityBadge } from "../components/Badges.jsx";
import { EVENT_TYPES, EventIcon, SourceStatusIcon } from "../components/ChangeMeta.jsx";
import DiffView from "../components/DiffView.jsx";
import { CardSkeleton, EmptyState, ErrorState, PageHeader, Spinner } from "../components/States.jsx";
import { formatDateTime, hostOf, timeAgo } from "../lib/format.js";
import { useAsync } from "../lib/useAsync.js";

const POLL_MS = 5000;

function EventRow({ e }) {
  const [open, setOpen] = useState(false);
  const t = EVENT_TYPES[e.event_type] || EVENT_TYPES.default;
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <EventIcon type={e.event_type} />
      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold text-navy-800">{t.label}</span>·
          <time dateTime={e.detected_at} title={formatDateTime(e.detected_at)}>
            {timeAgo(e.detected_at)}
          </time>
          <SeverityBadge severity={e.severity} />
          <ReviewBadge reviewStatus={e.review_status} />
        </div>
        <p className="mt-1.5 text-sm text-navy-900" dir="auto">
          {e.summary}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {e.scheme_id && (
            <Link to={`/schemes/${encodeURIComponent(e.scheme_id)}`} className="link">
              View scheme
            </Link>
          )}
          {e.document_url && (
            <a href={e.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 link">
              {hostOf(e.document_url)} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
          {e.source_id && <span className="text-slate-400">source: {e.source_id}</span>}
        </div>
        {e.diff && (
          <div className="mt-2">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
              {open ? "Hide diff" : "Show diff"}
            </button>
            {open && (
              <div className="mt-2">
                <DiffView diff={e.diff} />
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function IngestForm({ sources, onDone }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState(null);
  const [state, setState] = useState({ busy: false, error: null, result: null });
  const validUrl = /^https?:\/\/\S+$/i.test(url.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!validUrl) return;
    setState({ busy: true, error: null, result: null });
    try {
      const res = await api.ingest({ url: url.trim(), title: title.trim(), sourceId, file });
      setState({ busy: false, error: null, result: res });
      setUrl("");
      setTitle("");
      setFile(null);
      e.target.reset();
      onDone?.();
    } catch (err) {
      setState({ busy: false, error: err, result: null });
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <h2 className="section-title flex items-center gap-2">
          <FileUp className="h-5 w-5 text-emerald-600" aria-hidden /> Add official document manually
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          For when an official site is down or blocks the crawler. The URL <strong>must be the official government page
          or PDF</strong> the document comes from: it is used for citations. Optionally upload the PDF you downloaded
          from it.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="ing-url" className="label">
            Official URL <span className="text-rose-600">*</span>
          </label>
          <input id="ing-url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://punjab.gov.pk/..." className="input" />
          {url && !validUrl && <p className="mt-1 text-xs text-rose-600">Enter a full http(s) URL.</p>}
        </div>
        <div>
          <label htmlFor="ing-title" className="label">
            Title
          </label>
          <input id="ing-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheme notification 2025" className="input" dir="auto" />
        </div>
        <div>
          <label htmlFor="ing-source" className="label">
            Source (optional)
          </label>
          <select id="ing-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="input">
            <option value="">Not linked to a source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ing-file" className="label">
            PDF file (optional)
          </label>
          <input
            id="ing-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-800 hover:file:bg-navy-100"
          />
          <p className="mt-1 text-xs text-slate-500">Without a file, the server fetches the URL itself. Scanned (image-only) PDFs cannot be read.</p>
        </div>
      </div>
      {state.error && <ErrorState error={state.error} compact />}
      {state.result && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          Stored: <strong>{String(state.result.result)}</strong>
          {state.result.index && (
            <span className="block text-xs text-emerald-800">
              Index: {state.result.index.indexed_documents ?? 0} document(s) re-indexed, {state.result.index.chunks_added ?? 0} chunk(s) added.
            </span>
          )}
        </p>
      )}
      <button type="submit" disabled={!validUrl || state.busy} className="btn-primary">
        {state.busy ? <Spinner /> : <FileUp className="h-4 w-4" aria-hidden />} {state.busy ? "Ingesting (can take a minute)..." : "Add document"}
      </button>
    </form>
  );
}

export default function Updates() {
  const { data, error, loading, reload } = useAsync((signal) => api.updates({ signal }), []);
  const [runState, setRunState] = useState({ busy: false, error: null, msg: "" });
  const [typeFilter, setTypeFilter] = useState("");
  const running = Boolean(data?.running);

  // Poll every 5 s while a check is running.
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => reload({ silent: true }), POLL_MS);
    return () => clearInterval(t);
  }, [running, reload]);

  const runNow = async () => {
    setRunState({ busy: true, error: null, msg: "" });
    try {
      const res = await api.runUpdates();
      setRunState({ busy: false, error: null, msg: res.status === "already_running" ? "A check is already running." : "Update check started." });
      await reload({ silent: true });
    } catch (err) {
      setRunState({ busy: false, error: err, msg: "" });
    }
  };

  const events = useMemo(() => (data?.events || []).filter((e) => !typeFilter || e.event_type === typeFilter), [data, typeFilter]);
  const types = useMemo(() => [...new Set((data?.events || []).map((e) => e.event_type))], [data]);
  const lr = data?.last_run;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Recent Updates"
        subtitle="The agent re-checks official sources on a schedule, diffs every page, and flags rule changes for human re-verification."
        actions={
          <button type="button" onClick={runNow} disabled={running || runState.busy} className="btn-primary">
            {running || runState.busy ? <Spinner /> : <Play className="h-4 w-4" aria-hidden />}
            {running ? "Checking sources..." : "Run update check now"}
          </button>
        }
      />

      {runState.error && <ErrorState error={runState.error} compact />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Schedule
            </p>
            <p className="mt-1 text-sm text-navy-900">
              Every <strong>{data.interval_hours}</strong> hour(s)
            </p>
            <p className="text-xs text-slate-500">Next run: {data.next_run ? formatDateTime(data.next_run) : "scheduler disabled"}</p>
          </div>
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} aria-hidden /> Current state
            </p>
            <p className="mt-1 text-sm font-semibold text-navy-900" role="status">
              {running ? "Running (refreshing every 5 s)" : "Idle"}
            </p>
            {runState.msg && <p className="text-xs text-slate-500">{runState.msg}</p>}
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last run</p>
            {lr ? (
              <>
                <p className="mt-1 text-sm text-navy-900">Finished {timeAgo(lr.finished_at)}</p>
                <p className="text-xs text-slate-500">
                  {lr.sources?.length ?? 0} source(s) · {lr.index?.chunks_added ?? 0} chunk(s) indexed · {lr.pending_review ?? 0} pending review
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">No run since the server started.</p>
            )}
          </div>
        </div>
      )}

      {loading && !data && <CardSkeleton lines={5} />}

      {data && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section aria-labelledby="timeline-h">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="timeline-h" className="section-title">
                Change history
              </h2>
              {types.length > 1 && (
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input !w-auto !py-1.5" aria-label="Filter by event type">
                  <option value="">All events</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {(EVENT_TYPES[t] || EVENT_TYPES.default).label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {events.length ? (
              <ol>
                {events.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </ol>
            ) : (
              <EmptyState icon={History} title="No changes detected yet">
                Run an update check to compare the official sources with the stored snapshots.
              </EmptyState>
            )}
          </section>

          <div className="space-y-6">
            <section className="card overflow-hidden" aria-labelledby="src-h">
              <h2 id="src-h" className="section-title p-5 pb-3">
                Official sources
              </h2>
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-4 py-2">Source</th>
                      <th scope="col" className="px-4 py-2">Status</th>
                      <th scope="col" className="px-4 py-2">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources?.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-4 py-3">
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-900 hover:text-emerald-700 hover:underline">
                            {s.name}
                          </a>
                          <p className="text-xs text-slate-400">
                            {hostOf(s.url)}
                            {s.pages_fetched ? ` · ${s.pages_fetched} pages` : ""}
                          </p>
                          {s.last_error && (
                            <p className="mt-1 break-words text-xs text-rose-700" title={s.last_error}>
                              {s.last_error.slice(0, 140)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <SourceStatusIcon status={s.status} />
                          {s.robots_status && <p className="mt-0.5 text-xs text-slate-400">robots: {s.robots_status}</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500" title={formatDateTime(s.last_checked_at)}>
                          {timeAgo(s.last_checked_at, "never")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <IngestForm sources={data.sources || []} onDone={() => reload({ silent: true })} />
          </div>
        </div>
      )}
    </div>
  );
}
