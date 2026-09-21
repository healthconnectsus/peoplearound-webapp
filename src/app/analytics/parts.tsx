/** The building blocks shared by both halves of the analytics page. */

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-black/60 dark:text-white/60">
        {label}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-black/40 dark:text-white/40">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Funnel bar: width proportional to the top of the funnel. */
export function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <li className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-black/60 dark:text-white/60">
        {label}
      </span>
      <span className="h-7 min-w-0 flex-1 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
        <span
          className={`flex h-full items-center justify-end rounded-lg px-2 text-xs font-semibold text-white ${color}`}
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%` }}
        >
          {value > 0 ? value : ""}
        </span>
      </span>
      <span className="w-12 shrink-0 text-right text-xs text-black/45 dark:text-white/45">
        {pct}%
      </span>
    </li>
  );
}
