import { createClient } from "@/lib/supabase/server";
import { isoDaysAgo, timeAgo } from "@/lib/projects";
import { ProfileMenu } from "./ProfileMenu";
import { TopBarIcons, type Notification } from "./TopBarIcons";

/**
 * Desktop-only top bar (Nextdoor-style): centered search, notification and
 * message icons, and the profile menu. Mobile uses SiteHeader instead.
 */
export async function TopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "Neighbor";
  let neighborhood: string | null = null;
  const notifications: Notification[] = [];
  let pendingCount = 0;

  if (user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name,neighborhood:neighborhoods(name)")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileRow as unknown as {
      display_name: string | null;
      neighborhood?: { name: string } | null;
    } | null;
    name = profile?.display_name ?? user.email?.split("@")[0] ?? "Neighbor";
    neighborhood = profile?.neighborhood?.name ?? null;

    // Notifications from things happening to YOUR projects: join requests
    // (actionable, badged) and fresh stars.
    const { data: myProjects } = await supabase
      .from("projects")
      .select("id,title")
      .eq("owner_id", user.id)
      .neq("state", "archived");
    const mine = (myProjects ?? []) as { id: string; title: string }[];
    if (mine.length > 0) {
      const ids = mine.map((p) => p.id);
      const titleOf = new Map(mine.map((p) => [p.id, p.title]));
      const [{ data: pendingRows }, { data: starRows }] = await Promise.all([
        supabase
          .from("memberships")
          .select("project_id,user_id,created_at,profile:profiles(display_name)")
          .in("project_id", ids)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("stars")
          .select("project_id,created_at")
          .in("project_id", ids)
          .gte("created_at", isoDaysAgo(14)),
      ]);

      for (const row of (pendingRows ?? []) as unknown as {
        project_id: string;
        user_id: string;
        created_at: string;
        profile?: { display_name: string | null } | null;
      }[]) {
        notifications.push({
          key: `join-${row.project_id}-${row.user_id}`,
          emoji: "🤝",
          text: `${row.profile?.display_name ?? "A neighbor"} asked to join “${titleOf.get(row.project_id) ?? "your project"}” · ${timeAgo(row.created_at)}`,
          href: `/projects/${row.project_id}`,
        });
      }
      pendingCount = notifications.length;

      const starsByProject = new Map<string, number>();
      for (const s of starRows ?? []) {
        starsByProject.set(
          s.project_id,
          (starsByProject.get(s.project_id) ?? 0) + 1,
        );
      }
      for (const [projectId, count] of starsByProject) {
        notifications.push({
          key: `stars-${projectId}`,
          emoji: "⭐",
          text: `${count} ${count === 1 ? "neighbor" : "neighbors"} starred “${titleOf.get(projectId) ?? "your project"}” recently`,
          href: `/projects/${projectId}`,
        });
      }
    }
  }

  return (
    <div className="hidden items-center pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_44%] xl:grid-cols-[minmax(0,1fr)_46%]">
      {/* The search column mirrors the home feed column so the input's left
          edge lines up with the page title beneath it. */}
      <div className="mx-auto w-full max-w-2xl px-4 lg:px-8">
        <form action="/">
          <label className="relative block max-w-xl">
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
              aria-hidden
            >
              🔍
            </span>
            <input
              type="search"
              name="q"
              placeholder="Search projects around you"
              className="w-full rounded-full border border-black/10 bg-white py-2 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-black/40 focus:border-emerald-600 dark:border-white/15 dark:bg-zinc-900 dark:placeholder:text-white/40"
            />
          </label>
        </form>
      </div>
      <div className="flex items-center justify-end gap-2 px-6">
        <TopBarIcons notifications={notifications} badge={pendingCount} />
        <ProfileMenu name={name} neighborhood={neighborhood} />
      </div>
    </div>
  );
}
