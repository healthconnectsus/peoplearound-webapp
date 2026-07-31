import { createClient } from "@/lib/supabase/server";
import { ProfileMenu } from "./ProfileMenu";

/**
 * Desktop-only top bar (Nextdoor-style): centered search plus the profile
 * menu. Mobile uses SiteHeader instead.
 */
export async function TopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "Neighbor";
  let neighborhood: string | null = null;
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
      <div className="flex justify-end px-6">
        <ProfileMenu name={name} neighborhood={neighborhood} />
      </div>
    </div>
  );
}
