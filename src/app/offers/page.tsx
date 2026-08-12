import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { myMapCenter, nearbyProjectPins, offerPins } from "@/lib/mapPins";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { initials, timeAgo } from "@/lib/projects";
import { OfferComposer } from "./OfferComposer";
import { claimOffer, deleteOffer, releaseOffer } from "./offerActions";

/**
 * Give / lend / offer — the non-monetary board (PRD §3.8). No prices, no
 * checkout: an offer is claimed by a neighbor, and the two of them sort it
 * out like people. Scoped to your communities by RLS.
 */

const KIND_META: Record<string, { emoji: string; label: string; badge: string }> = {
  give: {
    emoji: "🎁",
    label: "Give away",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  lend: {
    emoji: "🔁",
    label: "Lend",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  },
  offer: {
    emoji: "🙌",
    label: "Skill",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  },
};

type OfferRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  description: string;
  photo_url: string | null;
  place: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  poster?: { display_name: string | null } | null;
  claimer?: { display_name: string | null } | null;
};

export default async function OffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("offers")
    .select(
      "id,user_id,kind,title,description,photo_url,place,claimed_by,claimed_at,created_at,poster:profiles!offers_user_id_fkey(display_name),claimer:profiles!offers_claimed_by_fkey(display_name)",
    )
    // Small help ("need") lives on its own board at /asks — same table,
    // opposite direction.
    .neq("kind", "need")
    .order("created_at", { ascending: false })
    .limit(60);

  const offers = (rows ?? []) as unknown as OfferRow[];
  const available = offers.filter((o) => !o.claimed_by);
  const taken = offers.filter((o) => o.claimed_by);

  // Offers with a rough spot pin themselves; otherwise fall back to the
  // neighborhood's projects so the map still gives context.
  const center = await myMapCenter(supabase, user.id);
  const spotPins = await offerPins(supabase);
  const pins = spotPins.length
    ? spotPins
    : await nearbyProjectPins(supabase, user.id);
  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Offers</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Things neighbors will give, lend, or do for each other. Nothing here
            costs money. Need a hand instead?{" "}
            <Link href="/asks" className="underline">
              Ask for small help
            </Link>
            .
          </p>

          {error ? (
            <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Offers need migration 0027 — run
              supabase/migrations/0027_offers.sql.
            </p>
          ) : null}

          <div className="mt-6">
            <OfferComposer userId={user.id} center={center} />
          </div>

          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              Available · {available.length}
            </h2>
            {available.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                Nothing on the board yet — post the first thing.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {available.map((o) => {
                  const meta = KIND_META[o.kind] ?? KIND_META.give;
                  const mine = o.user_id === user.id;
                  return (
                    <li
                      key={o.id}
                      className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900"
                    >
                      {o.photo_url ? (
                        <div
                          aria-hidden
                          className="h-40 w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${o.photo_url})` }}
                        />
                      ) : null}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-medium leading-snug">
                            <span className="mr-1.5" aria-hidden>
                              {meta.emoji}
                            </span>
                            {o.title}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        {o.description ? (
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">
                            {o.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-black/45 dark:text-white/45">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            {initials(o.poster?.display_name)}
                          </span>
                          <span>
                            {o.poster?.display_name ?? "A neighbor"} ·{" "}
                            {timeAgo(o.created_at)}
                          </span>
                          {o.place ? (
                            <span title="Approximate — neighbors arrange the details">
                              📍 around {o.place}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          {mine ? (
                            <form action={deleteOffer}>
                              <input type="hidden" name="offerId" value={o.id} />
                              <ConfirmSubmit
                                message="Take this off the board?"
                                className="text-xs text-black/45 hover:underline dark:text-white/45"
                              >
                                Remove
                              </ConfirmSubmit>
                            </form>
                          ) : (
                            <form action={claimOffer}>
                              <input type="hidden" name="offerId" value={o.id} />
                              <button
                                type="submit"
                                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                              >
                                🙋 I&apos;d like this
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {taken.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Claimed · {taken.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {taken.map((o) => {
                  const meta = KIND_META[o.kind] ?? KIND_META.give;
                  const mine = o.user_id === user.id;
                  return (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm opacity-75 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
                    >
                      <span>
                        <span className="mr-1" aria-hidden>
                          {meta.emoji}
                        </span>
                        <span className="font-medium">{o.title}</span>{" "}
                        <span className="text-black/45 dark:text-white/45">
                          → {o.claimer?.display_name ?? "a neighbor"}
                          {o.claimed_at ? ` · ${timeAgo(o.claimed_at)}` : ""}
                        </span>
                      </span>
                      {mine ? (
                        <form action={releaseOffer}>
                          <input type="hidden" name="offerId" value={o.id} />
                          <button
                            type="submit"
                            className="text-xs text-black/45 hover:underline dark:text-white/45"
                          >
                            Put back on the board
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </main>
      </MapShell>
    </AppShell>
  );
}
