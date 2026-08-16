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
export async function loadFeedCards(
  supabase: Client,
  projectIds?: string[],
): Promise<{ cards: CardData[]; events: ProjectEvent[]; confirmedThisMonth: number }> {
  const monthAgo = isoDaysAgo(30);
  const scoped = projectIds != null;
  // An empty explicit scope means "no projects" — skip the round trips.
  if (scoped && projectIds.length === 0) {
    return { cards: [], events: [], confirmedThisMonth: 0 };
  }

  let projectQuery = supabase
    .from("projects")
    .select(
      "id,owner_id,title,description,category,state,help,reach,photo_url,when_text,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name),neighborhood:neighborhoods(name,city)",
    )
    .neq("state", "archived")
    .order("created_at", { ascending: false });
  if (scoped) projectQuery = projectQuery.in("id", projectIds);

  const { data: projectRows } = await projectQuery;
  const projects = (projectRows ?? []) as unknown as Project[];
  const ids = projects.map((p) => p.id);

  if (ids.length === 0) {
    return { cards: [], events: [], confirmedThisMonth: 0 };
  }

  const [{ data: starRows }, { data: memberRows }, { data: eventRows }, { data: confirmedRows }] =
    await Promise.all([
      supabase.from("stars").select("project_id,created_at").in("project_id", ids),
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
        .gte("confirmed_at", monthAgo),
    ]);

  const events = ((eventRows ?? []) as unknown as ProjectEvent[]).filter((e) =>
    isUpcomingEvent(e.starts_at),
  );
  const confirmed = (confirmedRows ?? []) as unknown as {
    project_id: string;
    confirmed_at: string;
    contributor?: { display_name: string | null } | null;
  }[];
  type MemberRow = {
    project_id: string;
    created_at: string;
    profile?: { display_name: string | null } | null;
  };
  const members = (memberRows ?? []) as unknown as MemberRow[];
  const stars = starRows ?? [];

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

    return { ...p, starCount: myStars.length, team, beat, hot };
  });

  return { cards, events, confirmedThisMonth: confirmed.length };
}
