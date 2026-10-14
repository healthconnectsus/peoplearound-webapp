/**
 * The words on a flyer, and the limits that keep them on one sheet.
 *
 * Client-safe: the studio edits these in the browser, so nothing here may
 * touch the server. The assistant writes a first draft (src/lib/flyer.ts),
 * the steward corrects it, and `coerceFlyerCopy` is what both go through
 * before anything is stored or drawn.
 */

export type FlyerCopy = {
  /** The whole idea at a glance. */
  headline: string;
  /** One sentence: what will actually happen or exist. */
  subline: string;
  /** Two or three short sentences: why, and what a reader would do. */
  body: string;
  /** Up to three concrete lines — asks, what to bring, what a helper gets. */
  bullets: string[];
  /** One line telling the reader to scan the code. */
  cta: string;
};

export const COPY_LIMITS = {
  headline: 80,
  subline: 160,
  body: 600,
  bullet: 80,
  bullets: 3,
  cta: 120,
} as const;

/** Cut to `max` characters at a word boundary, with an ellipsis if it was cut. */
function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > max * 0.6 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Whatever came back — from the assistant, from a form, from the database —
 * into copy that fits. `null` when there is not even a headline in it.
 */
export function coerceFlyerCopy(raw: unknown): FlyerCopy | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const headline = clip(str(r.headline), COPY_LIMITS.headline);
  if (!headline) return null;

  const bullets = (Array.isArray(r.bullets) ? r.bullets : [])
    .map((b) => clip(str(b), COPY_LIMITS.bullet))
    .filter(Boolean)
    .slice(0, COPY_LIMITS.bullets);

  return {
    headline,
    subline: clip(str(r.subline), COPY_LIMITS.subline),
    body: clip(str(r.body), COPY_LIMITS.body),
    bullets,
    cta: clip(str(r.cta), COPY_LIMITS.cta) || "Scan the code to join in",
  };
}

/** The first sentence of a text, and the rest. */
function splitFirstSentence(text: string): [string, string] {
  const t = text.replace(/\s+/g, " ").trim();
  const m = /^(.{12,}?[.!?])\s+(.*)$/.exec(t);
  return m ? [m[1], m[2]] : [t, ""];
}

/**
 * A flyer written without the assistant — from the project's own words.
 * It is what the studio shows before the assistant has been asked, and what
 * a project gets when no assistant is configured at all. Plain, but true.
 */
export function draftFlyerCopy(p: {
  title: string;
  description: string | null;
  help: "local" | "remote" | "both" | string;
  jobs: string[];
}): FlyerCopy {
  const [first, rest] = splitFirstSentence(p.description ?? "");
  const bullets = p.jobs.length
    ? p.jobs
    : p.help === "remote"
      ? ["Help from anywhere, on your own time", "Skills and ideas as welcome as hands", "Say hello and we will find you a part"]
      : ["Hands welcome, no experience needed", "An hour of your time already helps", "Bring a neighbor"];

  return coerceFlyerCopy({
    headline: p.title,
    subline: first || "Neighbors are building this together.",
    body: rest,
    bullets,
    cta: "Scan the code to join in",
  }) as FlyerCopy;
}
