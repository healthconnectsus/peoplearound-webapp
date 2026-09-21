import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isWithinDays,
  isUpcomingEvent,
  isoDaysAgo,
  formatEventTime,
  timeAgo,
  type Project,
  type ProjectEvent,
} from "@/lib/projects";
import type { CardData } from "@/components/ProjectFeedCard";

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/**
 * Loads the raw material for a project feed — projects, stars, team
 * members, upcoming events, and this month's confirmed contributions — then
 * assembles each project's "beat" (the freshest human moment worth
 * surfacing). Shared by Explore (every zone) and People around (community
 * zone only) so both pages tell the same story about the same projects.
 */
type StarRow = { project_id: string; created_at: string; user_id: string };
type MemberRow = {
  project_id: string;
  created_at: string;
  profile?: { display_name: string | null } | null;
};
type ConfirmedRow = {
  project_id: string;
  confirmed_at: string;
  contributor?: { display_name: string | null } | null;
};

/** The five result sets a feed is assembled from. */
type Material = {
  projects: Project[];
  stars: StarRow[];
  members: MemberRow[];
  events: ProjectEvent[];
  confirmed: ConfirmedRow[];
};

/**
 * All five sets, in one request (migration 0060).
 *
 * They were five. Running together rather than queued, so the wall-clock
 * cost was already a single round trip — but what five bought was five draws
 * from the tail. Measured from inside the serverless function, about one
 * database read in twenty-five takes between a third of a second and two
 * seconds, and a feed is as slow as its slowest read.
 *
 * Only the fetching moved. Which beat each card shows, whether it is hot,
 * who is on the team — all of that stays in TypeScript below, where it is
 * legible and can change without a migration.
 *
 * A feed scoped to communities hands the database the community ids, and
 * it finds their projects itself (migration 0070). The page used to fetch
 * those project ids first, in a request of its own, only to send them
 * straight back.
 *
 * The old queries remain as `feedMaterialDirect`, used only if this call
 * fails. A feed that renders empty because one request failed looks, to a
 * neighbor, exactly like a neighborhood where nothing is happening — the one
 * impression this product cannot afford to give by accident.
 */
async function feedMaterial(
  supabase: Client,
  communityIds: string[] | undefined,
  since: string,
): Promise<Material> {
  const { data, error } =
    communityIds == null
      ? await supabase.rpc("feed_material", {
          p_since: since,
          p_project_ids: null,
        })
      : await supabase.rpc("feed_material_for_communities", {
          p_since: since,
          p_community_ids: communityIds,
        });
  if (!error && data) return data as Material;
  return feedMaterialDirect(supabase, communityIds, since);
}

async function feedMaterialDirect(
  supabase: Client,
  communityIds: string[] | undefined,
  since: string,
): Promise<Material> {
  let projectQuery = supabase
    .from("projects")
    .select(
      "id,owner_id,title,description,category,state,help,reach,photo_url,when_text,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name,avatar_url),neighborhood:neighborhoods(name,city)",
    )
    .neq("state", "archived")
    .order("created_at", { ascending: false })
    .limit(200);
  if (communityIds != null) {
    projectQuery = projectQuery.in("neighborhood_id", communityIds);
  }

  const { data: projectRows } = await projectQuery;
  const projects = (projectRows ?? []) as unknown as Project[];
  const ids = projects.map((p) => p.id);
  if (ids.length === 0) {
    return { projects, stars: [], members: [], events: [], confirmed: [] };
  }

  const [{ data: starRows }, { data: memberRows }, { data: eventRows }, { data: confirmedRows }] =
    await Promise.all([
      supabase
        .from("stars")
        .select("project_id,created_at,user_id")
        .in("project_id", ids),
      supabase
        .from("memberships")
        .select("project_id,status,created_at,profile:profiles(display_name)")
        .eq("status", "accepted")
        .in("project_id", ids),
      supabase
        .from("events")
        .select(
          "id,project_id,title,starts_at,place,created_at,rsvps(user_id),project:projects(title)",
        )
        .in("project_id", ids)
        .order("starts_at", { ascending: true })
        .limit(30),
      supabase
        .from("contributions")
        .select("project_id,confirmed_at,contributor:profiles(display_name)")
        .eq("status", "confirmed")
        .in("project_id", ids)
        .gte("confirmed_at", since),
    ]);

  return {
    projects,
    stars: (starRows ?? []) as StarRow[],
    members: (memberRows ?? []) as unknown as MemberRow[],
    events: (eventRows ?? []) as unknown as ProjectEvent[],
    confirmed: (confirmedRows ?? []) as unknown as ConfirmedRow[],
  };
}

