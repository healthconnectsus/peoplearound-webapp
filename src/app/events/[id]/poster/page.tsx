import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { eventWhen, qrSvg, shareUrl } from "@/lib/events";
import { PrintButton } from "./PrintButton";

/**
 * /events/<id>/poster — the thing that goes on the lamppost.
 *
 * A page, not an image, because a page prints at whatever size the paper is
 * and the QR stays sharp (it is drawn as vector on the server). No app
 * chrome: the sidebar and the top bar have no business on a sheet of A4, so
 * this renders standalone, and the two buttons that are only useful on
 * screen disappear when it prints.
 *
 * Stewards only — publishing an event is their call, and this is the
 * published version made physical.
 */

export const metadata = { title: "Poster" };

type Doc = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    place: string;
    description: string | null;
    share_code: string | null;
  } | null;
  project: {
    id: string;
    title: string;
    neighborhood: { name: string; city: string | null } | null;
  } | null;
  can_steward: boolean;
};

export default async function PosterPage({
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

  const { event, project } = doc;

  // Nothing to print until it has been published: the QR would point at a
  // page that answers 404.
  if (!event.share_code) {
    return (
      <main className="mx-auto w-full max-w-xl p-6">
        <h1 className="text-2xl font-bold">Publish it first</h1>
        <p className="mt-2 text-sm text-black/65 dark:text-white/65">
          A poster needs a page for the QR code to point at. Publish the event
          and the poster appears here.
        </p>
        <Link
          href={`/events/${event.id}`}
          className="mt-4 inline-block rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink"
        >
          ← Back to the event
        </Link>
      </main>
    );
  }

  const url = shareUrl(event.share_code);
  const where = [event.place, project.neighborhood?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* Tailwind can't express @page; margins are the printer's business. */}
      <style>{"@page { margin: 12mm; }"}</style>

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
            Prints on one sheet. Fold it, tape it, hand it to someone.
          </span>
        </div>

        {/* The poster itself. Deliberately black on white: a neighborhood
            flyer is photocopied, and colour is the first thing to go. */}
        <article className="mt-4 rounded-2xl border border-slate-300 bg-white p-8 text-black shadow-sm print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none dark:border-slate-600">
          {project.neighborhood?.name ? (
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/55">
              {project.neighborhood.name}
            </p>
          ) : null}

          <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            {event.title}
          </h1>

          <p className="mt-6 text-3xl font-bold">
            {eventWhen(event.starts_at, event.ends_at)}
          </p>
          {where ? <p className="mt-2 text-2xl">{where}</p> : null}

          {event.description ? (
            <p className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-black/80">
              {event.description}
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center gap-8">
            <div
              className="w-56 shrink-0"
              role="img"
              aria-label={`QR code linking to ${url}`}
              dangerouslySetInnerHTML={{ __html: qrSvg(url) }}
            />
            <div className="min-w-56 flex-1">
              <p className="text-2xl font-semibold leading-snug">
                Scan to see the details and say you&rsquo;re coming.
              </p>
              <p className="mt-3 break-all font-mono text-lg text-black/70">
                {url.replace(/^https?:\/\//, "")}
              </p>
              <p className="mt-4 text-base text-black/60">
                Part of <strong>{project.title}</strong> on Peoplearound, where
                neighbors start things together.
              </p>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
