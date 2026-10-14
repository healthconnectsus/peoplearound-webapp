import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eventWhen } from "@/lib/events";
import { flyerQr, projectShareUrl, publicProject } from "@/lib/flyer";
import { CATEGORY_META, HELP_META } from "@/lib/projects";

/**
 * /p/<code> — one project, readable by anyone.
 *
 * This is the page a flyer's QR code points at, so it assumes the reader
 * has no account, no context, and is standing on the pavement holding a
 * phone. It says what this is, where, what is coming up, what help is
 * wanted and how many are in — and gives them one thing to do.
 *
 * Counts, never names (migration 0082). Cached for a minute: a flyer in a
 * café window is scanned by many people in the same hour, and none of them
 * need a count accurate to the second.
 */

export const revalidate = 60;

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const project = await publicProject(code);
  if (!project) return { title: "Project not found", robots: { index: false } };

  const headline = project.flyer?.headline ?? project.title;
  const where = [project.community?.name, project.community?.city].filter(Boolean).join(", ");
  return {
    title: headline,
    description:
      project.flyer?.subline ||
      project.description?.slice(0, 180) ||
      `${project.title}${where ? ` — ${where}` : ""}. Neighbors are building this on Peoplearound.`,
    alternates: { canonical: `/p/${code}` },
  };
}

export default async function PublicProjectPage({ params }: Props) {
  const { code } = await params;
  const project = await publicProject(code);
  if (!project) notFound();

  const cat = CATEGORY_META[project.category as keyof typeof CATEGORY_META] ?? {
    label: project.category,
    emoji: "✨",
  };
  const help = HELP_META[project.help];
  const where = [project.community?.name, project.community?.city].filter(Boolean).join(" · ");
  const url = projectShareUrl(code);
  const qr = flyerQr(url, project.flyer?.style ?? "teal");
  const headline = project.flyer?.headline ?? project.title;
  const finished = project.state === "completed";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4 sm:py-10">
      <Link href="/" className="flex items-center gap-2 self-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
        <img src="/logo.svg" alt="Peoplearound" className="h-8 w-auto" />
      </Link>

      <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900">
        {project.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage or Unsplash, downscaled on upload */
          <img src={project.photo_url} alt="" className="h-52 w-full object-cover" />
        ) : null}

        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            <span aria-hidden>{cat.emoji} </span>
            {cat.label}
            {where ? ` · ${where}` : ""}
          </p>

          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">{headline}</h1>
          {project.flyer && project.flyer.headline !== project.title ? (
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">{project.title}</p>
          ) : null}

          {project.flyer?.subline ? (
            <p className="mt-3 text-lg font-semibold text-pa-brand dark:text-emerald-400">
              {project.flyer.subline}
            </p>
          ) : null}

          {project.flyer?.body ? (
            <p className="mt-3 text-[15px] leading-relaxed text-black/80 dark:text-white/80">
              {project.flyer.body}
            </p>
          ) : null}

          {/* With a flyer, its few sentences already say what the description
              says; the full text is one tap away rather than said twice. */}
          {project.description ? (
            project.flyer?.body ? (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-black/55 underline-offset-2 hover:underline dark:text-white/55">
                  The whole story
                </summary>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-black/75 dark:text-white/75">
                  {project.description}
                </p>
              </details>
            ) : (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-black/75 dark:text-white/75">
                {project.description}
              </p>
            )
          ) : null}

          {project.when_text ? (
            <p className="mt-3 text-sm text-black/70 dark:text-white/70">📅 {project.when_text}</p>
          ) : null}

          {project.flyer?.bullets.length ? (
            <ul className="mt-4 flex flex-col gap-1.5">
              {project.flyer.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pa-brand" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {project.events.length ? (
            <section className="mt-5 rounded-xl border border-slate-300 p-4 dark:border-slate-600">
              <h2 className="text-sm font-semibold">Coming up</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {project.events.map((e) => (
                  <li key={`${e.title}-${e.starts_at}`} className="text-sm">
                    {e.share_code ? (
                      <Link href={`/e/${e.share_code}`} className="font-medium underline underline-offset-2">
                        {e.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{e.title}</span>
                    )}
                    <span className="block text-xs text-black/55 dark:text-white/55">
                      {eventWhen(e.starts_at, e.ends_at)}
                      {e.place ? ` · ${e.place}` : ""}
                      {e.going > 0 ? ` · ${e.going} going` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {project.jobs.length ? (
            <section className="mt-4 rounded-xl border border-slate-300 p-4 dark:border-slate-600">
              <h2 className="text-sm font-semibold">Help wanted</h2>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {project.jobs.map((j) => (
                  <li key={j}>{j}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-4 text-sm text-black/55 dark:text-white/55">
            {help.emoji} {help.label}
            {" · "}
            {project.team === 1 ? "1 neighbor is" : `${project.team} neighbors are`} building this
            {project.stars > 0 ? ` · ${project.stars} starred it` : ""}
          </p>

          {finished ? (
            <p className="mt-5 rounded-lg border border-dashed border-slate-400 px-4 py-3 text-center text-sm text-black/60 dark:border-slate-500 dark:text-white/60">
              This one reached completion.{" "}
              <Link href="/" className="underline">
                See what&rsquo;s starting nearby
              </Link>
              .
            </p>
          ) : (
            <>
              {/* A plain anchor: the route decides where a signed-in or
                  signed-out visitor goes, and nothing needs prefetching. */}
              <a
                href={`/p/${code}/join`}
                className="mt-5 flex w-full items-center justify-center rounded-lg bg-pa-brand px-6 py-3 text-base font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
              >
                🙋 Count me in
              </a>
              <p className="mt-2 text-center text-xs text-black/45 dark:text-white/45">
                Takes a moment to join Peoplearound — then you&rsquo;re on the
                project with the people running it.
              </p>
            </>
          )}
        </div>
      </article>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-zinc-900">
        <div
          className="w-28 shrink-0"
          role="img"
          aria-label={`QR code linking to ${url}`}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Pass it on</p>
          <p className="mt-1 text-black/60 dark:text-white/60">
            Show this code to a neighbor, or download it for a flyer.
          </p>
          <a
            href={`/p/${code}/qr?download=1`}
            className="mt-2 inline-block text-xs underline underline-offset-2"
          >
            Download the code (SVG)
          </a>
        </div>
      </section>

      <p className="px-2 text-center text-xs leading-relaxed text-black/50 dark:text-white/50">
        On Peoplearound, neighbors start things and everyone who helps is
        credited.{" "}
        <Link href="/login" className="underline underline-offset-2">
          Find your neighborhood
        </Link>
        .
      </p>
    </main>
  );
}
