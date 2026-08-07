import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapPin } from "@/components/NeighborhoodMap";
import { categoryMeta, STATE_META, type ProjectState } from "@/lib/projects";

/**
 * Shared pin builders for the map that rides alongside every "around me"
 * page. RLS already limits what these queries can see, so a pin can only
 * ever be something the viewer is allowed to know about.
 *
 * Pins deliberately favour the LOCAL cluster: a global project pinned in
 * another country would zoom the map out to a continent and show nothing
 * (see docs/SCALING.md and the feed's own pin logic).
 */

type ProjectPinRow = {
  id: string;
  title: string;
  category: string;
  state: ProjectState;
  lat: number | null;
  lng: number | null;
  neighborhood_id?: string | null;
};

function toPins(rows: ProjectPinRow[]): MapPin[] {
  return rows
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      title: p.title,
      emoji: categoryMeta(p.category).emoji,
      href: `/projects/${p.id}`,
      lat: p.lat!,
      lng: p.lng!,
      subtitle: STATE_META[p.state]?.label ?? "",
    }));
}

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/** The communities this user belongs to (primary always included). */
async function myCommunityIds(supabase: Client, userId: string) {
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("neighborhood_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", userId),
  ]);
  const ids = new Set<string>();
  if (profile?.neighborhood_id) ids.add(profile.neighborhood_id as string);
  for (const m of memberships ?? []) ids.add(m.community_id as string);
  return [...ids];
}

/** Located projects in the viewer's own communities — the default context. */
export async function nearbyProjectPins(
  supabase: Client,
  userId: string,
): Promise<MapPin[]> {
  const ids = await myCommunityIds(supabase, userId);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("projects")
    .select("id,title,category,state,lat,lng,neighborhood_id")
    .in("neighborhood_id", ids)
    .neq("state", "archived")
    .not("lat", "is", null)
    .limit(200);
  return toPins((data ?? []) as ProjectPinRow[]);
}

/** Only the projects in a given id list (e.g. your faves, or event hosts). */
export async function projectPinsByIds(
  supabase: Client,
  ids: string[],
): Promise<MapPin[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("projects")
    .select("id,title,category,state,lat,lng")
    .in("id", ids.slice(0, 200))
    .not("lat", "is", null);
  return toPins((data ?? []) as ProjectPinRow[]);
}

/** Communities themselves, pinned at their centres. */
export async function communityPins(supabase: Client): Promise<MapPin[]> {
  const { data } = await supabase
    .from("neighborhoods")
    .select("id,name,city,kind,center_lat,center_lng")
    .not("center_lat", "is", null)
    .limit(200);
  return ((data ?? []) as {
    id: string;
    name: string;
    city: string | null;
    kind: string | null;
    center_lat: number;
    center_lng: number;
  }[]).map((c) => ({
    id: c.id,
    title: c.name,
    emoji: c.kind === "neighborhood" || !c.kind ? "🏘️" : "👥",
    href: "/neighborhood",
    lat: c.center_lat,
    lng: c.center_lng,
    subtitle: c.city ?? "",
  }));
}

/** Offers with an approximate pickup spot (rounded to ~110 m on write). */
export async function offerPins(supabase: Client): Promise<MapPin[]> {
  const { data } = await supabase
    .from("offers")
    .select("id,kind,title,place,lat,lng,claimed_by")
    .not("lat", "is", null)
    .is("claimed_by", null)
    .limit(200);
  const emoji: Record<string, string> = {
    give: "🎁",
    lend: "🔁",
    offer: "🙌",
  };
  return ((data ?? []) as {
    id: string;
    kind: string;
    title: string;
    place: string | null;
    lat: number;
    lng: number;
  }[]).map((o) => ({
    id: o.id,
    title: o.title,
    emoji: emoji[o.kind] ?? "🎁",
    href: "/offers",
    lat: o.lat,
    lng: o.lng,
    subtitle: o.place ? `Around ${o.place}` : "Roughly here",
  }));
}

/**
 * Groups = communities that aren't a plain neighborhood (hobby, cultural,
 * interest…), pinned at their centre.
 */
export async function groupPins(supabase: Client): Promise<MapPin[]> {
  const { data } = await supabase
    .from("neighborhoods")
    .select("id,name,city,kind,center_lat,center_lng")
    .not("center_lat", "is", null)
    .neq("kind", "neighborhood")
    .limit(200);
  return ((data ?? []) as {
    id: string;
    name: string;
    city: string | null;
    kind: string;
    center_lat: number;
    center_lng: number;
  }[]).map((c) => ({
    id: c.id,
    title: c.name,
    emoji: "👥",
    href: "/neighborhood",
    lat: c.center_lat,
    lng: c.center_lng,
    subtitle: [c.kind, c.city].filter(Boolean).join(" · "),
  }));
}

/**
 * People, aggregated by community — never individually.
 *
 * A neighbor's home is not ours to publish, so this pins the COMMUNITY
 * centre with a headcount ("Aurora · 34 neighbors"). You learn where people
 * are without learning where anyone lives.
 */
export async function peopleClusterPins(supabase: Client): Promise<MapPin[]> {
  const [{ data: hoods }, { data: members }] = await Promise.all([
    supabase
      .from("neighborhoods")
      .select("id,name,center_lat,center_lng")
      .not("center_lat", "is", null)
      .limit(200),
    supabase.from("profiles").select("neighborhood_id"),
  ]);
  const counts = new Map<string, number>();
  for (const m of (members ?? []) as { neighborhood_id: string | null }[]) {
    if (m.neighborhood_id) {
      counts.set(m.neighborhood_id, (counts.get(m.neighborhood_id) ?? 0) + 1);
    }
  }
  return ((hoods ?? []) as {
    id: string;
    name: string;
    center_lat: number;
    center_lng: number;
  }[])
    .map((h) => {
      const n = counts.get(h.id) ?? 0;
      return {
        id: h.id,
        title: h.name,
        emoji: "🧑‍🤝‍🧑",
        href: "/people",
        lat: h.center_lat,
        lng: h.center_lng,
        subtitle: `${n} neighbor${n === 1 ? "" : "s"}`,
      };
    })
    .filter((p) => !p.subtitle.startsWith("0 "));
}
