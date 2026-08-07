import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { askPins, myMapCenter, nearbyProjectPins } from "@/lib/mapPins";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { initials, timeAgo } from "@/lib/projects";
import { formatMinutes } from "@/lib/asks";
import { AskComposer } from "./AskComposer";
import { claimAsk, closeAsk, reopenAsk } from "./askActions";

/**
 * Small help — "a hand for 20 minutes."
 *
 * The counterpart to /offers: there, someone has something spare; here,
 * someone is briefly stuck. Not every need is an idea, and a person who
 * needs a sofa moved should not have to found a project to say so.
 *
 * Rows are `need` offers (migration 0033), so scoping, rate caps, claim
 * rules and location blunting are the board's, not this page's.
 */

type AskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  minutes: number | null;
  when_text: string | null;
  place: string | null;
  photo_url: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  asker?: { display_name: string | null } | null;
  helper?: { display_name: string | null } | null;
};

export default async function AsksPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string }>;
}) {
  const { compose } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("offers")
    .select(
      "id,user_id,title,description,minutes,when_text,place,photo_url,claimed_by,claimed_at,created_at,asker:profiles!offers_user_id_fkey(display_name),helper:profiles!offers_claimed_by_fkey(display_name)",
    )
    .eq("kind", "need")
    .order("created_at", { ascending: false })
    .limit(60);

  const asks = (rows ?? []) as unknown as AskRow[];
  const open = asks.filter((a) => !a.claimed_by);
  const covered = asks.filter((a) => a.claimed_by);

  const center = await myMapCenter(supabase, user.id);
  const spotPins = await askPins(supabase);
  const pins = spotPins.length
    ? spotPins
    : await nearbyProjectPins(supabase, user.id);

  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-16 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Small help</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Twenty minutes, a second pair of hands, someone who owns a dolly.
            Not every need is an idea.
          </p>

          {error ? (
            <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Small help needs migration 0033 — run
              supabase/migrations/0033_small_help.sql.
            </p>
          ) : null}

          <div className="mt-6">
            <AskComposer
              userId={user.id}
              startOpen={compose === "1"}
              center={center}
            />
          </div>

          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              Open · {open.length}
            </h2>
            {open.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                Nobody needs a hand right now. That, or nobody&rsquo;s asked
                yet — going first makes it normal.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {open.map((a) => {
                  const mine = a.user_id === user.id;
                  return (
                    <li
                      key={a.id}
                      className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900"
                    >
                      {a.photo_url ? (
                        <div
                          aria-hidden
                          className="h-40 w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${a.photo_url})` }}
                        />
                      ) : null}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-medium leading-snug">
                            <span className="mr-1.5" aria-hidden>
                              🙋
                            </span>
                            {a.title}
                          </h3>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                            ⏱ {formatMinutes(a.minutes)}
                          </span>
                        </div>
                        {a.description ? (
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">
                            {a.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-black/45 dark:text-white/45">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            {initials(a.asker?.display_name)}
                          </span>
                          <span>
                            {a.asker?.display_name ?? "A neighbor"} ·{" "}
                            {timeAgo(a.created_at)}
                          </span>
                          {a.when_text ? <span>🗓 {a.when_text}</span> : null}
                          {a.place ? (
                            <span title="Approximate — neighbors arrange the details">
                              📍 around {a.place}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          {mine ? (
                            <form action={closeAsk}>
                              <input type="hidden" name="askId" value={a.id} />
                              <ConfirmSubmit
                                message="Take this off the board?"
                                className="text-xs text-black/45 hover:underline dark:text-white/45"
                              >
                                Sorted, remove it
                              </ConfirmSubmit>
                            </form>
                          ) : (
                            <form action={claimAsk}>
                              <input type="hidden" name="askId" value={a.id} />
                              <button
                                type="submit"
                                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                              >
                                🤝 I&apos;ll help
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

          {covered.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Covered · {covered.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {covered.map((a) => {
                  const mine = a.user_id === user.id;
                  const helping = a.claimed_by === user.id;
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/5 dark:bg-zinc-900"
                    >
                      <span>
                        <span className="mr-1" aria-hidden>
                          🤝
                        </span>
                        <span className="font-medium">{a.title}</span>{" "}
                        <span className="text-black/45 dark:text-white/45">
                          — {helping ? "you're" : `${a.helper?.display_name ?? "a neighbor"} is`}{" "}
                          helping
                          {a.claimed_at ? ` · ${timeAgo(a.claimed_at)}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        {mine || helping ? (
                          <form action={reopenAsk}>
                            <input type="hidden" name="askId" value={a.id} />
                            <button
                              type="submit"
                              className="text-xs text-black/45 hover:underline dark:text-white/45"
                            >
                              {helping ? "I can't after all" : "Put back on the board"}
                            </button>
                          </form>
                        ) : null}
                        {mine ? (
                          <form action={closeAsk}>
                            <input type="hidden" name="askId" value={a.id} />
                            <ConfirmSubmit
                              message="Done? This removes it from the board."
                              className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                            >
                              Done
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <p className="mt-8 text-xs text-black/40 dark:text-white/40">
            Asking is not a favor you owe back. The neighborhoods that work are
            the ones where small asks are ordinary.
          </p>
        </main>
      </MapShell>
    </AppShell>
  );
}
