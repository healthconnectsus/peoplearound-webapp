import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { currentProfile } from "@/lib/profile";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { MapShell } from "@/components/MapShell";
import { projectPinsFrom } from "@/lib/mapPins";
import { type Project } from "@/lib/projects";
import { PlaybookList } from "@/components/PlaybookList";
import { ProjectCard } from "@/components/ProjectFeedCard";
import { FeedTabs, readTab } from "@/components/FeedTabs";
import { loadFeedCards } from "@/lib/feed";
import { sortForTab } from "@/lib/feedSort";

export const metadata = { title: "Projects" };

async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = readTab(rawTab);

  const supabase = await createClient();
  const user = await currentUser();
  if (!user) redirect("/login");

  // One wait: your teams, the feed, and your profile (which the shell is
  // reading at the same moment — the memoised copy makes it free here).
  const [{ data: memberRows }, { cards }, own] = await Promise.all([
    // Which teams you're on — the only thing the "Mine" tab needs beyond
    // ownership, which the cards already carry.
    supabase
      .from("memberships")
      .select(
        "project_id,status,project:projects(id,title,description,category,state,created_at,owner:profiles!projects_owner_id_fkey(display_name))",
      )
      .eq("user_id", user.id)
      .eq("status", "accepted"),
    // The browsable feed. Every project RLS lets this account see — the
    // tabs are five ways of arranging that one set, not five different
    // queries.
    loadFeedCards(supabase, undefined, user.id),
    currentProfile(),
  ]);

  const joined = (
    (memberRows ?? []) as unknown as {
      project?: Project | null;
    }[]
  )
    .map((m) => m.project)
    .filter((p): p is Project => Boolean(p) && p!.state !== "archived");
  const joinedIds = new Set(joined.map((p) => p.id));

  // "Nearby" is measured from your own community's centre.
  const centre = own?.neighborhood;
  const center =
    centre?.center_lat != null && centre?.center_lng != null
      ? { lat: centre.center_lat, lng: centre.center_lng }
      : null;

  const visible = sortForTab(cards, tab, {
    userId: user.id,
    center,
    joinedIds,
  });

  // The map follows the tab, so what you see listed is what you see pinned.
  // The cards already carry their coordinates; this used to fetch the same
  // forty projects again, after everything else, to learn where they were.
  const pins = projectPinsFrom(visible.slice(0, 40));

  return (
    <>
      <MapShell pins={pins}>
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            What the people around you are building — and what you started.
          </p>

          <div className="mt-4">
            <FeedTabs active={tab} basePath="/ideas" />
          </div>

          <section id="feed" className="mt-5 scroll-mt-6">
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-400 bg-white p-10 text-center dark:border-slate-500 dark:bg-zinc-900">
                <p className="text-3xl" aria-hidden>
                  {tab === "mine" ? "💡" : "🌱"}
                </p>
                <p className="mt-3 font-medium">
                  {tab === "mine"
                    ? "You haven't started or joined anything yet"
                    : "Nothing here yet"}
                </p>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  {tab === "mine"
                    ? "Big or small — the people around you can't help with what they can't see."
                    : "Be the first to put something on the board."}
                </p>
                <Link
                  href="/projects/new"
                  className="mt-5 inline-block rounded-lg bg-pa-brand px-6 py-2.5 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
                >
                  Start something with people
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((p) => (
                  <ProjectCard key={p.id} p={p} returnTo="/ideas" />
                ))}
              </ul>
            )}
          </section>

          <PlaybookList />
        </main>
      </MapShell>
    </>
  );
}

/**
 * The frame first, the content when it's ready.
 *
 * The shell streams at the first byte with a skeleton where the body will
 * land, and the body follows when its reads answer. The page used to hold
 * the whole document until the last query came back.
 */
export default function Page(props: Parameters<typeof IdeasPage>[0]) {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <IdeasPage {...props} />
      </Suspense>
    </AppShell>
  );
}
