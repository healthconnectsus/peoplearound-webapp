import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Peoplearound",
  description:
    "What Peoplearound stores, what it never stores, and how to take your data or delete it.",
};

/**
 * The privacy page (FEATURE_IDEAS Tier 3 §19).
 *
 * Written to be read, not to be survived: short sentences, no defined terms,
 * and specific about the choices the product actually made. Several of the
 * "we don't" lines are enforced in the schema rather than by policy, and
 * where that's true it says so — a promise the database keeps is worth more
 * than one a lawyer writes.
 *
 * Public: reachable signed out, because the people deciding whether to join
 * are the ones who most need it.
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed text-black/70 dark:text-white/70">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:py-16">
      <Link
        href="/"
        className="text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Peoplearound
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Privacy</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/60 dark:text-white/60">
        Peoplearound exists to get neighbors doing things together. That only
        works if it&rsquo;s a safe place to be known. Here is exactly what it
        stores and what it refuses to.
      </p>

      <Section title="What it stores">
        <p>
          Your email address and display name. The neighborhood or community
          you chose. Anything you write: projects, updates, offers, asks,
          messages, and the photos you attach.
        </p>
        <p>
          The record of what you did together — stars, join requests,
          contributions, the neighbors who confirmed them, and event
          attendance you declared yourself.
        </p>
      </Section>

      <Section title="What it never stores">
        <p>
          <strong>Your home address.</strong> It is never asked for and there
          is no field for it. When you use &ldquo;locate me&rdquo;, the
          coordinates are used to find your neighborhood; the position saved
          against your account is rounded to about a kilometre first, and only
          you can read it.
        </p>
        <p>
          <strong>A precise pickup spot.</strong> Pins on offers and small-help
          asks are rounded to roughly 110 metres before they are saved, so one
          can show a street but never a doorway. A pin you choose to drop on a
          project is stored as you placed it — it marks where the thing is
          happening, so place it on the park, not on your door.
        </p>
        <p>
          <strong>Any record of who viewed what.</strong> Project views are
          counted for the project&rsquo;s owner and deduplicated per day; the
          raw rows are unreadable to everyone, including the owner, by
          database policy. There is no &ldquo;who viewed your profile&rdquo;
          anywhere and there will not be one.
        </p>
        <p>
          <strong>No-show data.</strong> Saying &ldquo;I&rsquo;m in&rdquo; to
          an event is a signal, not a promise, and nothing anywhere records
          whether you turned up.
        </p>
        <p>
          <strong>Payment details.</strong> There is no money in the product —
          no marketplace, no ads, no sponsors buying your attention.
        </p>
      </Section>

      <Section title="Who can see what you post">
        <p>
          Every project declares its reach: your neighborhood only, your city,
          or anywhere. This is enforced in the database, not just in the
          interface — a project set to &ldquo;neighborhood&rdquo; cannot be
          read by someone outside it even if they know its address.
        </p>
        <p>
          Private messages are readable only by their participants. Your
          impact score and your project analytics are yours alone; there is no
          leaderboard and no comparison between neighbors.
        </p>
      </Section>

      <Section title="Taking your data, or ending it">
        <p>
          You can{" "}
          <a
            href="/api/export-my-data"
            className="font-medium text-pa-green underline underline-offset-2"
          >
            download everything you&rsquo;ve written
          </a>{" "}
          as a single JSON file, at any time, without asking anyone.
        </p>
        <p>
          You can delete your account from{" "}
          <Link href="/profile" className="underline underline-offset-2">
            your profile
          </Link>
          . Deletion is immediate and cascades: your projects, posts, stars,
          messages and photos go with it. It cannot be undone, and there is no
          grace period in which we quietly keep a copy.
        </p>
      </Section>

      <Section title="Who else touches it">
        <p>
          The database and file storage are hosted on Supabase; the site runs
          on Vercel; the weekly digest is sent through Resend; map tiles come
          from Mapbox and OpenStreetMap. Cover-photo suggestions come from
          Unsplash. Idea shaping, if you use it, sends the text you typed to
          an AI provider to structure it.
        </p>
        <p>
          None of them are sent your data to use for their own purposes, and
          nothing here is sold or shared with advertisers.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, or something here that doesn&rsquo;t match what you see:{" "}
          <a
            href="mailto:hello@peoplearound.com"
            className="underline underline-offset-2"
          >
            hello@peoplearound.com
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 border-t border-slate-300 pt-4 text-xs text-black/40 dark:border-slate-600 dark:text-white/40">
        This page describes how the product actually behaves today. If it ever
        stops being accurate, the page is the bug.
      </p>
    </main>
  );
}
