import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "./SiteHeader";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import {
  Personal,
  PersonalFallback,
  personalState,
  TopBar,
  TopBarFallback,
} from "./TopBar";
import { navCounts } from "@/lib/navCounts";
import { currentProfile } from "@/lib/profile";
import { shellState } from "@/lib/shell";

/**
 * Shared chrome for signed-in pages: a left rail plus search bar on desktop,
 * a quiet header plus bottom bar on phones.
 *
 * The frame renders at once and knows nothing about you. The parts that do —
 * the numbers beside the rail, your notifications and avatar — sit behind
 * their own Suspense boundaries and stream in when their reads answer, so
 * the first byte carries the frame and a skeleton and the browser starts on
 * styles and scripts while the personal parts fill in behind.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex lg:pl-3 xl:pl-6">
      {/* First thing in the tab order: without it, reaching the content by
          keyboard means tabbing through the whole rail on every page load. */}
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      {/* The fallback is the same rail without its numbers, so the swap
          when they arrive moves nothing. */}
      <Suspense fallback={<Sidebar />}>
        <SidebarWithCounts />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<SiteHeader personal={<PersonalFallback />} />}>
          <MobileHeader />
        </Suspense>
        <Suspense fallback={<TopBarFallback />}>
          <TopBar />
        </Suspense>
        {/* Room at the bottom on phones for the bar that sits over the page. */}
        <div
          id="content"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0"
        >
          {children}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

async function SidebarWithCounts() {
  // One read for the whole frame; the separate counts are what is left for
  // the day that read fails.
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

async function MobileHeader() {
  // The same read the desktop bar makes; memoised, so this costs nothing.
  const state = await personalState();
  return (
    <SiteHeader
      personal={state ? <Personal state={state} /> : <PersonalFallback />}
    />
  );
}
