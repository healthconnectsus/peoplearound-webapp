import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Collective milestones — the only celebration that ranks anything is
 * ranking a *place* against its own past (UX_SPEC §6: no leaderboard of
 * individuals). "Aurora reached 10 neighbors" is a fact about a
 * neighborhood; "Aurora's top helper" would never ship.
 *
 * Derived at read time — no counters to drift, nothing to game.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

export type Milestone = { emoji: string; text: string };

const NEIGHBOR_STEPS = [10, 25, 50, 100, 250, 500];
const BUILT_STEPS = [1, 5, 10, 25, 50];

/** The most recent threshold a community has crossed, if any. */
export async function communityMilestone(
  supabase: Client,
  communityId: string,
  communityName: string,
): Promise<Milestone | null> {
  const [{ count: neighbors }, { count: completed }, { count: confirmed }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("neighborhood_id", communityId),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("neighborhood_id", communityId)
        .eq("state", "completed"),
      supabase
        .from("contributions")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
    ]);

  const n = neighbors ?? 0;
  const built = completed ?? 0;

  // Prefer the rarer, warmer milestone when several are true.
  const builtHit = [...BUILT_STEPS].reverse().find((s) => built === s);
  if (builtHit) {
    return {
      emoji: "🎉",
      text:
        builtHit === 1
          ? `${communityName} finished its first project together.`
          : `${communityName} has built ${builtHit} things together.`,
    };
  }
  const neighborHit = [...NEIGHBOR_STEPS].reverse().find((s) => n === s);
  if (neighborHit) {
    return {
      emoji: "🏘️",
      text: `${communityName} just reached ${neighborHit} neighbors.`,
    };
  }
  if ((confirmed ?? 0) > 0 && built === 0 && n < 10) return null;
  return null;
}

export type Recap = {
  year: number;
  neighbors: number;
  ideas: number;
  built: number;
  confirmed: number;
  events: number;
  offers: number;
  topCategories: { category: string; count: number }[];
};

/** A neighborhood's year, collectively. No individual is named or ranked. */
export async function communityRecap(
  supabase: Client,
  communityId: string,
  year: number,
): Promise<Recap> {
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;

  const [
    { count: neighbors },
    { data: projectRows },
    { count: confirmed },
    { count: events },
    { count: offers },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", communityId),
    supabase
      .from("projects")
      .select("id,category,state,created_at")
      .eq("neighborhood_id", communityId)
      .gte("created_at", from)
      .lt("created_at", to),
    supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("created_at", from)
      .lt("created_at", to),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", from)
      .lt("starts_at", to),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", communityId)
      .gte("created_at", from)
      .lt("created_at", to),
  ]);

  const projects = (projectRows ?? []) as {
    id: string;
    category: string;
    state: string;
  }[];
  const byCat = new Map<string, number>();
  for (const p of projects) {
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  }

  return {
    year,
    neighbors: neighbors ?? 0,
    ideas: projects.length,
    built: projects.filter((p) => p.state === "completed").length,
    confirmed: confirmed ?? 0,
    events: events ?? 0,
    offers: offers ?? 0,
    topCategories: [...byCat.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
  };
}
