import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, CalendarClock, ClipboardCheck, ExternalLink, FileText, History, Hourglass, MessagesSquare, SearchX,
} from "lucide-react";
import { api } from "../api.js";
import { CategoryBadge, LevelBadge, ReviewBadge, RulesBadge, SeverityBadge } from "../components/Badges.jsx";
import { EventIcon, EVENT_TYPES } from "../components/ChangeMeta.jsx";
import DiffView from "../components/DiffView.jsx";
import { SaveButton } from "../components/SchemeCard.jsx";
import { CardSkeleton, EmptyState, ErrorState } from "../components/States.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { NOT_CONFIRMED, fieldLabel } from "../lib/constants.js";
import { daysUntil, describeRule, formatDate, formatDateTime, hostOf, urduClass } from "../lib/format.js";
import { useAsync } from "../lib/useAsync.js";

const TABS = [
  ["overview", "Overview"],
  ["eligibility", "Eligibility criteria"],
  ["benefits", "Benefits"],
  ["documents", "Required documents"],
  ["apply", "How to apply"],
  ["status", "Status & deadline"],
  ["sources", "Source documents"],
  ["history", "Change history"],
];

function NotConfirmed({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      <strong className="font-semibold text-navy-800">{NOT_CONFIRMED}.</strong>{" "}
      {children || "The official source does not publish this information. Check the official page or helpline."}
    </p>
  );
}

function SourceLink({ url, label }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs link">
      {label || hostOf(url)} <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

/** benefits / documents / steps: [{text, quote, source_url}] */
function ItemList({ items, ordered }) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-slate-200 p-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
            {ordered ? i + 1 : "•"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-navy-900" dir="auto">
              {it.text}
            </p>
            {it.quote && it.quote !== it.text && (
              <blockquote dir="auto" className="mt-1.5 border-l-2 border-emerald-300 pl-2.5 text-xs italic text-slate-600">
                “{it.quote}”
              </blockquote>
            )}
            <SourceLink url={it.source_url} />
          </div>
        </li>
      ))}
    </List>
  );
}

