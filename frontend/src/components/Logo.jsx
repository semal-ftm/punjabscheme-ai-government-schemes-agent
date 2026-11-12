/** Leaf mark used in the header and hero. */
export function LeafMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 34c0-9 1.5-15 11-22-9 1.5-14 6.5-14 14" fill="none" stroke="#446c35" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 34c0-8-3-13-11-17 1.5 8 4.5 13 11 17z" fill="#5a8546" />
      <path d="M20 28c2.5-8 6.5-13 13-15.5-1.5 8-5.5 13-13 15.5z" fill="#9fbd89" />
      <path d="M12 21c3 2.5 5.5 6 8 12" fill="none" stroke="#f0f5ec" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LeafMark className={compact ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"} />
      <div className="min-w-0">
        <p className="truncate font-display text-xl font-bold leading-tight text-navy-900">PunjabScheme AI</p>
        {!compact && <p className="truncate text-[11px] leading-snug text-slate-500">Government Schemes Assistant for Punjab</p>}
      </div>
    </div>
  );
}
