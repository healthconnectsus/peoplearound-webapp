import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "./SiteHeader";
import { Sidebar } from "./Sidebar";
import { TopBar, TopBarFallback } from "./TopBar";
import { AdminCityPicker } from "./AdminCityPicker";
import { navCounts } from "@/lib/navCounts";
import { currentProfile } from "@/lib/profile";
import { shellState } from "@/lib/shell";

/**
 * Shared chrome for signed-in pages: a Nextdoor-style left sidebar plus
 * search top bar on desktop, the classic top header on mobile.
 *
 * The frame renders at once and knows nothing about you. The parts that do —
 * the numbers beside the rail, your name and notifications in the top bar,
 * the admin picker — each sit behind their own Suspense boundary and stream
 * in when their reads answer. This used to be one async component that
 * awaited the profile and six counts before returning a single tag, which
 * held the whole document, page content included, behind the slowest of
 * them. Now the first byte carries the frame and a skeleton, the browser
 * starts on styles and scripts, and the personal parts fill in behind.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex lg:pl-3 xl:pl-6">
      {/* First thing in the tab order: without it, reaching the feed by
          keyboard means tabbing through all eleven rail links, on every
          page load. */}
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      {/* The fallback is the same rail without its numbers, so the swap
          when they arrive moves nothing. */}
      <Suspense fallback={<Sidebar />}>
        <SidebarWithCounts />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<SiteHeader />}>
          <SiteHeaderWithPicker />
        </Suspense>
        <Suspense fallback={<TopBarFallback />}>
          <TopBar />
        </Suspense>
        {/* Layout-neutral: it inherits the flex behaviour the pages
            already relied on as direct children. */}
        <div id="content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

async function SidebarWithCounts() {
  // One read for the whole frame; the six separate counts below are what is
  // left for the day that read fails.
  const shell = await shellState();
  if (shell?.profile) {
    return <Sidebar counts={shell.counts} isAdmin={shell.profile.is_admin} />;
  }

  const profile = await currentProfile();
  if (!profile) return <Sidebar />;
  const supabase = await createClient();
  const counts = await navCounts(supabase, profile.id, profile.neighborhood_id);
  return <Sidebar counts={counts} isAdmin={profile.is_admin} />;
}

async function SiteHeaderWithPicker() {
  const profile = await currentProfile();
  return (
    <SiteHeader
      cityPicker={
        profile?.is_admin ? <AdminCityPicker id="admin-city-mobile" /> : undefined
      }
    />
  );
}
