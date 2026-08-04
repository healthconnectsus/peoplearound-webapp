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
  const [confirmed, attested, invited, foundingRows, completedOwn] =
    await Promise.all([
      supabase
        .from("contributions")
        .select("id,type")
        .eq("contributor_id", userId)
        .eq("status", "confirmed"),
      supabase
        .from("attestations")
        .select("id", { count: "exact", head: true })
        .eq("attester_id", userId),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("invited_by", userId),
      hood.id
        ? supabase
            .from("community_members")
            .select("user_id")
            .eq("community_id", hood.id)
            .order("created_at", { ascending: true })
            .limit(10)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
      supabase
        .from("projects")
        .select("id,memberships(user_id,status)")
        .eq("owner_id", userId)
        .eq("state", "completed"),
    ]);

  const confirmedRows = (confirmed.data ?? []) as { id: string; type: string }[];
  const badges: Badge[] = [];

  if ((foundingRows.data ?? []).some((m) => m.user_id === userId)) {
    badges.push(DEFS.founding(hood.name ?? "your neighborhood"));
  }
  if (confirmedRows.length >= 1) badges.push(DEFS.firstHelp);
  if (confirmedRows.length >= 5) badges.push(DEFS.trustedHands);
  if ((attested.count ?? 0) >= 3) badges.push(DEFS.witness);
  if (confirmedRows.some((c) => c.type === "presence")) badges.push(DEFS.showedUp);
  const completedWithTeam = (
    (completedOwn.data ?? []) as unknown as {
      id: string;
      memberships: { status: string }[];
    }[]
  ).some((p) => p.memberships?.some((m) => m.status === "accepted"));
  if (completedWithTeam) badges.push(DEFS.madeReal);
  if ((invited.count ?? 0) >= 3) badges.push(DEFS.broughtNeighbors);

  return badges;
}
