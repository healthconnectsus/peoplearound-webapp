import Link from "next/link";
import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";
import {
  categoryMeta,
  googleCalendarUrl,
  initials,
  isUpcomingEvent,
} from "@/lib/projects";
import { eventWhen, qrSvg, shareUrl } from "@/lib/events";
import { SITE_URL } from "@/lib/site";
import { deleteEvent } from "@/app/projects/actions";
import {
  setEventSharing,
  toggleEventRsvp,
  updateEventDetails,
} from "../actions";

/**
 * /events/<id> — one event, for the people in it.
 *
 * Everything about running an event that used to have nowhere to live: the
 * full details, who is coming, and for whoever stewards the project, the
 * controls to correct it, publish it to the open web, and print it.
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ joined?: string; error?: string; message?: string }>;
};

type EventDoc = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    place: string;
    description: string | null;
    photo_url: string | null;
    share_code: string | null;
    project_id: string;
  } | null;
  project: {
    id: string;
    title: string;
    category: string;
    state: string;
    owner_id: string;
    neighborhood: { name: string; city: string | null } | null;
  } | null;
  can_steward: boolean;
  going: {
    user_id: string;
    created_at: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  mine: boolean;
};

/** One read for the page and its title (migration 0075). */
const loadEvent = cache(async (id: string): Promise<EventDoc | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("event_page", { p_id: id });
  if (error || !data) return null;
  const doc = data as EventDoc;
  return doc.event ? doc : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await loadEvent(id);
  return { title: doc?.event ? doc.event.title : "Event" };
}

/** The form a steward uses to fix what changed. */
function EditForm({ event }: { event: NonNullable<EventDoc["event"]> }) {
  const INPUT =
    "w-full rounded-lg border border-slate-400 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-slate-400";
  const local = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

  return (
    <details className="mt-3 rounded-xl border border-slate-300 p-4 dark:border-slate-600">
      <summary className="cursor-pointer text-sm font-medium">
        Edit the details
      </summary>
      <form action={updateEventDetails} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="eventId" value={event.id} />
        <label className="flex flex-col gap-1 text-xs text-black/60 dark:text-white/60">
          What is it
          <input
            required
            name="title"
            defaultValue={event.title}
            maxLength={140}
            className={INPUT}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-black/60 dark:text-white/60">
            Starts
            <input
              required
              type="datetime-local"
              name="startsAt"
              defaultValue={local(event.starts_at)}
              className={INPUT}
            />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-black/60 dark:text-white/60">
            Ends (optional)
            <input
              type="datetime-local"
              name="endsAt"
              defaultValue={local(event.ends_at)}
              className={INPUT}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs text-black/60 dark:text-white/60">
          Where
          <input
            name="place"
            defaultValue={event.place}
            maxLength={200}
            placeholder="The corner of 5th and Oak"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-black/60 dark:text-white/60">
          What to expect — and what to bring
          <textarea
            name="description"
            defaultValue={event.description ?? ""}
            maxLength={2000}
            rows={4}
            placeholder="Two hours of weeding and planting. Gloves and spades are provided; bring a hat."
            className={INPUT}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
          >
            Save changes
          </SubmitButton>
          <span className="text-xs text-black/45 dark:text-white/45">
            Everyone coming sees the change; the poster keeps working.
          </span>
        </div>
      </form>
    </details>
  );
}

/** Publish to the open web, and the things you print once it is published. */
function ShareCard({
  event,
  title,
}: {
  event: NonNullable<EventDoc["event"]>;
  title: string;
}) {
  if (!event.share_code) {
    return (
      <section className="mt-4 rounded-2xl border border-slate-300 p-5 dark:border-slate-600">
        <h2 className="font-medium">Put it on a poster</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Publishing gives this event a page anyone can open without an
          account, and a QR code to print. The page shows what, when, where and
          how many are coming — never who.
        </p>
        <form action={setEventSharing} className="mt-3">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="on" value="1" />
          <SubmitButton
            pendingLabel="Publishing…"
            className="rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
          >
            Publish &amp; get a QR code
          </SubmitButton>
        </form>
      </section>
    );
  }

  const url = shareUrl(event.share_code);

  return (
    <section className="mt-4 rounded-2xl border border-emerald-600/30 bg-emerald-50/40 p-5 dark:border-emerald-500/25 dark:bg-emerald-950/20">
      <h2 className="font-medium">Published — anyone with this link can read it</h2>

      <div className="mt-3 flex flex-wrap items-start gap-5">
        <div className="min-w-56 flex-1">
          <p className="break-all rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-zinc-900">
            {url}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CopyButton
              text={url}
              label="Copy link"
              className="rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
            />
            <Link
              href={`/events/${event.id}/poster`}
              className="rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
            >
              Printable poster →
            </Link>
            <a
              href={`/e/${event.share_code}/qr?download=1`}
              className="rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
            >
              Download QR
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
            >
              See what they see
            </a>
          </div>
          <p className="mt-3 text-xs text-black/50 dark:text-white/50">
            Share it in a group chat and it unfurls with the name, the time and
            the place. On paper, the QR goes to the same page.
          </p>
        </div>

        {/* The QR itself, drawn on the server — no script, prints sharp. */}
        <div className="w-32 shrink-0">
          <div
            className="rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600"
            role="img"
            aria-label={`QR code linking to ${url}`}
            dangerouslySetInnerHTML={{ __html: qrSvg(url) }}
          />
          <p className="mt-1 text-center text-[11px] text-black/45 dark:text-white/45">
            {event.share_code}
          </p>
        </div>
      </div>

      <form action={setEventSharing} className="mt-4">
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="on" value="0" />
        <ConfirmSubmit
          message={`Stop sharing “${title}”? Anything already printed stops working, and publishing again gives a different code.`}
          className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
        >
          Stop sharing
        </ConfirmSubmit>
      </form>
    </section>
  );
}

