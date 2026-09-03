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
 *   o  Offers             #87d400
 *   p  Projects           #00a2ca   ← teal
 *   l  Local Faves        #af00f8
 *   e  Explore/community  #ff00ae   ← fuchsia
 *
 * MARK is the exact letter colour, for icons and small marks that carry no
 * text.
 *
 * BUTTON fills are that hue darkened until white text on them clears WCAG AA
 * (4.5:1). The raw letters don't: white on #00a2ca measures 2.99:1 and on
 * #ff00ae 3.58:1 — unreadable as button fills. The darkened versions measure
 * 4.95:1 and 5.11:1 while staying recognisably the same colour.
 *
 * Both are literal strings: Tailwind's scanner reads source text, so a class
 * assembled at runtime never reaches the stylesheet.
 */

export const BRAND_MARK = {
  people: "#c50000",
  events: "#ffa406",
  offers: "#87d400",
  projects: "#00a2ca",
  faves: "#af00f8",
  community: "#ff00ae",
} as const;

export const BRAND_BUTTON = {
  people: "bg-[#a80000] hover:bg-[#8d0000]",
  events: "bg-[#8a5600] hover:bg-[#734700]",
  offers: "bg-[#4a7300] hover:bg-[#3d5f00]",
  projects: "bg-[#007a99] hover:bg-[#00647f]",
  faves: "bg-[#8f00cb] hover:bg-[#7800aa]",
  community: "bg-[#d1008f] hover:bg-[#b0007a]",
} as const;

export type BrandKey = keyof typeof BRAND_MARK;
