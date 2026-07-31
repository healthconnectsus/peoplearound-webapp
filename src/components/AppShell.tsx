import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "./SiteHeader";
import { Sidebar, type CommunityInfo } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Shared chrome for signed-in pages: a Nextdoor-style left sidebar plus
 * search top bar on desktop, the classic top header on mobile.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let community: CommunityInfo | null = null;
  if (user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("neighborhood_id,neighborhood:neighborhoods(name,city)")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileRow as unknown as {
      neighborhood_id: string | null;
      neighborhood?: { name: string; city: string | null } | null;
    } | null;

    if (profile?.neighborhood_id && profile.neighborhood) {
      const [{ count: mine }, { count: total }, membershipResult] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .eq("neighborhood_id", profile.neighborhood_id)
            .neq("state", "archived"),
          supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("neighborhood_id", profile.neighborhood_id)
            .neq("state", "archived"),
          supabase
            .from("community_members")
            .select("community_id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);
      community = {
        label: profile.neighborhood.city
          ? `${profile.neighborhood.name} (${profile.neighborhood.city})`
          : profile.neighborhood.name,
        mine: mine ?? 0,
        total: total ?? 0,
        // null before migration 0011 (community_members doesn't exist yet)
        communities: membershipResult.error
          ? null
          : (membershipResult.count ?? 0),
      };
    }
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar community={community} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <TopBar />
        {children}
      </div>
    </div>
  );
}
