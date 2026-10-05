import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { eventWhen } from "@/lib/events";
import { PrintButton } from "../poster/PrintButton";

/**
 * /events/<id>/sheet — the run sheet, on paper.
 *
 * On the day, an organizer is holding a clipboard, not a phone: hands are
 * full, the signal is bad, and someone needs to know who is on the grill.
 * This prints the two lists that matter — the jobs with the names against
 * them, and everyone expected, with a box to tick.
 *
 * Deliberately not interactive. Ticking the boxes here is a pen, and that is
 * the point; the in-app run sheet on the event page is for recording it
 * afterwards, if the organizer wants to.
 *
 * Stewards only, like the attendance it is made from.
 */

export const metadata = { title: "Run sheet" };

type Doc = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    place: string;
    description: string | null;
  } | null;
  project: {
    title: string;
    neighborhood: { name: string; city: string | null } | null;
  } | null;
  can_steward: boolean;
  going: { user_id: string; display_name: string | null }[];
  roles: {
    id: string;
    title: string;
    detail: string | null;
    needed: number;
    takers: { user_id: string; display_name: string | null }[];
  }[];
  attended: string[];
};

export default async function RunSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("event_page", { p_id: id });
  const doc = data as Doc | null;
  if (!doc?.event || !doc.project || !doc.can_steward) notFound();

  const { event, project, going, roles, attended } = doc;
  const takenBy = new Map<string, string[]>();
  for (const r of roles ?? []) {
    for (const t of r.takers) {
      takenBy.set(t.user_id, [...(takenBy.get(t.user_id) ?? []), r.title]);
    }
  }
  const people = [
    ...going.map((p) => ({
      id: p.user_id,
      name: p.display_name ?? "A neighbor",
    })),
    ...[...takenBy.keys()]
      .filter((uid) => !going.some((p) => p.user_id === uid))
      .map((uid) => ({
        id: uid,
        name:
          (roles ?? [])
            .flatMap((r) => r.takers)
            .find((t) => t.user_id === uid)?.display_name ?? "A neighbor",
      })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <style>{"@page { margin: 14mm; }"}</style>

      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8 print:p-0">
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link
            href={`/events/${event.id}`}
            className="text-sm text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
          >
            ← Back to the event
          </Link>
          <PrintButton className="rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover" />
          <span className="text-xs text-black/45 dark:text-white/45">
            For the clipboard. Tick people off with a pen.
          </span>
        </div>

        <article className="mt-4 rounded-2xl border border-slate-300 bg-white p-8 text-black shadow-sm print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none dark:border-slate-600">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {event.title}
          </h1>
          <p className="mt-1 text-lg font-semibold">
            {eventWhen(event.starts_at, event.ends_at)}
          </p>
          <p className="text-base text-black/70">
            {[event.place, project.neighborhood?.name].filter(Boolean).join(" · ")}
            {" · "}
            {project.title}
          </p>

          {(roles ?? []).length > 0 ? (
            <section className="mt-7">
              <h2 className="border-b border-black/20 pb-1 text-sm font-bold uppercase tracking-wide">
                Jobs
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {roles.map((r) => (
                  <li key={r.id} className="text-base">
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-black/60">
                      {" "}
                      — {r.takers.length} of {r.needed}
                    </span>
                    {r.detail ? (
                      <span className="block text-sm text-black/60">
                        {r.detail}
                      </span>
                    ) : null}
                    <span className="block text-sm">
                      {r.takers.length > 0
                        ? r.takers
                            .map((t) => t.display_name ?? "A neighbor")
                            .join(", ")
                        : "— nobody yet —"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-7">
            <h2 className="border-b border-black/20 pb-1 text-sm font-bold uppercase tracking-wide">
              Expected · {people.length}
            </h2>
            {people.length === 0 ? (
              <p className="mt-2 text-base text-black/60">
                Nobody has said they&rsquo;re coming yet.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {people.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 border-b border-black/10 py-2"
                  >
                    {/* A box to tick with a pen; already-recorded arrivals
                        come pre-ticked so a half-finished list prints as it
                        stands. */}
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-black/50 text-sm font-bold">
                      {attended?.includes(p.id) ? "✓" : ""}
                    </span>
                    <span className="text-base">{p.name}</span>
                    {takenBy.get(p.id) ? (
                      <span className="text-sm text-black/60">
                        {takenBy.get(p.id)!.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="mt-8 text-xs text-black/50">
            Who turned up is the organizer&rsquo;s own note. Help itself is
            logged by the person who did it and confirmed by a neighbor — this
            sheet credits nobody.
          </p>
        </article>
      </div>
    </>
  );
}
