import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "./SiteHeader";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { navCounts, type NavCounts } from "@/lib/navCounts";

/**
 * Shared chrome for signed-in pages: a Nextdoor-style left sidebar plus
 * search top bar on desktop, the classic top header on mobile.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let counts: NavCounts | null = null;
  let isAdmin = false;
  if (user) {
    const [{ data: profileRow }, resolved] = await Promise.all([
      supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
      navCounts(supabase, user.id),
    ]);
    isAdmin = Boolean((profileRow as { is_admin?: boolean | null } | null)?.is_admin);
    counts = resolved;
  }

  return (
    <div className="min-h-screen lg:flex lg:pl-3 xl:pl-6">
      {/* First thing in the tab order: without it, reaching the feed by
          keyboard means tabbing through all eleven rail links, on every
          page load. */}
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <Sidebar counts={counts} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <TopBar />
        {/* Layout-neutral: it inherits the flex behaviour the pages
            already relied on as direct children. */}
        <div id="content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
