import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityKind } from "@/lib/communities";

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/** A community as the directory lists it: who it is, and how many are in it. */
export type DirectoryCommunity = {
  id: string;
  name: string;
  city: string | null;
  kind: CommunityKind | null;
  description: string | null;
  center_lat: number | null;
  center_lng: number | null;
  /** Rows in `community_members`, counted in Postgres. */
  members: number;
  /** Profiles that name this place as theirs — what the map pin counts. */
  residents: number;
};

/**
 * Every community, with its headcount, in one request (migration 0061).
 *
 * Two pages wanted this and neither asked for it cleanly. Explore read the
 * whole `community_members` table — every row, no filter, no limit — and
 * tallied it in a loop; People around read `neighborhoods` with
 * `select("*")`, which drags along the `boundary` column on a page that only
 * renders names. Between them they read `neighborhoods` three times in a
 * single render.
 *
 * Memoised per render, so a page that wants the list and the counts and the
 * map pins still pays for one call.
 */
export const communityDirectory = cache(
  async (supabase: Client): Promise<DirectoryCommunity[]> => {
    const { data, error } = await supabase.rpc("community_directory");
    if (error || !data) return [];
    return data as DirectoryCommunity[];
  },
);
