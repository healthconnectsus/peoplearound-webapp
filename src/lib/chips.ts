/**
 * The filter-button look, in one place.
 *
 * Modelled on Nextdoor's feed tabs: white, a 2px slate outline — grey-blue,
 * not black — dark text, gently rounded. The current one is marked by a
 * darker outline and heavier text rather than a filled block of colour:
 * filled chips read as buttons that *do* something, and these only say which
 * slice you're looking at.
 *
 * Kept as literal strings because Tailwind's scanner reads source text —
 * classes composed at runtime never make it into the stylesheet.
 */
export const CHIP =
  "rounded-lg border-2 px-4 py-1.5 text-sm font-medium transition-colors";

export const CHIP_IDLE =
  "border-slate-500 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-400 dark:bg-zinc-900 dark:text-white/80 dark:hover:bg-white/10";

export const CHIP_ACTIVE =
  "border-slate-800 bg-white font-semibold text-slate-900 dark:border-white dark:bg-zinc-900 dark:text-white";

/** `chip(isActive)` — the full class string for one filter button. */
export function chip(active: boolean): string {
  return `${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`;
}
