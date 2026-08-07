import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Small help — shared bits between the board, the feed strip and the map.
 * The data itself lives on `offers` with kind `need` (migration 0033).
 */

/** "20 min" · "1 hour" · "Half a day" — never "240 minutes". */
export function formatMinutes(minutes: number | null | undefined): string {
  const m = minutes ?? 30;
  if (m < 60) return `${m} min`;
  if (m === 60) return "1 hour";
  if (m < 240) return `${Math.round(m / 60)} hours`;
  return "Half a day";
}

export type Ask = {
  id: string;
  title: string;
  minutes: number | null;
  place: string | null;
  when_text: string | null;
  asker: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/** Open asks in your communities — RLS does the scoping. */
export async function openAsks(supabase: Client, limit = 4): Promise<Ask[]> {
  const { data } = await supabase
    .from("offers")
    .select(
      "id,title,minutes,place,when_text,asker:profiles!offers_user_id_fkey(display_name)",
    )
    .eq("kind", "need")
    .is("claimed_by", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as {
    id: string;
    title: string;
    minutes: number | null;
    place: string | null;
    when_text: string | null;
    asker?: { display_name: string | null } | null;
  }[]).map((a) => ({
    id: a.id,
    title: a.title,
    minutes: a.minutes,
    place: a.place,
    when_text: a.when_text,
    asker: a.asker?.display_name ?? null,
  }));
}
