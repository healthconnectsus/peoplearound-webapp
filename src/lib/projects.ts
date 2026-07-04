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
  "fitness",
  "learning",
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
  fitness: { label: "Fitness", emoji: "🏃" },
  learning: { label: "Learning", emoji: "📚" },
  home: { label: "Home", emoji: "🏠" },
  venture: { label: "Venture", emoji: "💡" },
  other: { label: "Other", emoji: "✨" },
};

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

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  state: ProjectState;
  created_at: string;
  updated_at: string;
  owner?: { display_name: string | null } | null;
};

export type Membership = {
  user_id: string;
  status: MembershipStatus;
  created_at: string;
  profile?: { display_name: string | null } | null;
};
