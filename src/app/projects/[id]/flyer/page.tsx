import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { eventWhen } from "@/lib/events";
import { CATEGORY_META } from "@/lib/projects";
import { flyerQr, projectShareUrl } from "@/lib/flyer";
import { draftFlyerCopy } from "@/lib/flyer-copy";
import {
  FLYER_STYLE_KEYS,
  defaultFlyerStyle,
  type FlyerStyleKey,
} from "@/lib/flyer-styles";
import { FlyerStudio } from "./FlyerStudio";
import type { StudioDoc } from "./flyerActions";

/**
 * /projects/<id>/flyer — the flyer studio.
 *
 * One sheet of A4 with a QR code on it, for the lamppost, the café window
 * and the group chat. The assistant writes the words from what the project
 * already says; the steward corrects them, picks a look, publishes the page
 * the code opens, and prints.
 *
 * No app chrome: the sidebar has no business on a sheet of paper, and this
 * page prints. Everything but the flyer itself disappears when it does.
 *
 * Stewards only. flyer_page() (migration 0082) answers null to anyone else.
 */

export const metadata: Metadata = { title: "Flyer" };

type Query = {
  error?: string;
  written?: string;
  saved?: string;
  published?: string;
  unpublished?: string;
};

export default async function FlyerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("flyer_page", { p_id: id });
  const doc = data as StudioDoc | null;
  // Not a steward, or no such project: the same answer either way.
  if (!doc?.project) notFound();

  const p = doc.project;
  const cat = CATEGORY_META[p.category as keyof typeof CATEGORY_META] ?? {
    label: p.category,
    emoji: "✨",
  };
  const url = p.share_code ? projectShareUrl(p.share_code) : null;
  // The code in every look, drawn once here; the studio switches between
  // them in the browser without a round trip.
  const qr = url
    ? (Object.fromEntries(
        FLYER_STYLE_KEYS.map((k) => [k, flyerQr(url, k)]),
      ) as Record<FlyerStyleKey, string>)
    : null;

  const first = doc.events[0];
  const nextUp = first
    ? {
        title: first.title,
        when: eventWhen(first.starts_at, first.ends_at),
        place: first.place,
      }
    : null;

  const copy =
    doc.flyer ??
    draftFlyerCopy({
      title: p.title,
      description: p.description,
      help: p.help,
      jobs: doc.jobs,
    });
  const style = doc.flyer?.style ?? defaultFlyerStyle(p.category);
  const eyebrow =
    [p.neighborhood?.name, p.neighborhood?.city].filter(Boolean).join(" · ") ||
    "Peoplearound";

  const notice: { tone: "ok" | "error"; text: string } | null = q.error
    ? { tone: "error", text: q.error }
    : q.written === "1"
      ? { tone: "ok", text: "The assistant wrote a draft. Change anything — it's yours." }
      : q.written === "plain"
        ? {
            tone: "ok",
            text: "No assistant is configured, so this draft is the project's own words. Edit away.",
          }
        : q.saved
          ? { tone: "ok", text: "Saved." }
          : q.published
            ? {
                tone: "ok",
                text: "Published. The code on the flyer now opens your project's page.",
              }
            : q.unpublished
              ? { tone: "ok", text: "Unpublished. Anything printed with the old code no longer works." }
              : null;

  return (
    <>
      {/* Tailwind can't express @page. A margin, because few printers reach
          the edge of the sheet; the flyer is sized to fit inside it. */}
      <style>{`@page { size: A4 portrait; margin: 8mm; }
@media print {
  html, body { background: #fff !important; }
  .flyer-sheet { width: 194mm !important; max-width: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
}`}</style>

      <div className="mx-auto w-full max-w-6xl p-4 sm:p-8 print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <Link
              href={`/projects/${p.id}`}
              className="text-sm text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
            >
              ← Back to the project
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              A flyer for {p.title}
            </h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              One sheet, a code that opens your project&rsquo;s page, and
              words the assistant drafts from what you already wrote.
            </p>
          </div>
        </div>

        {notice ? (
          <p
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm print:hidden ${
              notice.tone === "error"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                : "border-emerald-600/30 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-200"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        <FlyerStudio
          key={doc.flyer?.updated_at ?? "draft"}
          projectId={p.id}
          hasFlyer={Boolean(doc.flyer)}
          model={doc.flyer?.model ?? null}
          initialCopy={copy}
          initialStyle={style}
          hint={doc.flyer?.hint ?? ""}
          url={url}
          shareCode={p.share_code}
          qr={qr}
          sheet={{
            eyebrow,
            kind: `${cat.emoji} ${cat.label}`,
            nextUp,
            team: doc.team,
            photoUrl: p.photo_url,
          }}
        />
      </div>
    </>
  );
}
