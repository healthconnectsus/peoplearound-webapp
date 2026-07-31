import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { KIND_META, communityLabel, kindMeta, type Community } from "@/lib/communities";
import { LocateButton } from "./LocateButton";
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  setPrimaryCommunity,
} from "./communityActions";

const PILL_BTN =
  "rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";
const INPUT =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-white/20";

function KindBadge({ kind }: { kind: string | null | undefined }) {
  const meta = kindMeta(kind);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileRow }, { data: communityRows }, membershipResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("neighborhood_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("neighborhoods").select("*").order("name"),
      supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id),
    ]);

  const primaryId = profileRow?.neighborhood_id ?? null;
  const communities = (communityRows ?? []) as Community[];
  // Pre-migration-0011 fallback: treat the primary neighborhood as the only
  // membership so the page still works.
  const migrationApplied = !membershipResult.error;
  const myIds = new Set(
    migrationApplied
      ? (membershipResult.data ?? []).map((m) => m.community_id)
      : primaryId
        ? [primaryId]
        : [],
  );

  const mine = communities.filter((c) => myIds.has(c.id));
  const discover = communities.filter((c) => !myIds.has(c.id));

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 lg:py-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          My communities
        </h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Your neighborhood is just the start — join the cultural, hobby, and
          interest communities you belong to. Your primary community decides
          your home feed.
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}
        {!migrationApplied ? (
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Multi-community support needs migration 0011 — run
            supabase/migrations/0011_communities_and_chats.sql in the Supabase
            SQL editor.
          </p>
        ) : null}

        {!primaryId ? (
          <div className="mt-6 rounded-2xl border border-emerald-600/20 bg-emerald-50/70 p-5 dark:border-emerald-500/25 dark:bg-emerald-950/20">
            <h2 className="font-medium">Welcome! Where are you?</h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Find your neighborhood first — your location is only used once
              and never stored.
            </p>
            <div className="mt-4">
              <LocateButton />
            </div>
          </div>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            Yours · {mine.length}
          </h2>
          {mine.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {mine.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/5 dark:bg-zinc-900"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{communityLabel(c)}</span>
                      <KindBadge kind={c.kind} />
                      {c.id === primaryId ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
                          <Star className="h-3 w-3" aria-hidden /> Primary
                        </span>
                      ) : null}
                    </span>
                    {c.description ? (
                      <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                  {c.id !== primaryId ? (
                    <span className="flex gap-2">
                      <form action={setPrimaryCommunity}>
                        <input type="hidden" name="communityId" value={c.id} />
                        <button type="submit" className={PILL_BTN}>
                          Set primary
                        </button>
                      </form>
                      <form action={leaveCommunity}>
                        <input type="hidden" name="communityId" value={c.id} />
                        <button type="submit" className={PILL_BTN}>
                          Leave
                        </button>
                      </form>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
              You haven&apos;t joined any communities yet — find yours below.
            </p>
          )}
        </section>

        {discover.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              Discover
            </h2>
            <ul className="flex flex-col gap-2">
              {discover.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/5 dark:bg-zinc-900"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{communityLabel(c)}</span>
                      <KindBadge kind={c.kind} />
                    </span>
                    {c.description ? (
                      <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                  <form action={joinCommunity}>
                    <input type="hidden" name="communityId" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      Join
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            Start a community
          </h2>
          <form
            action={createCommunity}
            className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                name="name"
                required
                maxLength={80}
                placeholder="Chess players of Manhattan"
                className={`${INPUT} flex-1`}
              />
              <select name="kind" className={`${INPUT} sm:w-44`} defaultValue="interest">
                {Object.entries(KIND_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              name="city"
              maxLength={80}
              placeholder="City (optional)"
              className={INPUT}
            />
            <input
              type="text"
              name="description"
              maxLength={300}
              placeholder="One line about who this is for (optional)"
              className={INPUT}
            />
            <button
              type="submit"
              className="self-start rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Create community
            </button>
          </form>
        </section>
      </main>
    </AppShell>
  );
}
