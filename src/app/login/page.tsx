import Link from "next/link";
import {
  CalendarDays,
  HeartHandshake,
  Lightbulb,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta, STATE_META, timeAgo } from "@/lib/projects";
import { versionLabel, BUILD_TIME } from "@/lib/version";
import { signIn, signUp, signInWithMagicLink } from "./actions";
import { AutoLocate } from "./AutoLocate";

const INPUT =
  "rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-slate-400 dark:bg-zinc-800";

type PublicIdea = {
  id: string;
  title: string;
  category: string | null;
  state: keyof typeof STATE_META;
  created_at: string;
  star_count: number;
};

// Shown until migration 0012 (public_ideas view) is applied.
const SAMPLE_IDEAS: PublicIdea[] = [
  { id: "s1", title: "Turn the empty lot on Oak Street into a community garden", category: "community", state: "active", created_at: "", star_count: 41 },
  { id: "s2", title: "Weekly chess nights at the library", category: "social", state: "idea", created_at: "", star_count: 17 },
  { id: "s3", title: "Fix up the playground by the river", category: "community", state: "active", created_at: "", star_count: 28 },
  { id: "s4", title: "Neighborhood tool-sharing shelf", category: "community", state: "idea", created_at: "", star_count: 12 },
  { id: "s5", title: "Food drive for weekend volunteers", category: "community", state: "active", created_at: "", star_count: 22 },
  { id: "s6", title: "Lemonade stand fundraiser for the school trip", category: "social", state: "idea", created_at: "", star_count: 9 },
];

