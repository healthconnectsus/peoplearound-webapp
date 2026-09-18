import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { NavCounts } from "@/lib/navCounts";

/** Everything the page frame shows about you, as `shell_state()` returns it. */
export type ShellState = {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    created_at: string;
    neighborhood_id: string | null;
    neighborhood: {
      name: string;
      city: string | null;
      center_lat: number | null;
      center_lng: number | null;
    } | null;
  } | null;
  counts: NavCounts;
  notifications: {
    id: string;
    kind: string;
    body: string;
    href: string;
    read_at: string | null;
    created_at: string;
  }[];
  unread: number;
  /** Your saved point, if you've set one. */
  location: { lat: number; lng: number } | null;
  /** Every community you belong to, primary included. */
  communities: {
    id: string;
    name: string;
    city: string | null;
    center_lat: number | null;
    center_lng: number | null;
  }[];
};

/**
 * The page frame's data — profile, rail counts, inbox, map centre, your
 * communities — in one request instead of twelve.
 *
 * Why the count matters more than the speed of any one of them: measured from
 * inside the serverless function, a read to the database API normally takes
 * about 30ms, but roughly one in twenty-five takes between 300ms and two
 * seconds. The database host is small and swaps. A page is as slow as its
 * slowest read, so a frame built from twelve reads met a slow one on a third
 * of all page views. Built from one, it rarely does. (Migration 0057 has the
 * SQL and the same reasoning from the database's side.)
 *
 * Memoised per render with React's `cache`, so the sidebar, the top bar, the
 * map and any page that asks all share the single call. Returns null if the
 * call fails for any reason — every consumer keeps its own direct query as a
 * fallback, so a missing migration degrades to yesterday's behaviour rather
 * than to an empty frame.
 */
export const shellState = cache(async (): Promise<ShellState | null> => {
  const user = await currentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shell_state");
  if (error || !data) return null;
  return data as ShellState;
});
