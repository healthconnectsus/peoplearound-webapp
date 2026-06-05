export type GoalState = "idea" | "active" | "completed" | "archived";

export const GOAL_STATES: GoalState[] = [
  "idea",
  "active",
  "completed",
  "archived",
];

/** Display label + badge styles per state. No "failed" state by design. */
export const STATE_META: Record<GoalState, { label: string; badge: string }> = {
  idea: {
    label: "Idea",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  active: {
    label: "Active",
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

/**
 * Allowed owner-driven state transitions. Notably there is no path to a
 * "failed" state — goals are archived gracefully, never marked failed.
 */
export const TRANSITIONS: Record<GoalState, GoalState[]> = {
  idea: ["active", "archived"],
  active: ["completed", "archived"],
  completed: ["active", "archived"],
  archived: ["active"],
};

export type Goal = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  state: GoalState;
  created_at: string;
  updated_at: string;
  owner?: { display_name: string | null } | null;
};
