import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/**
 * The numbers beside the sidebar rails.
 *
 * Every count is about *you* — what you starred, joined, posted, helped
 * with — not how big the place is. A rail that shows "412 people around"
 * is a vanity metric; one that shows what you're actually part of is a
 * to-do list you can act on.
 *
 * Zero is rendered as nothing rather than "0": an empty rail should read as
 * an invitation, not a failure. RLS scopes every query to your communities,
 * so no count can leak the size of somewhere you don't belong.
 */
export type NavCounts = {
  faves: number;
  events: number;
  offers: number;
  people: number;
  ideas: number;
};

export async function navCounts(
  supabase: Client,
  userId: string,
): Promise<NavCounts> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("neighborhood_id")
    .eq("id", userId)
    .maybeSingle();
  const primaryId = (profile?.neighborhood_id as string | null) ?? null;

  const [starRes, rsvpRes, offerRes, peopleRes, ownRes, joinedRes] =
    await Promise.all([
    // Local Faves lists starred, non-archived projects — count the distinct
    // projects that have a star, which is what the page will show you.
    supabase.from("stars").select("project_id"),
    // Events you said "I'm in" to. There is no creator column on events —
    // they belong to the project, not a person (migration 0006).
    supabase
      .from("rsvps")
      .select("event_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("kind", "need"),
    primaryId
      ? supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("neighborhood_id", primaryId)
          .neq("id", userId)
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .neq("state", "archived"),
    supabase
      .from("memberships")
      .select("project_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "accepted"),
  ]);

  const starred = new Set(
    ((starRes.data ?? []) as { project_id: string }[]).map((s) => s.project_id),
  );

  return {
    faves: starred.size,
    events: rsvpRes.count ?? 0,
    offers: offerRes.count ?? 0,
    people: peopleRes.count ?? 0,
    ideas: (ownRes.count ?? 0) + (joinedRes.count ?? 0),
  };
}
