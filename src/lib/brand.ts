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
 * changes instead is the label: white on #3b7fda is only 4.01:1, so these
 * buttons carry near-black text of their own hue, the way the amber "I need
 * a favor" button already does. That lands at 4.95:1 (teal) and 5.23:1
 * (fuchsia), both clear of WCAG AA.
 *
 * Hover therefore goes *lighter*, not darker: with dark text, a darker fill
 * would squeeze the contrast rather than open it.
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
  people: "bg-[#c50000] text-white hover:bg-[#d81212]",
  events: "bg-[#ffa406] text-[#3a2300] hover:bg-[#ffb733]",
  offers: "bg-[#87d400] text-[#1f3100] hover:bg-[#9ae01f]",
  projects: "bg-[#00a2ca] text-[#032c36] hover:bg-[#1ab5dc]",
  faves: "bg-[#af00f8] text-white hover:bg-[#bd26ff]",
  community: "bg-[#ff00ae] text-[#2b001d] hover:bg-[#ff33be]",
} as const;

export type BrandKey = keyof typeof BRAND_MARK;
