/**
 * The looks a flyer can wear.
 *
 * Four, deliberately: enough that a cleanup and a supper club do not come
 * out of the same mould, few enough that choosing is a glance, not a task.
 * The colours are the site's own (globals.css) where there is one, and each
 * pairing clears AA for body text on its paper. "Ink" exists because most
 * neighborhood flyers end their lives on a photocopier, and colour is the
 * first thing a photocopier takes away.
 *
 * Client-safe: the studio switches between these in the browser.
 */

export type FlyerStyleKey = "teal" | "sunrise" | "garden" | "ink";

export type FlyerStyle = {
  key: FlyerStyleKey;
  label: string;
  hint: string;
  /** The sheet. */
  paper: string;
  /** Text. */
  ink: string;
  /** The band at the top, the bullets, the code. */
  accent: string;
  /** Text on the accent. */
  accentInk: string;
  /** Secondary text. */
  muted: string;
};

export const FLYER_STYLES: Record<FlyerStyleKey, FlyerStyle> = {
  teal: {
    key: "teal",
    label: "Teal",
    hint: "The site's own colour",
    paper: "#ffffff",
    ink: "#0b1f1f",
    accent: "#008282",
    accentInk: "#ffffff",
    muted: "#4b5f5f",
  },
  sunrise: {
    key: "sunrise",
    label: "Sunrise",
    hint: "Warm — food, markets, parties",
    paper: "#fff8ef",
    ink: "#2b1a0e",
    accent: "#b45d00",
    accentInk: "#ffffff",
    muted: "#6b5240",
  },
  garden: {
    key: "garden",
    label: "Garden",
    hint: "Green — outdoors, cleanups, planting",
    paper: "#f6fbf4",
    ink: "#10261a",
    accent: "#008827",
    accentInk: "#ffffff",
    muted: "#4a5e50",
  },
  ink: {
    key: "ink",
    label: "Ink",
    hint: "Black on white — photocopies well",
    paper: "#ffffff",
    ink: "#111111",
    accent: "#111111",
    accentInk: "#ffffff",
    muted: "#555555",
  },
};

export const FLYER_STYLE_KEYS = Object.keys(FLYER_STYLES) as FlyerStyleKey[];

export function isFlyerStyle(v: unknown): v is FlyerStyleKey {
  return typeof v === "string" && v in FLYER_STYLES;
}

/** The look a project starts with, from what kind of thing it is. */
export function defaultFlyerStyle(category: string): FlyerStyleKey {
  switch (category) {
    case "outdoors":
    case "community":
    case "giving":
      return "garden";
    case "food":
    case "social":
    case "events":
      return "sunrise";
    default:
      return "teal";
  }
}