// Each idea card gets a photo by cropping a different tile out of the hero
// collage — deterministic by list position, so no extra image assets needed.
const PHOTO_CROPS = [
  "6% 8%", "30% 14%", "56% 6%", "84% 12%",
  "10% 42%", "38% 48%", "64% 40%", "90% 46%",
  "8% 80%", "34% 86%", "62% 78%", "88% 84%",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  // Cloudflare Turnstile (bot protection on sign-up/sign-in). Renders only
  // when the site key is configured; Supabase verifies the token server-side.
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Live teaser of what's being built (anon-readable view, migration 0012).
  const supabase = await createClient();
  const { data: ideaRows, error: ideasError } = await supabase
    .from("public_ideas")
    .select("*")
    .limit(9);
  const ideas: PublicIdea[] =
    ideasError || !ideaRows?.length
      ? SAMPLE_IDEAS
      : (ideaRows as PublicIdea[]);

  return (
    <div className="flex min-h-screen flex-col">
      {turnstileKey ? (
        <script
          src="https://challenges.cloudflare.com/turnstile/api.js"
          async
          defer
        />
      ) : null}
      {/* Full-bleed hero: the collage runs edge to edge and behind the nav */}
      <section
        className="relative bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-collage.jpg)" }}
      >
        {/* Overlay: darkest behind the nav, easing off toward the bottom */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/35"
        />

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
          <img src="/logo-dark.svg" alt="Peoplearound" className="h-16 w-auto sm:h-28" />
          <nav className="flex items-center gap-2">
            <a
              href="#join"
              className="rounded-full px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </a>
            <a
              href="#join"
              className="rounded-lg bg-pa-green px-4 py-2 text-sm font-medium text-pa-green-ink transition-colors hover:bg-pa-green-hover"
            >
              Sign up
            </a>
          </nav>
        </header>

        <div className="relative mx-auto flex max-w-md flex-col px-4 pb-12 pt-4 lg:pb-16">
              <div
                id="join"
                className="rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
              >
                <h1 className="text-center text-xl font-semibold tracking-tight">
                  Do something with people around you
                </h1>

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

                <form className="mt-5 flex flex-col gap-3">
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="Email address"
                    className={INPUT}
                  />
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    className={INPUT}
                  />
                  {turnstileKey ? (
                    <div
                      className="cf-turnstile"
                      data-sitekey={turnstileKey}
                      data-size="flexible"
                    />
                  ) : null}
                  <button
                    formAction={signIn}
                    className="rounded-lg bg-pa-green px-4 py-2.5 text-sm font-medium text-pa-green-ink transition-colors hover:bg-pa-green-hover"
                  >
                    Continue
                  </button>
                  <button
                    formAction={signUp}
                    className="rounded-lg border border-slate-400 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                  >
                    Create account
                  </button>
                </form>

                <div className="my-4 flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
                  <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
                  or
                  <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
                </div>

                <form
                  action={signInWithMagicLink}
                  className="flex flex-col gap-3"
                >
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="Email for a sign-in link"
                    className={INPUT}
                  />
                  {turnstileKey ? (
                    <div
                      className="cf-turnstile"
                      data-sitekey={turnstileKey}
                      data-size="flexible"
                    />
                  ) : null}
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-400 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                  >
                    Email me a sign-in link
                  </button>
                </form>

                <AutoLocate />
              </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Live ideas teaser */}
        <section className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Ideas being built right now within the communities
          </h2>
          <p className="mt-1 text-center text-sm text-black/50 dark:text-white/50">
            Real projects from real communities. Join to star them, meet the
            team, or add your own.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea, i) => {
              const meta = STATE_META[idea.state] ?? STATE_META.idea;
              return (
                <li
                  key={idea.id}
                  className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-zinc-900"
                >
                  <div
                    aria-hidden
                    className="h-36 bg-cover"
                    style={{
                      backgroundImage: "url(/hero-collage.jpg)",
                      backgroundSize: "500%",
                      backgroundPosition: PHOTO_CROPS[i % PHOTO_CROPS.length],
                    }}
                  />
                  <div className="flex flex-col gap-2 p-4">
                    <p className="line-clamp-2 font-medium leading-snug">
                      <span className="mr-1.5" aria-hidden>
                        {categoryMeta(idea.category ?? "").emoji}
                      </span>
                      {idea.title}
                    </p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-black/45 dark:text-white/45">
                        {idea.created_at
                          ? `shared ${timeAgo(idea.created_at)}`
                          : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          ⭐ {idea.star_count}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 text-center">
            <a
              href="#join"
              className="inline-block rounded-lg bg-pa-green px-6 py-2.5 text-sm font-medium text-pa-green-ink transition-colors hover:bg-pa-green-hover"
            >
              Join and share yours
            </a>
          </div>
        </section>

        {/* Feature tiles */}
        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-12 sm:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-6 dark:bg-emerald-950/40">
            <UsersRound
              className="h-7 w-7 text-emerald-700 dark:text-emerald-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="mt-3 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
              <strong>Your communities, plural</strong> — your neighborhood,
              plus the cultural, hobby, and interest groups you belong to.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-6 dark:bg-amber-950/40">
            <Lightbulb
              className="h-7 w-7 text-amber-700 dark:text-amber-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="mt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
              <strong>Share an idea</strong> and the people around you star it,
              join your team, and help make it real.
            </p>
          </div>
          <div className="rounded-2xl bg-violet-50 p-6 dark:bg-violet-950/40">
            <CalendarDays
              className="h-7 w-7 text-violet-700 dark:text-violet-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="mt-3 text-sm leading-relaxed text-violet-900 dark:text-violet-200">
              <strong>Meet in person</strong> at project events — every
              contribution is credited and confirmed by the team.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="pb-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Connect with your communities
          </h2>
          <a
            href="#join"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pa-green px-7 py-3 text-sm font-medium text-pa-green-ink transition-colors hover:bg-pa-green-hover"
          >
            <HeartHandshake className="h-4 w-4" aria-hidden />
            Join Peoplearound
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-300 bg-stone-100/60 dark:border-slate-600 dark:bg-zinc-900/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
            <img src="/logo.svg" alt="Peoplearound" className="h-16 w-auto" />
          </div>
          <div className="text-sm">
            <p className="mb-2 font-medium">Peoplearound</p>
            <ul className="flex flex-col gap-1.5 text-black/60 dark:text-white/60">
              <li>
                <a href="#join" className="hover:underline">
                  Get started
                </a>
              </li>
              <li>
                <Link href="/help" className="hover:underline">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/invite" className="hover:underline">
                  Invite neighbors
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-medium">Neighbors</p>
            <ul className="flex flex-col gap-1.5 text-black/60 dark:text-white/60">
              <li>
                <Link href="/events" className="hover:underline">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/neighborhood" className="hover:underline">
                  Communities
                </Link>
              </li>
              <li>
                <Link href="/faves" className="hover:underline">
                  Local Faves
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="pb-6 text-center text-xs text-black/40 dark:text-white/40">
          © Peoplearound 2026 ·{" "}
          <span title={BUILD_TIME ? `Built ${BUILD_TIME}` : undefined}>
            {versionLabel()}
          </span>
        </p>
      </footer>
    </div>
  );
}
