import "server-only";
import QRCode from "qrcode-svg";
import { createAnonClient } from "@/lib/supabase/anon";
import { SITE_URL } from "@/lib/site";
import { AiUnavailable, generateJson, type JsonSchema } from "@/lib/ai";
import { CATEGORY_META, HELP_META, STATE_META } from "@/lib/projects";
import { coerceFlyerCopy, draftFlyerCopy, type FlyerCopy } from "@/lib/flyer-copy";
import { FLYER_STYLES, type FlyerStyleKey } from "@/lib/flyer-styles";

/**
 * A project on paper (migration 0082).
 *
 * Three things live here: the public face of a published project (what a
 * stranger who scanned the code sees), the code itself, and the assistant
 * that writes the flyer's words from the project's own facts. The words are
 * only ever a first draft — the steward's edits are the final version, and
 * nothing here invents a date, a place or a number the project did not say.
 */

export type PublicProjectEvent = {
  title: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  share_code: string | null;
  going: number;
};

export type PublicProject = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  state: "idea" | "active" | "completed" | "archived";
  help: "local" | "remote" | "both";
  when_text: string | null;
  photo_url: string | null;
  photo_credit_name: string | null;
  photo_credit_url: string | null;
  created_at: string;
  community: { name: string; city: string | null } | null;
  stars: number;
  team: number;
  updates: number;
  last_update_at: string | null;
  events: PublicProjectEvent[];
  jobs: string[];
  flyer: (FlyerCopy & { style: FlyerStyleKey }) | null;
};

export function projectShareUrl(code: string): string {
  return `${SITE_URL}/p/${code}`;
}

/**
 * Reads with the anonymous client, so the page never touches a cookie and
 * can be cached and served to everyone alike.
 */
export async function publicProject(code: string): Promise<PublicProject | null> {
  if (!/^[A-Z0-9]{4,16}$/i.test(code)) return null;
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("public_project", { p_code: code });
  if (error || !data) return null;
  return data as PublicProject;
}

/**
 * The code, in the flyer's own ink on its own paper. Vector, so it prints
 * sharp at any size; error correction Q, because this gets taped outside.
 */
export function flyerQr(url: string, style: FlyerStyleKey): string {
  const s = FLYER_STYLES[style];
  return new QRCode({
    content: url,
    padding: 2,
    ecl: "Q",
    join: true,
    container: "svg-viewbox",
    color: s.ink,
    background: s.paper,
    width: 512,
    height: 512,
  }).svg();
}

// ----------------------------------------------------------- the assistant

/** What the assistant is told. All of it comes from the project; none of it is a name. */
export type FlyerFacts = {
  title: string;
  description: string | null;
  category: string;
  state: string;
  help: string;
  when_text: string | null;
  community: { name: string; city: string | null } | null;
  events: { title: string; when: string; place: string | null }[];
  jobs: string[];
  team: number;
  stars: number;
  /** The steward's note: "mention we need a truck", "keep it funny". */
  hint: string | null;
};

const SYSTEM = `You write neighborhood flyers for Peoplearound, a hyperlocal app where a person starts a project — a cleanup, a repair café, a choir, a block party, a small venture — and neighbors join to build it.

The flyer is printed and taped to a lamppost, or shared in a group chat. It carries a QR code that opens the project's page, where a reader can join. Your job is the words.

Rules:
- Use only what you are given. Never invent dates, places, numbers, names or promises. If a detail is missing, write around it.
- Write in the project's own language — the language of its title and description.
- Sound like the person who started it talking to the people on their street: warm, direct, specific. No hype, no exclamation marks in the headline, no corporate phrasing, nothing like "join us on this journey".
- headline: at most 6 words, the whole idea at a glance. Not the project title verbatim unless it already reads like a headline.
- subline: one sentence, at most 16 words, saying what will actually happen or exist.
- body: two or three short sentences, at most 60 words in all: why it matters to the neighborhood, and what a reader would do.
- bullets: exactly 3 short lines, each at most 8 words — the concrete asks, what to bring, skills wanted, or what a helper gets. Use the open jobs when there are any.
- cta: one line, at most 10 words, telling the reader to scan the code to join. The code is on the flyer.
- If the steward added a note, honor it over these defaults.`;

const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    headline: { type: "string", description: "At most 6 words." },
    subline: { type: "string", description: "One sentence, at most 16 words." },
    body: { type: "string", description: "Two or three short sentences, at most 60 words." },
    bullets: {
      type: "array",
      items: { type: "string", description: "At most 8 words." },
      minItems: 3,
      maxItems: 3,
    },
    cta: { type: "string", description: "At most 10 words; tells the reader to scan the code." },
  },
  required: ["headline", "subline", "body", "bullets", "cta"],
  additionalProperties: false,
};

const SCHEMA_HINT = `"headline" (string, at most 6 words), "subline" (string, one sentence, at most 16 words), "body" (string, two or three short sentences, at most 60 words), "bullets" (array of exactly 3 short strings, each at most 8 words), "cta" (string, at most 10 words, telling the reader to scan the code).`;

/** The project, as a few plain lines the assistant can work from. */
export function describeForFlyer(f: FlyerFacts): string {
  const cat = CATEGORY_META[f.category as keyof typeof CATEGORY_META]?.label ?? f.category;
  const state = STATE_META[f.state as keyof typeof STATE_META]?.label ?? f.state;
  const help = HELP_META[f.help as keyof typeof HELP_META]?.label ?? f.help;
  const where = [f.community?.name, f.community?.city].filter(Boolean).join(", ");
  const lines = [
    `Project: ${f.title}`,
    `Kind: ${cat}`,
    where ? `Where: ${where}` : null,
    `Status: ${state}${f.when_text ? ` — ${f.when_text}` : ""}`,
    `Help wanted: ${help}`,
    "",
    "Description:",
    (f.description ?? "").trim() || "(none written yet)",
    "",
    f.events.length
      ? ["Coming up:", ...f.events.map((e) => `- ${e.title} — ${e.when}${e.place ? ` — ${e.place}` : ""}`)].join("\n")
      : "Coming up: nothing scheduled yet",
    f.jobs.length ? `Open jobs: ${f.jobs.join("; ")}` : null,
    `People: ${f.team} building it, ${f.stars} neighbors starred it`,
    f.hint ? `\nSteward's note: ${f.hint}` : null,
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

/**
 * A first draft of the words. With no assistant configured, a plain one from
 * the project's own text — the studio works either way, it is just less
 * eloquent. Any other failure is the caller's to show.
 */
export async function writeFlyerCopy(
  f: FlyerFacts,
): Promise<{ copy: FlyerCopy; model: string | null }> {
  try {
    const { data, model } = await generateJson({
      system: SYSTEM,
      user: describeForFlyer(f),
      schema: SCHEMA,
      schemaHint: SCHEMA_HINT,
    });
    const copy = coerceFlyerCopy(data);
    if (!copy) throw new Error("The assistant's answer had no headline in it");
    return { copy, model };
  } catch (e) {
    if (e instanceof AiUnavailable) {
      return {
        copy: draftFlyerCopy({ title: f.title, description: f.description, help: f.help, jobs: f.jobs }),
        model: null,
      };
    }
    throw e;
  }
}
