import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Counts about people, for admins (migration 0072).
 *
 * A *real* user is an account that is neither a seeded demo fixture nor one
 * of our own test accounts, and has signed in at least once. The raw account
 * total says little on its own: in September 2026 it was 222, of which 100
 * were demo fixtures and 117 were sign-ups that never signed in — most of
 * them an automated wave in late August — leaving 5 people.
 *
 * Both database functions refuse any caller who is not an admin, so a stray
 * call leaks nothing. Pages still ask only when the viewer is an admin, so
 * nobody else pays for the request.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/** One community's members, by kind of account. */
export type CommunityPeople = {
  real_count: number;
  /** Real members who joined in the last 30 days. */
  real_30d: number;
  demo: number;
  never_signed_in: number;
};

/** Per community id. Communities with no members are absent. */
export async function adminCommunityPeople(
  supabase: Client,
): Promise<Record<string, CommunityPeople> | null> {
  const { data, error } = await supabase.rpc("admin_community_people");
  if (error || !data) return null;
  return data as Record<string, CommunityPeople>;
}

export type UserGrowth = {
  generated_at: string;
  /** Every account, by kind. */
  accounts: {
    real: number;
    /** How many of the real ones are admin accounts. */
    real_admins: number;
    /** Confirmed an email, never signed in. */
    dormant: number;
    /** Never confirmed an email. */
    unverified: number;
    demo: number;
    test: number;
    never_signed_in_first: string | null;
    never_signed_in_last: string | null;
    never_signed_in_30d: number;
  };
  /** Real users only. Periods are calendar periods in UTC; weeks start Monday. */
  real: {
    total: number;
    first_at: string | null;
    year: number;
    month: number;
    prev_month: number;
    week: number;
    prev_week: number;
    last_30d: number;
    prev_30d: number;
    active_7d: number;
    active_30d: number;
    in_community: number;
    did_something: number;
    invited_by_neighbor: number;
    invited_by_admin: number;
  };
  /** The last twelve weeks, oldest first. */
  weeks: { week: string; real: number; never_signed_in: number }[];
  /** Communities with real members, those gaining most lately first. */
  communities: {
    id: string;
    name: string;
    city: string | null;
    kind: string | null;
    is_demo: boolean;
    real_count: number;
    real_30d: number;
  }[];
};

export async function adminUserGrowth(
  supabase: Client,
): Promise<UserGrowth | null> {
  const { data, error } = await supabase.rpc("admin_user_growth");
  if (error || !data) return null;
  return data as UserGrowth;
}
