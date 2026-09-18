import { Search } from "lucide-react";
import Link from "next/link";
import { AdminCityPicker } from "./AdminCityPicker";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/projects";
import { ProfileMenu } from "./ProfileMenu";
import { TopBarIcons, type Notification } from "./TopBarIcons";
import { currentUser } from "@/lib/auth";
import { currentProfile } from "@/lib/profile";
import { shellState } from "@/lib/shell";

/**
 * Desktop-only top bar (Nextdoor-style): centered search, notification and
 * message icons, and the profile menu. Mobile uses SiteHeader instead.
 *
 * Split in two so the frame can be on screen before anyone knows who you
 * are. `TopBarFrame` is the bar itself — search, the fixed links — and takes
 * the personal cluster on the right as a slot. `TopBar` fills that slot from
 * your profile and inbox; `TopBarFallback` fills it with the same shapes and
 * nothing in them, and is what the app shell shows while the reads are out.
 * Same heights, same positions, so nothing moves when the real one lands.
 */
export async function TopBar() {
  const profile = await currentProfile();
  if (!profile) return <TopBarFallback />;

  const user = await currentUser();
  const name =
    profile.display_name ?? user?.email?.split("@")[0] ?? "Neighbor";

  // The persistent inbox (migration 0025): triggers fan out join
  // requests, stars, contributions, confirmations, and events into
  // `notifications`; the bell just reads it.
  //
  // It arrives with the rest of the frame (lib/shell.ts). The two queries
  // below are only the fallback for when that read fails.
  const shell = await shellState();
  const { notifRows, unread } = shell
    ? { notifRows: shell.notifications, unread: shell.unread }
    : await inboxDirect(profile.id);
  const notifications: Notification[] = (
    (notifRows ?? []) as {
      id: string;
      kind: string;
      body: string;
      href: string;
      read_at: string | null;
      created_at: string;
    }[]
  ).map((r) => ({
    key: r.id,
    kind: r.kind,
    text: `${r.body} · ${timeAgo(r.created_at)}`,
    href: r.href,
    unread: r.read_at == null,
  }));

  return (
    <TopBarFrame>
      {profile.is_admin && <AdminCityPicker />}
      <Link href="/clans" className="text-xs underline">
        My clan
      </Link>
      <TopBarIcons notifications={notifications} badge={unread ?? 0} />
      <ProfileMenu
        name={name}
        neighborhood={profile.neighborhood?.name ?? null}
        avatarUrl={profile.avatar_url}
      />
    </TopBarFrame>
  );
}

async function inboxDirect(userId: string) {
  const supabase = await createClient();
  const [{ data: notifRows }, { count: unread }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,kind,body,href,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  return { notifRows, unread };
}

/** The bar with nobody in it yet: same icons, a blank face where yours will be. */
export function TopBarFallback() {
  return (
    <TopBarFrame>
      <Link href="/clans" className="text-xs underline">
        My clan
      </Link>
      <TopBarIcons notifications={[]} badge={0} />
      <span
        aria-hidden
        className="h-9 w-9 rounded-full bg-black/10 dark:bg-white/10"
      />
    </TopBarFrame>
  );
}

function TopBarFrame({ children }: { children: React.ReactNode }) {
  // Columns mirror MapShell's split so the search bar sits over the content
  // column, not under the map.
  return (
    <div className="hidden items-center pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_40%] xl:grid-cols-[minmax(0,1fr)_42%]">
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
              className="w-full rounded-lg border border-slate-400 bg-white py-2 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-black/40 focus:border-emerald-600 dark:border-slate-500 dark:bg-zinc-900 dark:placeholder:text-white/40"
            />
          </label>
        </form>
      </div>
      <div className="flex items-center justify-end gap-2 px-6">{children}</div>
    </div>
  );
}
