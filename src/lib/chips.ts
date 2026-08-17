/**
 * The filter-button look, in one place.
 *
 * Modelled on Nextdoor's feed tabs: white, a thin grey outline, dark text,
 * gently rounded — and the current one marked by a black outline and heavier
 * text rather than a filled block of colour. Filled chips read as buttons
 * that *do* something; these only say which slice you're looking at.
 *
 * Kept as literal strings because Tailwind's scanner reads source text —
 * classes composed at runtime never make it into the stylesheet.
 */
export const CHIP =
  "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors";

export const CHIP_IDLE =
  "border-slate-300 bg-white text-black/75 hover:bg-black/5 dark:border-slate-600 dark:bg-zinc-900 dark:text-white/75 dark:hover:bg-white/10";

export const CHIP_ACTIVE =
  "border-black bg-white font-semibold text-black dark:border-white dark:bg-zinc-900 dark:text-white";

/** `chip(isActive)` — the full class string for one filter button. */
export function chip(active: boolean): string {
  return `${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`;
}