async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { joined, error, message } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");

  const doc = await loadEvent(id);
  if (!doc?.event || !doc.project) notFound();
  const { event, project, going, mine, can_steward: isSteward } = doc;

  const upcoming = isUpcomingEvent(event.starts_at);
  const meta = categoryMeta(project.category);
  const where = [event.place, project.neighborhood?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
      <Link
        href={`/projects/${project.id}`}
        className="text-sm text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
      >
        ← {meta.emoji} {project.title}
      </Link>

      {error ? (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message || joined ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {joined ? "You're on the list — see you there." : message}
        </p>
      ) : null}

      <article className="mt-3">
        {event.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage, downscaled on upload */
          <img
            src={event.photo_url}
            alt={event.place ? `Photo of ${event.place}` : ""}
            className="mb-4 h-48 w-full rounded-2xl object-cover"
          />
        ) : null}

        <h1 className="text-3xl font-extrabold tracking-tight">{event.title}</h1>
        <p className="mt-2 text-lg font-semibold text-pa-brand dark:text-emerald-400">
          {eventWhen(event.starts_at, event.ends_at)}
        </p>
        {where ? (
          <p className="mt-1 text-sm text-black/70 dark:text-white/70">
            📍 {where}
          </p>
        ) : null}
        {!upcoming ? (
          <p className="mt-1 text-sm text-black/45 dark:text-white/45">
            This one has happened.
          </p>
        ) : null}

        {event.description ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-black/75 dark:text-white/75">
            {event.description}
          </p>
        ) : null}

        {upcoming ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={toggleEventRsvp}>
              <input type="hidden" name="eventId" value={event.id} />
              <button
                type="submit"
                className={`rounded-lg border px-5 py-2 text-sm font-medium transition-colors ${
                  mine
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-400 hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                }`}
              >
                {mine ? "✓ You're in — tap to change plans" : "🙋 I'm in"}
              </button>
            </form>
            <a
              href={googleCalendarUrl(
                event,
                project.title,
                `${SITE_URL}/events/${event.id}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
            >
              Google Calendar
            </a>
            <a
              href={`/api/event-ics?id=${event.id}`}
              className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
            >
              .ics
            </a>
          </div>
        ) : null}
      </article>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
          Coming · {going.length}
        </h2>
        {going.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-slate-400 p-6 text-center text-sm text-black/55 dark:border-slate-500 dark:text-white/55">
            Nobody yet. {isSteward ? "Share it — a poster or a group chat is usually all it takes." : "Be the first."}
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {going.map((p) => (
              <li
                key={p.user_id}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm dark:border-slate-600 dark:bg-zinc-900"
              >
                {p.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL */
                  <img
                    src={p.avatar_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                  >
                    {initials(p.display_name ?? "Neighbor")}
                  </span>
                )}
                {p.display_name ?? "A neighbor"}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isSteward ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Yours to run
          </h2>
          <ShareCard event={event} title={event.title} />
          <EditForm event={event} />
          <form action={deleteEvent} className="mt-3">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="eventId" value={event.id} />
            <ConfirmSubmit
              message="Remove this event? Everyone coming loses it from their list."
              className="text-xs text-black/40 underline underline-offset-2 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
            >
              Remove this event
            </ConfirmSubmit>
          </form>
        </section>
      ) : null}
    </main>
  );
}

export default function Page(props: Props) {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <EventPage {...props} />
      </Suspense>
    </AppShell>
  );
}
