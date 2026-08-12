import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/projects";
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
  let avatarUrl: string | null = null;
  const notifications: Notification[] = [];
  let pendingCount = 0;

  if (user) {
    // select("*") so this keeps working before migration 0010 adds avatar_url
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name)")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileRow as unknown as {
      display_name: string | null;
      avatar_url?: string | null;
      neighborhood?: { name: string } | null;
    } | null;
    name = profile?.display_name ?? user.email?.split("@")[0] ?? "Neighbor";
    neighborhood = profile?.neighborhood?.name ?? null;
    avatarUrl = profile?.avatar_url ?? null;

    // The persistent inbox (migration 0025): triggers fan out join
    // requests, stars, contributions, confirmations, and events into
    // `notifications`; the bell just reads it.
    const [{ data: notifRows }, { count: unread }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id,kind,body,href,read_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    for (const r of (notifRows ?? []) as {
      id: string;
      kind: string;
      body: string;
      href: string;
      read_at: string | null;
      created_at: string;
    }[]) {
      notifications.push({
        key: r.id,
        kind: r.kind,
        text: `${r.body} · ${timeAgo(r.created_at)}`,
        href: r.href,
        unread: r.read_at == null,
      });
    }
    pendingCount = unread ?? 0;
  }

  return (
    <div className="hidden items-center pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_50%] xl:grid-cols-[minmax(0,1fr)_53%]">
      {/* The search column mirrors the home feed column (both left-aligned)
          so the input's left edge lines up with the content beneath it. */}
      <div className="w-full max-w-3xl px-4 lg:pl-36 lg:pr-8">
        {/* Explore is the only page that reads ?q= — since the root route
            became a redirect (peoplearound.com now opens on People around),
            submitting to "/" would drop the query on the way through. */}
        <form action="/explore">
          <label className="relative block max-w-xl">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 dark:text-white/40"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="Search people, events, offers, projects around you"
              className="w-full rounded-full border border-slate-400 bg-white py-2 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-black/40 focus:border-emerald-600 dark:border-slate-500 dark:bg-zinc-900 dark:placeholder:text-white/40"
            />
          </label>
        </form>
      </div>
      <div className="flex items-center justify-end gap-2 px-6">
        <TopBarIcons notifications={notifications} badge={pendingCount} />
        <ProfileMenu
          name={name}
          neighborhood={neighborhood}
          avatarUrl={avatarUrl}
        />
      </div>
    </div>
  );
}
