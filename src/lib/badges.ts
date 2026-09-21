import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Badges — evidence, not trophies (see docs/INCENTIVES.md §2.5).
 * Every badge is DERIVED from confirmed records at read time: no badge
 * table, no counters, nothing to farm. Only earned badges are ever shown —
 * locked-badge teasers are bait, and bait doesn't ship.
 */

export type Badge = {
  key: string;
  label: string;
  /** One line of the fact it certifies. */
  fact: string;
  emoji: string;
  /** Medallion gradient stops. */
  from: string;
  to: string;
};

const DEFS = {
  founding: (place: string): Badge => ({
    key: "founding",
    label: "Founding Neighbor",
    fact: `One of the first 10 in ${place}`,
    emoji: "🌱",
    from: "#34d399",
    to: "#0d9488",
  }),
  firstIdea: {
    key: "first-idea",
    label: "First Idea Shared",
    fact: "Put an idea out there for neighbors to join",
    emoji: "💡",
    from: "#fde047",
    to: "#f59e0b",
  } as Badge,
  firstHelp: {
    key: "first-help",
    label: "First Confirmed Help",
    fact: "A neighbor confirmed your first contribution",
    emoji: "🛠️",
    from: "#fbbf24",
    to: "#ea580c",
  } as Badge,
  trustedHands: {
    key: "trusted-hands",
    label: "Trusted Hands",
    fact: "5 contributions confirmed by neighbors",
    emoji: "🤲",
    from: "#a78bfa",
    to: "#7c3aed",
  } as Badge,
  witness: {
    key: "witness",
    label: "Witness",
    fact: "Attested 3 neighbors' contributions",
    emoji: "👀",
    from: "#38bdf8",
    to: "#2563eb",
  } as Badge,
  showedUp: {
    key: "showed-up",
    label: "Showed Up",
    fact: "Presence at an event, confirmed by the team",
    emoji: "🙋",
    from: "#fb7185",
    to: "#e11d48",
  } as Badge,
  madeReal: {
    key: "made-real",
    label: "Made It Real",
    fact: "Founded a project a team carried to completion",
    emoji: "💡",
    from: "#818cf8",
    to: "#6d28d9",
  } as Badge,
  broughtNeighbors: {
    key: "brought-neighbors",
    label: "Brought the Neighbors",
    fact: "3 people joined through your invite",
    emoji: "🌟",
    from: "#a3e635",
    to: "#16a34a",
  } as Badge,
};

/* eslint-disable @typescript-eslint/no-explicit-any -- accepts both ssr and js clients */
export async function computeBadges(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  hood: { id: string | null; name: string | null },
): Promise<Badge[]> {
  // Six counts and reads, in one request (migration 0062). Three pages call
  // this — profile, explore, and a project page — so six became eighteen
  // across a session, each one a separate draw from the database's tail
  // latency. The rules below are unchanged: they stay here, where the
  // thresholds sit next to the words they print.
  const { data } = await supabase.rpc("badge_material", {
    p_user: userId,
    p_community: hood.id,
  });
  return badgesFrom((data ?? {}) as BadgeMaterial, userId, hood.name);
}

/** What badge_material() returns (migration 0062). */
export type BadgeMaterial = {
  confirmed?: { id: string; type: string }[];
  attested?: number;
  invited?: number;
  founding?: string[];
  completedOwn?: { id: string; memberships: { status: string }[] }[];
  ownIdeas?: number;
};

/**
 * The badge rules, applied to material already in hand. The profile page
 * gets its material inside profile_page() (migration 0069); everyone else
 * goes through computeBadges above.
 */
export function badgesFrom(
  material: BadgeMaterial,
  userId: string,
  hoodName: string | null,
): Badge[] {
  const confirmedRows = material.confirmed ?? [];
  const attestedCount = material.attested ?? 0;
  const invitedCount = material.invited ?? 0;
  const ideaCount = material.ownIdeas ?? 0;
  const badges: Badge[] = [];

  if ((material.founding ?? []).includes(userId)) {
    badges.push(DEFS.founding(hoodName ?? "your neighborhood"));
  }
  // One-time only: shared an idea at all. Never scales with volume (see
  // docs/INCENTIVES.md §2.5) — courage moment, not a posting reward.
  if (ideaCount >= 1) badges.push(DEFS.firstIdea);
  if (confirmedRows.length >= 1) badges.push(DEFS.firstHelp);
  if (confirmedRows.length >= 5) badges.push(DEFS.trustedHands);
  if (attestedCount >= 3) badges.push(DEFS.witness);
  if (confirmedRows.some((c) => c.type === "presence")) badges.push(DEFS.showedUp);
  const completedWithTeam = (material.completedOwn ?? []).some((p) =>
    p.memberships?.some((m) => m.status === "accepted"),
  );
  if (completedWithTeam) badges.push(DEFS.madeReal);
  if (invitedCount >= 3) badges.push(DEFS.broughtNeighbors);

  return badges;
}
