import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";

/** What the chrome knows about the signed-in person: name, face, place, standing. */
export type CurrentProfile = {
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
};

type Row = Omit<CurrentProfile, "is_admin" | "neighborhood"> & {
  is_admin: boolean | null;
  neighborhood:
    | CurrentProfile["neighborhood"]
    | NonNullable<CurrentProfile["neighborhood"]>[]
    | null;
};

/**
 * Your profile row, read once per request however many parts of the page
 * want it.
 *
 * The sidebar wanted `is_admin`, the top bar wanted your name and avatar, the
 * nav counts wanted your neighborhood, and the map wanted that neighborhood's
 * centre — four separate reads of the same row, one after another, on every
 * page. This is the one read. It is memoised for the lifetime of a render and
 * no longer, so it is always your own row and always this request's.
 *
 * Pages that need more than these columns still read what they need; this is
 * only the part every page needs.
 */
export const currentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const user = await currentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select(
        "id,display_name,avatar_url,is_admin,created_at,neighborhood_id,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name,city,center_lat,center_lng)",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return null;

    const row = data as unknown as Row;
    // PostgREST returns a to-one embed as an object, but the types cannot
    // know that; accept either shape.
    const hood = Array.isArray(row.neighborhood)
      ? (row.neighborhood[0] ?? null)
      : (row.neighborhood ?? null);
    return { ...row, is_admin: Boolean(row.is_admin), neighborhood: hood };
  },
);
