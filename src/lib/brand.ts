/**
 * The wordmark's letters, as a palette.
 *
 * "peoplearound" spells the product in its own navigation — P·E·O·P·L·E —
 * and each letter carries a hue in public/logo.svg (v7). Actions borrow the
 * hue of the rail they belong to, so "start a project" and the Projects
 * letter are visibly the same idea.
 *
 *   p  People around      #c50000
 *   e  Events             #ffa406
 *   o  Offers             #04b495   ← teal
 *   p  Projects           #3b7fda   ← blue
 *   l  Local Faves        #af00f8
 *   e  Explore/community  #ff00ae   ← fuchsia
 *
 * MARK is the exact letter colour, for icons and small marks that carry no
 * text.
 *
 * BUTTON fills use that same exact colour — a darkened approximation was
 * tried first and read as "close to the logo" rather than as the logo. What
 * changes instead is the label, chosen per hue. Fuchsia carries near-black
 * text (5.23:1, clear of WCAG AA). Projects carries white by explicit
 * request, at 4.01:1 — just under the 4.5:1 AA asks for, a deliberate trade
 * of the guideline for brand recognition, recorded here so it isn't
 * rediscovered as a bug. Its hover darkens to #3573c9 (4.72:1) rather than
 * lightening, so the pair never drops further.
 *
 * Hover direction follows the label: lighter under dark text, darker under
 * white, so the pair always opens rather than squeezes.
 *
 * All literal strings: Tailwind's scanner reads source text, so a class
 * assembled at runtime never reaches the stylesheet.
 */

export const BRAND_MARK = {
  people: "#c50000",
  events: "#ffa406",
  offers: "#04b495",
  projects: "#3b7fda",
  faves: "#af00f8",
  community: "#ff00ae",
} as const;

export const BRAND_BUTTON = {
  people: "bg-[#c50000] text-white hover:bg-[#a80000]",
  events: "bg-[#ffa406] text-[#3a2300] hover:bg-[#ffb733]",
  offers: "bg-[#04b495] text-[#013f34] hover:bg-[#0dd9b5]",
  projects: "bg-[#3b7fda] text-white hover:bg-[#3573c9]",
  faves: "bg-[#af00f8] text-white hover:bg-[#9500d4]",
  community: "bg-[#ff00ae] text-[#2b001d] hover:bg-[#ff33be]",
} as const;

/**
 * Asking for a hand is its own act, not a lesser project — so it carries its
 * own colour rather than a dimmer version of the project teal.
 */
export const HELP_BUTTON = "bg-[#12967f] text-white hover:bg-[#0f7f6b]";

export type BrandKey = keyof typeof BRAND_MARK;
