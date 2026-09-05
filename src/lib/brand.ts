/**
 * The brand palette, derived from the two-tone mark.
 *
 * The logo used to spell the product in six coloured letters, and this file
 * mapped each letter to a rail. That wordmark is gone: v9 is a two-tone
 * heart — a teal lobe and a violet one overlapping — beside a single
 * neutral wordmark. So the six-hue premise no longer had anything behind it.
 *
 * What replaces it: the rails are six stops on the ramp *between* the mark's
 * two colours, interpolated in OKLCH so the middle stays vivid instead of
 * going muddy the way straight RGB does. The first rail is the teal lobe
 * exactly, the last is the violet lobe exactly, and everything between is
 * provably a blend of the two — the identity, spread across the navigation,
 * rather than six colours chosen and then justified.
 *
 * MARK is the exact stop, for icons and small marks that carry no text.
 *
 * BUTTON is that stop darkened only as far as white text needs (>= 4.5:1,
 * WCAG AA), with a hover a step darker again so pointing at a button opens
 * its contrast rather than closing it. Two stops are already dark enough and
 * are used unchanged.
 *
 * All literal strings: Tailwind's scanner reads source text, so a class
 * assembled at runtime never reaches the stylesheet.
 */

/** The mark itself. The overlap is the violet lobe at 0.88 over the teal. */
export const BRAND = {
  teal: "#04b495",
  violet: "#af00f8",
  overlap: "#9a16ec",
  /** The wordmark's neutral — light mode, then dark. */
  ink: "#3c404a",
  inkDark: "#e7e9ee",
} as const;

export const BRAND_MARK = {
  people: "#04b495",
  events: "#00afbe",
  offers: "#009fea",
  projects: "#0081ff",
  faves: "#7656ff",
  community: "#af00f8",
} as const;

export const BRAND_BUTTON = {
  people: "bg-[#008468] text-white hover:bg-[#007156]",
  events: "bg-[#008190] text-white hover:bg-[#006d7c]",
  offers: "bg-[#0079c2] text-white hover:bg-[#0064ac]",
  projects: "bg-[#0070ed] text-white hover:bg-[#005bd7]",
  faves: "bg-[#7656ff] text-white hover:bg-[#6640ea]",
  community: "bg-[#af00f8] text-white hover:bg-[#9b00e1]",
} as const;

/**
 * Asking for a hand is a primary action like any other, so it takes the
 * brand's primary fill (the teal lobe) via the tokens in globals.css.
 */
export const HELP_BUTTON =
  "bg-pa-brand text-pa-brand-ink hover:bg-pa-brand-hover";

export type BrandKey = keyof typeof BRAND_MARK;
