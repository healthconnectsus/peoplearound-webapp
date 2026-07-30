import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { setNeighborhood } from "./actions";
import { LocateButton } from "./LocateButton";

/**
 * Pick (or change) your neighborhood — the scope for everything you see.
 * Everything on Peoplearound is local; there is no global feed to fall
 * back to, so this is the one required onboarding step.
 */
export default async function NeighborhoodPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileRow }, { data: neighborhoodRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("neighborhood_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("neighborhoods").select("id,name").order("name"),
  ]);
  const currentId = profileRow?.neighborhood_id ?? null;
  const neighborhoods = neighborhoodRows ?? [];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <h1 className="text-lg font-semibold">
          {currentId ? "Your neighborhood" : "Welcome! Where are you?"}
        </h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Everything on Peoplearound is local — the projects, events, and
          neighbors you see are the ones around you. Your location is only
          used once, to find your neighborhood; it is never stored.
        </p>

        <div className="mt-6">
          <LocateButton />
        </div>

        {neighborhoods.length > 0 ? (
          <form action={setNeighborhood} className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">
              Or pick from the list
            </h2>
            <div className="flex flex-col gap-2">
              {neighborhoods.map((n) => (
                <label
                  key={n.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:border-white/10 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40"
                >
                  <input
                    type="radio"
                    name="neighborhoodId"
                    value={n.id}
                    defaultChecked={n.id === currentId}
                    required
                    className="accent-emerald-600"
                  />
                  <span className="font-medium">{n.name}</span>
                  {n.id === currentId ? (
                    <span className="text-xs text-black/40 dark:text-white/40">
                      — your current neighborhood
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-3 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {currentId ? "Save" : "This is my neighborhood"}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-black/15 p-6 text-sm text-black/60 dark:border-white/15 dark:text-white/60">
            No neighborhoods are set up yet. If you run this Peoplearound,
            add one in the database — see the notes at the top of migration
            0007.
          </p>
        )}
      </main>
    </AppShell>
  );
}