export async function loadFeedCards(
  supabase: Client,
  /**
   * Which projects: omitted, every project the viewer can see; a list,
   * only the projects in those communities (projects.neighborhood_id).
   */
  communityIds?: string[],
  /** Whose star state to report on each card — the signed-in viewer. */
  viewerId?: string,
): Promise<{ cards: CardData[]; events: ProjectEvent[]; confirmedThisMonth: number }> {
  const monthAgo = isoDaysAgo(30);
  // An empty explicit scope means "no projects" — skip the round trip.
  if (communityIds != null && communityIds.length === 0) {
    return { cards: [], events: [], confirmedThisMonth: 0 };
  }

  const material = await feedMaterial(supabase, communityIds, monthAgo);
  const projects = material.projects;
  if (projects.length === 0) {
    return { cards: [], events: [], confirmedThisMonth: 0 };
  }

  const events = material.events.filter((e) => isUpcomingEvent(e.starts_at));
  const { confirmed, members, stars } = material;

  const cards: CardData[] = projects.map((p) => {
    const myStars = stars.filter((s) => s.project_id === p.id);
    const myMembers = members.filter((m) => m.project_id === p.id);
    const team = [
      p.owner?.display_name ?? "Someone",
      ...myMembers.map((m) => m.profile?.display_name ?? "A neighbor"),
    ];
    const nextEvent = events.find((e) => e.project_id === p.id);
    const hot = Boolean(
      nextEvent &&
        new Date(nextEvent.starts_at).getTime() <
          new Date(isoDaysAgo(-7)).getTime(),
    );

    let beat: string | null = null;
    const freshConfirmed = confirmed.find(
      (c) => c.project_id === p.id && isWithinDays(c.confirmed_at, 7),
    );
    const recentStars = myStars.filter((s) => isWithinDays(s.created_at, 7));
    const freshMember = myMembers.find((m) => isWithinDays(m.created_at, 7));
    if (nextEvent) {
      beat = `📅 ${nextEvent.title} · ${formatEventTime(nextEvent.starts_at)} · ${nextEvent.rsvps.length} going`;
    } else if (freshConfirmed) {
      beat = `🙌 ${freshConfirmed.contributor?.display_name ?? "A neighbor"}'s help was confirmed ${timeAgo(freshConfirmed.confirmed_at)}`;
    } else if (recentStars.length > 0) {
      beat = `⭐ ${recentStars.length} ${recentStars.length === 1 ? "neighbor" : "neighbors"} starred this this week`;
    } else if (freshMember) {
      beat = `🤝 ${freshMember.profile?.display_name ?? "A neighbor"} joined the team ${timeAgo(freshMember.created_at)}`;
    } else if (isWithinDays(p.created_at, 7)) {
      beat = `✨ Fresh — shared ${timeAgo(p.created_at)}`;
    }

    return {
      ...p,
      starCount: myStars.length,
      starred: viewerId
        ? myStars.some((x) => (x as { user_id?: string }).user_id === viewerId)
        : false,
      team,
      beat,
      hot,
    };
  });

  return { cards, events, confirmedThisMonth: confirmed.length };
}
