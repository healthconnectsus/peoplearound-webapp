import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eventWhen, publicEvent } from "@/lib/events";
import { categoryMeta, isUpcomingEvent, googleCalendarUrl } from "@/lib/projects";
import { SITE_URL } from "@/lib/site";

/**
 * /e/<code> — one event, readable by anyone.
 *
 * This is the page a QR code on a lamppost points at, so it assumes the
 * reader has no account, no context, and is standing outside holding a
 * phone. It answers what, when, where and who in that order, and gives them
 * one thing to do.
 *
 * Cached for a minute: a poster at a farmers' market is scanned by many
 * people in the same few minutes, and none of them need a count accurate to
 * the second. Nothing here is personal, so one cached copy serves everybody.
 */

export const revalidate = 60;

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const event = await publicEvent(code);
  if (!event) return { title: "Event not found", robots: { index: false } };

  const where = [event.place, event.community?.name].filter(Boolean).join(" · ");
  return {
    title: `${event.title} — ${eventWhen(event.starts_at, event.ends_at)}`,
    description:
      event.description?.slice(0, 180) ??
      `${eventWhen(event.starts_at, event.ends_at)}${where ? ` · ${where}` : ""}. Part of ${event.project.title} on Peoplearound.`,
    alternates: { canonical: `/e/${code}` },
  };
}

export default async function PublicEventPage({ params }: Props) {
  const { code } = await params;
  const event = await publicEvent(code);
  if (!event) notFound();

  const upcoming = isUpcomingEvent(event.starts_at);
  const meta = categoryMeta(event.project.category);
  const where = [event.place, event.community?.name, event.community?.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4 sm:py-10">
      <Link href="/" className="flex items-center gap-2 self-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
        <img src="/logo.svg" alt="Peoplearound" className="h-8 w-auto" />
      </Link>

      <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900">
        {event.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage, downscaled on upload */
          <img
            src={event.photo_url}
            alt={event.place ? `Photo of ${event.place}` : ""}
            className="h-52 w-full object-cover"
          />
        ) : null}

        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            <span aria-hidden>{meta.emoji} </span>
            {event.project.title}
            {event.community?.name ? ` · ${event.community.name}` : ""}
          </p>

          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">
            {event.title}
          </h1>

          <p className="mt-3 text-lg font-semibold text-pa-brand dark:text-emerald-400">
            {eventWhen(event.starts_at, event.ends_at)}
          </p>
          {where ? (
            <p className="mt-1 text-sm text-black/70 dark:text-white/70">
              📍 {where}
            </p>
          ) : null}

          {event.description ? (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-black/75 dark:text-white/75">
              {event.description}
            </p>
          ) : null}

          <p className="mt-4 text-sm text-black/55 dark:text-white/55">
            🙋 {event.going} {event.going === 1 ? "neighbor is" : "neighbors are"}{" "}
            coming
          </p>

          {upcoming ? (
            <>
              {/* A form, not a link: links get prefetched, and an "I'm in"
                  that fires because the button scrolled into view would sign
                  people up for reading a flyer. */}
              <form method="post" action={`/e/${code}/join`} className="mt-5">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-lg bg-pa-brand px-6 py-3 text-base font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
                >
                  🙋 I&rsquo;m in
                </button>
              </form>
              <p className="mt-2 text-center text-xs text-black/45 dark:text-white/45">
                Takes a moment to join Peoplearound — then you&rsquo;re on the
                list and the organizer knows to expect you.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                <a
                  href={googleCalendarUrl(
                    { title: event.title, starts_at: event.starts_at, place: event.place },
                    event.project.title,
                    `${SITE_URL}/e/${code}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
                >
                  Add to Google Calendar
                </a>
                <a
                  href={`/e/${code}/ics`}
                  className="text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
                >
                  Add to any calendar (.ics)
                </a>
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-slate-400 px-4 py-3 text-center text-sm text-black/60 dark:border-slate-500 dark:text-white/60">
              This one has already happened.{" "}
              <Link href="/" className="underline">
                See what&rsquo;s next nearby
              </Link>
              .
            </p>
          )}
        </div>
      </article>

      <p className="px-2 text-center text-xs leading-relaxed text-black/50 dark:text-white/50">
        Part of <strong>{event.project.title}</strong> on Peoplearound, where
        neighbors start things and everyone who helps is credited.{" "}
        <Link href="/login" className="underline underline-offset-2">
          Find your neighborhood
        </Link>
        .
      </p>
    </main>
  );
}
