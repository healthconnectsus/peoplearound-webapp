export type ProjectState = "idea" | "active" | "completed" | "archived";

export const PROJECT_STATES: ProjectState[] = [
  "idea",
  "active",
  "completed",
  "archived",
];

/** Display label + badge styles per state. No "failed" state by design. */
export const STATE_META: Record<
  ProjectState,
  { label: string; badge: string }
> = {
  idea: {
    label: "Idea",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  active: {
    label: "Building",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  completed: {
    label: "Completed",
    badge:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  archived: {
    label: "Archived",
    badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export const CATEGORIES = [
  "community",
  "games",
  "fitness",
  "outdoors",
  "food",
  "social",
  "arts",
  "learning",
  "events",
  "giving",
  "home",
  "venture",
  "other",
] as const;

/** Friendly emoji + label per category, used on cards and forms. */
export const CATEGORY_META: Record<
  (typeof CATEGORIES)[number],
  { label: string; emoji: string }
> = {
  community: { label: "Community", emoji: "🌱" },
  games: { label: "Games", emoji: "🎲" },
  fitness: { label: "Fitness", emoji: "🏃" },
  outdoors: { label: "Outdoors", emoji: "🌳" },
  food: { label: "Food & drink", emoji: "🍲" },
  social: { label: "Social", emoji: "☕" },
  arts: { label: "Arts & music", emoji: "🎨" },
  learning: { label: "Learning", emoji: "📚" },
  events: { label: "Events", emoji: "🎉" },
  giving: { label: "Giving", emoji: "🤝" },
  home: { label: "Home", emoji: "🏠" },
  venture: { label: "Venture", emoji: "💡" },
  other: { label: "Other", emoji: "✨" },
};

/** What kind of help the founder is looking for. */
export type HelpKind = "local" | "remote" | "both";

export const HELP_KINDS: HelpKind[] = ["local", "remote", "both"];

export const HELP_META: Record<
  HelpKind,
  { label: string; emoji: string; hint: string }
> = {
  local: {
    label: "Hands nearby",
    emoji: "🏠",
    hint: "People who can physically show up",
  },
  remote: {
    label: "Online help",
    emoji: "💻",
    hint: "Skills that work from anywhere",
  },
  both: {
    label: "Both",
    emoji: "🤝",
    hint: "Hands here and help from anywhere",
  },
};

/**
 * Who can see and join. Neighborhood is the default and the soul of the
 * product — wider reach is a deliberate per-project choice, never the norm.
 */
export type ProjectReach = "neighborhood" | "city" | "global";

export const REACHES: ProjectReach[] = ["neighborhood", "city", "global"];

export const REACH_META: Record<
  ProjectReach,
  { label: string; emoji: string; hint: string }
> = {
  neighborhood: {
    label: "My neighborhood",
    emoji: "🏘️",
    hint: "Just the people around you (recommended)",
  },
  city: {
    label: "My city",
    emoji: "🏙️",
    hint: "Neighbors across the whole city",
  },
  global: {
    label: "Anywhere",
    emoji: "🌍",
    hint: "Anyone on Peoplearound can find it",
  },
};

/** Left-border tint per category, for feed cards. */
export const CATEGORY_TINT: Record<(typeof CATEGORIES)[number], string> = {
  community: "border-l-emerald-400",
  games: "border-l-blue-400",
  fitness: "border-l-orange-400",
  outdoors: "border-l-green-500",
  food: "border-l-red-400",
  social: "border-l-teal-400",
  arts: "border-l-pink-400",
  learning: "border-l-sky-400",
  events: "border-l-fuchsia-400",
  giving: "border-l-rose-400",
  home: "border-l-amber-400",
  venture: "border-l-violet-400",
  other: "border-l-zinc-300 dark:border-l-zinc-600",
};

/**
 * Shadow tint per category, for feed cards — the same hue as the left
 * border, so a card's colour reads as "what kind of thing this is" from
 * both its edge and the light it casts. Literal classes: Tailwind's
 * scanner reads source text, so these can't be built by interpolation.
 */
export const CATEGORY_SHADOW: Record<(typeof CATEGORIES)[number], string> = {
  community: "shadow-emerald-500/25 hover:shadow-emerald-500/40",
  games: "shadow-blue-500/25 hover:shadow-blue-500/40",
  fitness: "shadow-orange-500/25 hover:shadow-orange-500/40",
  outdoors: "shadow-green-600/25 hover:shadow-green-600/40",
  food: "shadow-red-500/25 hover:shadow-red-500/40",
  social: "shadow-teal-500/25 hover:shadow-teal-500/40",
  arts: "shadow-pink-500/25 hover:shadow-pink-500/40",
  learning: "shadow-sky-500/25 hover:shadow-sky-500/40",
  events: "shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40",
  giving: "shadow-rose-500/25 hover:shadow-rose-500/40",
  home: "shadow-amber-500/25 hover:shadow-amber-500/40",
  venture: "shadow-violet-500/25 hover:shadow-violet-500/40",
  other: "shadow-zinc-500/25 hover:shadow-zinc-500/40",
};

export function categoryShadow(category: string): string {
  return (
    CATEGORY_SHADOW[category as (typeof CATEGORIES)[number]] ??
    CATEGORY_SHADOW.other
  );
}

export function categoryTint(category: string): string {
  return (
    CATEGORY_TINT[category as (typeof CATEGORIES)[number]] ??
    CATEGORY_TINT.other
  );
}

/** "Maria Alvarez" → "MA", "sam" → "S" — for avatar bubbles. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** ISO timestamp `days` days ago (component-body safe, like timeAgo). */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function categoryMeta(category: string) {
  return (
    CATEGORY_META[category as (typeof CATEGORIES)[number]] ??
    CATEGORY_META.other
  );
}

/** Human-friendly relative time, e.g. "just now", "3 days ago". */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export type ProjectEvent = {
  id: string;
  project_id: string;
  title: string;
  starts_at: string;
  place: string;
  created_at: string;
  project?: { title: string } | null;
  rsvps: { user_id: string }[];
};

/**
 * Event times are stored as the naive neighborhood-local time the founder
 * typed (Postgres interprets it as UTC), so we format in UTC to round-trip
 * exactly what they entered. Real timezone handling arrives with
 * neighborhoods (a neighborhood implies a timezone).
 */
export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * True if the event hasn't happened yet. Because stored times are naive
 * neighborhood-local (see formatEventTime), comparison against real UTC now
 * is off by the neighborhood's UTC offset — so events keep counting as
 * upcoming for a 14-hour grace period. Erring this way only ever shows a
 * just-finished event as current, never hides a future one.
 */
export function isUpcomingEvent(iso: string): boolean {
  return new Date(iso).getTime() > Date.now() - 14 * 60 * 60 * 1000;
}

/**
 * Calendar export stamp: YYYYMMDDTHHMMSS with NO trailing Z — a "floating"
 * local time. Our events store the naive neighborhood-local time the founder
 * typed (interpreted as UTC), so exporting it floating shows exactly that
 * wall-clock time in any calendar app.
 */
export function calendarStamp(iso: string, addHours = 0): string {
  return new Date(new Date(iso).getTime() + addHours * 3600000)
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, "");
}

/** "Add to Google Calendar" URL for an event (default 2h duration). */
export function googleCalendarUrl(
  e: { title: string; starts_at: string; place: string },
  projectTitle: string,
  projectUrl: string,
): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${calendarStamp(e.starts_at)}/${calendarStamp(e.starts_at, 2)}`,
    details: `Part of “${projectTitle}” on Peoplearound — ${projectUrl}`,
    location: e.place || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** The last `n` calendar days as YYYY-MM-DD keys, oldest first. */
export function recentDayKeys(n: number): string[] {
  const today = Date.now();
  return Array.from({ length: n }, (_, i) =>
    new Date(today - (n - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}

/** True if the timestamp is within the last `days` days. */
export function isWithinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < days * 24 * 60 * 60 * 1000;
}

/**
 * Allowed owner-driven state transitions. Notably there is no path to a
 * "failed" state — projects are archived gracefully, never marked failed.
 */
export const TRANSITIONS: Record<ProjectState, ProjectState[]> = {
  idea: ["active", "archived"],
  active: ["completed", "archived"],
  completed: ["active", "archived"],
  archived: ["active"],
};

export type MembershipStatus = "pending" | "accepted";

export type ContributionType =
  | "knowledge"
  | "resource"
  | "skill"
  | "time"
  | "presence";

export const CONTRIBUTION_TYPES: ContributionType[] = [
  "knowledge",
  "resource",
  "skill",
  "time",
  "presence",
];

/** Friendly emoji + label + hint per contribution type, used in the log form. */
export const CONTRIBUTION_TYPE_META: Record<
  ContributionType,
  { label: string; emoji: string; hint: string }
> = {
  knowledge: {
    label: "Knowledge",
    emoji: "🧠",
    hint: "Shared know-how that moved things forward",
  },
  resource: {
    label: "Resource",
    emoji: "🧰",
    hint: "Brought a thing the project needed",
  },
  skill: { label: "Skill", emoji: "🛠️", hint: "Did skilled work" },
  time: { label: "Time", emoji: "⏰", hint: "Put in the hours" },
  presence: { label: "Presence", emoji: "🙋", hint: "Showed up" },
};

/**
 * The trust ladder: logged (teammate records it) → accepted (founder confirms
 * it landed) → confirmed (a second person attests). Only confirmed
 * contributions count toward reputation. No rejected/failed status by design.
 */
export type ContributionStatus = "logged" | "accepted" | "confirmed";

export type Attestation = {
  attester_id: string;
  created_at: string;
  attester?: { display_name: string | null } | null;
};

export type Contribution = {
  id: string;
  contributor_id: string;
  type: ContributionType;
  description: string;
  status: ContributionStatus;
  created_at: string;
  confirmed_at: string | null;
  contributor?: { display_name: string | null } | null;
  attestations: Attestation[];
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  state: ProjectState;
  help: HelpKind;
  reach: ProjectReach;
  photo_url?: string | null;
  /** Unsplash photographer credit (0039); null for uploaded photos. */
  photo_credit_name?: string | null;
  photo_credit_url?: string | null;
  /** The rhythm this happens on — free text, not a schedule (0037). */
  when_text?: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: { display_name: string | null; avatar_url?: string | null } | null;
  neighborhood?: { name: string; city: string | null } | null;
};

export type Membership = {
  user_id: string;
  status: MembershipStatus;
  created_at: string;
  profile?: { display_name: string | null } | null;
};

export type Star = {
  user_id: string;
  created_at: string;
  profile?: { display_name: string | null } | null;
};

/** One entry in a project's history timeline — the accumulating true story. */
export type TimelineEntry = {
  at: string;
  icon: string;
  text: string;
};

/** Truncate long text for one-line timeline entries. */
export function excerpt(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
