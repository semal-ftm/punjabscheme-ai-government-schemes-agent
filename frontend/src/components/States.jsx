import { AlertCircle, Inbox, Loader2, RefreshCw, ServerOff } from "lucide-react";

export function Spinner({ className = "h-4 w-4" }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} aria-hidden />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card space-y-3 p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i % 2 ? "w-4/5" : "w-full"}`} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-cream-50 px-6 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="font-semibold text-navy-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Friendly error card. Shows how to start the backend when it is unreachable. */
export function ErrorState({ error, onRetry, compact = false }) {
  const unreachable = error?.unreachable;
  const Icon = unreachable ? ServerOff : AlertCircle;
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-900 ${compact ? "p-3 text-sm" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{unreachable ? "Backend not reachable" : "Something went wrong"}</p>
          {unreachable ? (
            <p className="mt-1 text-sm">
              Start it from the <code className="rounded bg-white/70 px-1">backend</code> folder with{" "}
              <code className="rounded bg-white/70 px-1">uvicorn app.api:app</code>, then retry.
            </p>
          ) : (
            <p className="mt-1 break-words text-sm">{error?.message || String(error)}</p>
          )}
          {onRetry && (
            <button type="button" onClick={() => onRetry()} className="btn-secondary mt-3 !py-1.5">
              <RefreshCw className="h-4 w-4" aria-hidden /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
          {Icon && <Icon className="h-6 w-6 shrink-0 text-gold-500" aria-hidden />}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
