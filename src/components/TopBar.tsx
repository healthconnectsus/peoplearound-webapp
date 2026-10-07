import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/projects";
import { ProfileMenu } from "./ProfileMenu";
import { TopBarIcons, type Notification } from "./TopBarIcons";
import { currentUser } from "@/lib/auth";
import { currentProfile } from "@/lib/profile";
import { shellState } from "@/lib/shell";

/**
 * Desktop-only top bar: search on the left, and on the right the two things
 * that are about you — your notifications and your face. Nothing else. The
 * admin city picker that used to sit here lives on /admin, which is where an
 * admin is when they want it; the "My clan" link lives under the avatar.
 *
 * Split in two so the frame can be on screen before anyone knows who you
 * are: `TopBarFrame` is the bar itself, `TopBar` fills the personal slot,
 * and `TopBarFallback` fills it with the same shapes and nothing in them.
 */

/** Who you are and what is new — one read, shared by both bars. */
export async function personalState() {
  const profile = await currentProfile();
  if (!profile) return null;
  const user = await currentUser();
  const name =
    profile.display_name ?? user?.email?.split("@")[0] ?? "Neighbor";

  // The inbox arrives with the rest of the frame (lib/shell.ts); the direct
  // queries are only the fallback for when that read fails.
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

  return { profile, name, notifications, unread: unread ?? 0 };
}

/** Notifications and your avatar — the same cluster on both bars. */
export function Personal({
  state,
}: {
  state: NonNullable<Awaited<ReturnType<typeof personalState>>>;
}) {
  return (
    <>
      <TopBarIcons notifications={state.notifications} badge={state.unread} />
      <ProfileMenu
        name={state.name}
        neighborhood={state.profile.neighborhood?.name ?? null}
        avatarUrl={state.profile.avatar_url}
      />
    </>
  );
}

/** The cluster with nobody in it yet: same icons, a blank face. */
export function PersonalFallback() {
  return (
    <>
      <TopBarIcons notifications={[]} badge={0} />
      <span
        aria-hidden
        className="h-9 w-9 rounded-full bg-black/10 dark:bg-white/10"
      />
    </>
  );
}

export async function TopBar() {
  const state = await personalState();
  if (!state) return <TopBarFallback />;
  return (
    <TopBarFrame>
      <Personal state={state} />
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

export function TopBarFallback() {
  return (
    <TopBarFrame>
      <PersonalFallback />
    </TopBarFrame>
  );
}

function TopBarFrame({ children }: { children: React.ReactNode }) {
  // Columns mirror MapShell's split so the search bar sits over the content
  // column, not under the map.
  return (
    <div className="hidden items-center pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_36%] xl:grid-cols-[minmax(0,1fr)_38%]">
      <div className="w-full max-w-3xl px-4 lg:pl-36 lg:pr-8">
        {/* Explore is the only page that reads ?q=. */}
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
              placeholder="Search Peoplearound"
              className="w-full rounded-full border border-slate-300 bg-white py-2 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-black/40 focus:border-pa-brand dark:border-slate-600 dark:bg-zinc-900 dark:placeholder:text-white/40"
            />
          </label>
        </form>
      </div>
      <div className="flex items-center justify-end gap-1 px-6">{children}</div>
    </div>
  );
}
