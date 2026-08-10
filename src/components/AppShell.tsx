import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "./SiteHeader";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { navCounts, type NavCounts } from "@/lib/navCounts";

/**
 * Shared chrome for signed-in pages: a Nextdoor-style left sidebar plus
 * search top bar on desktop, the classic top header on mobile.
 */
export async function AppShell({
  children,
  focus = false,
}: {
  children: React.ReactNode;
  /** Focus mode: veil the sidebar (except the logo) so the content owns the page. */
  focus?: boolean;
}) {
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
    <div className="min-h-screen lg:flex">
      <Sidebar counts={counts} dimmed={focus} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <TopBar />
        {children}
      </div>
    </div>
  );
}