function ChangeItem({ e }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex gap-3 rounded-xl border border-slate-200 p-3">
      <EventIcon type={e.event_type} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-navy-900" dir="auto">
          {e.summary}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span>{(EVENT_TYPES[e.event_type] || EVENT_TYPES.default).label}</span>·<span>{formatDateTime(e.detected_at)}</span>
          <SeverityBadge severity={e.severity} />
          <ReviewBadge reviewStatus={e.review_status} />
        </div>
        {e.document_url && <SourceLink url={e.document_url} />}
        {e.diff && (
          <div className="mt-2">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs font-semibold text-navy-700 hover:underline">
              {open ? "Hide" : "Show"} what changed
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

export default function SchemeDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");
  const { data: s, error, loading, reload } = useAsync((signal) => api.scheme(id, { signal }), [id]);

  if (loading && !s) return <CardSkeleton lines={6} />;
  if (error?.status === 404)
    return (
      <EmptyState icon={SearchX} title="Scheme not found" action={<Link to="/schemes" className="btn-secondary">Back to schemes</Link>}>
        No scheme with id “{id}” exists in the database.
      </EmptyState>
    );
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!s) return null;

  const days = s.deadline ? daysUntil(s.deadline) : null;
  const askText = `Tell me about ${s.name}: who is eligible, which documents are needed and how do I apply?`;

  const panels = {
    overview: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-navy-900" dir="auto">
          {s.summary || `${NOT_CONFIRMED}: no official summary stored yet.`}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Department", s.department],
            ["Sector", s.sector],
            ["Phase", s.phase],
            ["Level", s.level === "federal" ? "Federal (Government of Pakistan)" : "Provincial (Punjab)"],
            ["Data origin", s.origin === "curated" ? "Curated: rules copied from official text" : "Auto-discovered by the crawler"],
            ["Rules last verified", formatDate(s.last_verified)],
            ["First discovered", formatDate(s.discovered_at, "—")],
            ["Last updated", formatDate(s.updated_at, "—")],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-sm text-navy-900">{v || NOT_CONFIRMED}</dd>
            </div>
          ))}
        </dl>
      </div>
    ),
    eligibility: s.criteria?.length ? (
      <ul className="space-y-3">
        {s.criteria.map((c) => (
          <li key={c.criterion_id} className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-navy-900">{c.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {c.op === "manual" || !c.field ? "Verified by the scheme authority (official check)" : describeRule(fieldLabel(c.field), c.op, c.value)}
              {c.when?.field && ` · applies when ${describeRule(fieldLabel(c.when.field), c.when.op || "eq", c.when.value).toLowerCase()}`}
            </p>
            <blockquote dir="auto" className="mt-2 border-l-2 border-emerald-300 pl-2.5 text-sm italic text-slate-700">
              “{c.quote}”
            </blockquote>
            <SourceLink url={c.source_url} />
          </li>
        ))}
      </ul>
    ) : (
      <NotConfirmed>
        No eligibility rules have been verified for this scheme yet{s.origin !== "curated" ? " (it was auto-discovered)" : ""}. Read the
        official source before applying.
      </NotConfirmed>
    ),
    benefits: s.benefits?.length ? <ItemList items={s.benefits} /> : <NotConfirmed />,
    documents: s.documents?.length ? (
      <>
        <ItemList items={s.documents} />
        <p className="mt-3 text-xs text-slate-500">Never share your CNIC or bank details with this assistant; bring them only to the official office or portal.</p>
      </>
    ) : (
      <NotConfirmed />
    ),
    apply: (
      <div className="space-y-4">
        {s.steps?.length ? <ItemList items={s.steps} ordered /> : <NotConfirmed>The official application steps are not published.</NotConfirmed>}
        {s.application_url ? (
          <a href={s.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open official application page <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        ) : (
          <p className="text-sm text-slate-600">
            Official application link: <strong>{NOT_CONFIRMED}</strong>
          </p>
        )}
      </div>
    ),
    status: (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={s.status} />
          {s.status === "Unverified" && (
            <span className="text-sm text-slate-600">No officially confirmed application window. Do not assume it is open.</span>
          )}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opening date</dt>
            <dd className="mt-0.5 text-sm text-navy-900">{s.opening_date ? formatDate(s.opening_date) : NOT_CONFIRMED}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline</dt>
            <dd className="mt-0.5 text-sm text-navy-900">{s.deadline ? formatDate(s.deadline) : NOT_CONFIRMED}</dd>
          </div>
        </dl>
        {days !== null && (
          <div className={`flex items-center gap-3 rounded-xl p-4 ${days >= 0 ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>
            <Hourglass className="h-6 w-6 shrink-0" aria-hidden />
            <div>
              <p className="text-2xl font-bold">{days >= 0 ? days : 0}</p>
              <p className="text-sm">{days > 0 ? "days left until the official deadline" : days === 0 ? "Deadline is today" : `Deadline passed ${Math.abs(days)} day(s) ago`}</p>
            </div>
          </div>
        )}
        {s.status_quote && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Official status evidence</p>
            <blockquote dir="auto" className="mt-1 border-l-2 border-emerald-300 pl-2.5 text-sm italic text-slate-700">
              “{s.status_quote}”
            </blockquote>
          </div>
        )}
      </div>
    ),
    sources: (
      <div className="space-y-3">
        {s.source_url && (
          <p className="text-sm">
            Main official page: <SourceLink url={s.source_url} label={s.source_url} />
          </p>
        )}
        {s.source_documents?.length ? (
          <ul className="space-y-2">
            {s.source_documents.map((d) => (
              <li key={d.url} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="break-words text-sm font-medium text-navy-900 hover:text-emerald-700 hover:underline" dir="auto">
                    {d.title || d.url}
                  </a>
                  <p className="text-xs text-slate-500">
                    {d.content_type?.toUpperCase()} · {hostOf(d.url)} · fetched {formatDate(d.fetched_at)} · last changed {formatDate(d.last_changed_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <NotConfirmed>No source documents have been fetched for this scheme yet.</NotConfirmed>
        )}
      </div>
    ),
    history: s.changes?.length ? (
      <ul className="space-y-3">
        {s.changes.map((e) => (
          <ChangeItem key={e.id} e={e} />
        ))}
      </ul>
    ) : (
      <EmptyState icon={History} title="No changes recorded">
        The update checker has not detected any changes for this scheme.
      </EmptyState>
    ),
  };

  return (
    <div className="space-y-6">
      <Link to="/schemes" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All schemes
      </Link>

      <header className="card p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge category={s.category} />
          <LevelBadge level={s.level} />
          <StatusBadge status={s.status} />
          <RulesBadge rulesStatus={s.rules_status} />
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{s.name}</h1>
        {s.name_ur && (
          <p dir="rtl" className={`mt-1 text-lg text-slate-600 ${urduClass(s.name_ur)}`}>
            {s.name_ur}
          </p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          {s.department && <span>{s.department}</span>}
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-4 w-4" aria-hidden /> Rules verified: {formatDate(s.last_verified)}
          </span>
          {s.source_url && (
            <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 link">
              Official source ({hostOf(s.source_url)}) <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <SaveButton schemeId={s.id} />
          <Link to={`/eligibility?scheme=${encodeURIComponent(s.id)}`} className="btn-primary">
            <ClipboardCheck className="h-4 w-4" aria-hidden /> Check my eligibility
          </Link>
          <Link to={`/chat?q=${encodeURIComponent(askText)}`} className="btn-secondary">
            <MessagesSquare className="h-4 w-4" aria-hidden /> Ask AI about this scheme
          </Link>
        </div>
      </header>

      <div className="card overflow-hidden">
        <div role="tablist" aria-label="Scheme details" className="flex overflow-x-auto border-b border-slate-200 scroll-thin">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={(e) => {
                const i = TABS.findIndex(([k]) => k === tab);
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === key ? "border-emerald-600 text-navy-900" : "border-transparent text-slate-500 hover:text-navy-800"
              }`}
            >
              {label}
              {key === "eligibility" && s.criteria?.length ? <span className="ml-1 text-xs text-slate-400">({s.criteria.length})</span> : null}
              {key === "history" && s.changes?.length ? <span className="ml-1 text-xs text-slate-400">({s.changes.length})</span> : null}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="p-5 sm:p-6">
          {panels[tab]}
        </div>
      </div>
    </div>
  );
}
