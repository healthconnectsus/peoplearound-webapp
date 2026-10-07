/**
 * The brand palette, derived from the mark's gradient.
 *
 * The logo (public/logo.svg, v11.1) is a heart that runs from deep teal on
 * the left through green, gold and orange to watermelon on the right, beside
 * a neutral wordmark. Everything here is read off that gradient rather than
 * chosen and then justified:
 *
 *   MARK   — the six rail icons, sampled at six even points along the
 *            gradient (interpolated in OKLab so the middle stays vivid), then
 *            each darkened only as far as a 3:1 icon stroke on white needs.
 *            Top to bottom, the rail is the logo read left to right.
 *   BUTTON — one fill for every primary button. A site with six button
 *            colours has no primary action; this one has the teal, darkened
 *            to 4.65:1 with white text (WCAG AA). The tokens live in
 *            globals.css so the CSS and this file cannot disagree.
 *
 * All literal strings: Tailwind's scanner reads source text, so a class
 * assembled at runtime never reaches the stylesheet.
 */

/** The gradient's stops, in order, plus the wordmark's neutral. */
export const BRAND = {
  teal: "#0E9090",
  green: "#39AC4C",
  gold: "#E6C833",
  orange: "#EF9343",
  coral: "#F26D5F",
  /** The wordmark's neutral — light mode, then dark. */
  ink: "#3c404a",
  inkDark: "#e7e9ee",
} as const;

/** One stop per rail, the logo read top to bottom. ≥ 3:1 on white as strokes. */
export const BRAND_MARK = {
  people: "#0e9090",
  events: "#30a660",
  offers: "#889c0f",
  projects: "#c08900",
  faves: "#dc7938",
  community: "#ee6a5c",
} as const;

/** The primary fill, for every key — the same button everywhere. */
const PRIMARY = "bg-pa-brand text-pa-brand-ink hover:bg-pa-brand-hover";

export const BRAND_BUTTON = {
  people: PRIMARY,
  events: PRIMARY,
  offers: PRIMARY,
  projects: PRIMARY,
  faves: PRIMARY,
  community: PRIMARY,
} as const;

/** Asking for a hand is a primary action like any other. */
export const HELP_BUTTON = PRIMARY;

export type BrandKey = keyof typeof BRAND_MARK;
