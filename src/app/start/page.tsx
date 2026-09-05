import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Footprints,
  HeartHandshake,
  MapPin,
  Megaphone,
  Trophy,
  UsersRound,
} from "lucide-react";
import { versionLabel, BUILD_TIME } from "@/lib/version";

export const metadata: Metadata = {
  title: "Start a club in your neighborhood — Peoplearound",
  description:
    "Start a run club, pickup soccer group, or pickleball crew where you live. Share the idea, neighbors join in, and every contribution is credited.",
};

const STEPS = [
  {
    icon: Megaphone,
    title: "Share the idea",
    body: "Describe your club in your own words — or dictate it. Our AI shapes it into a clear plan your neighbors can read in ten seconds.",
  },
  {
    icon: UsersRound,
    title: "Neighbors join in",
    body: "People around you star the idea and ask to join. You approve the team — everyone shows up already knowing who's in.",
  },
  {
    icon: CalendarCheck,
    title: "Meet every week",
    body: "Set the recurring meet-up, and every session, milestone, and helping hand is credited to the people who made it happen.",
  },
];

const TEMPLATES = [
  {
    icon: Footprints,
    accent:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    name: "Neighborhood run club",
    tagline: "The easiest club to start. Zero equipment, weekly cadence.",
    plan: [
      "Pick a day, a time, and a meeting spot (a park gate or café works)",
      "Choose a friendly loop: 3–5 km, no one gets dropped",
      "Coffee together afterwards — that's the real reason people come",
    ],
  },
  {
    icon: Trophy,
    accent:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    name: "Pickup soccer",
    tagline: "Still buzzing from the World Cup? Give it somewhere to go.",
    plan: [
      "Find a free field or court and claim a weekly slot",
      "First-come rosters, mixed teams every week, all levels welcome",
      "Bring two sets of bibs and a ball — neighbors handle the rest",
    ],
  },
  {
    icon: MapPin,
    accent:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    name: "Pickleball crew",
    tagline: "America's fastest-growing sport, five years running.",
    plan: [
      "Map the public courts near you and pick an open-play time",
      "Loaner paddles for first-timers — it takes one session to hook them",
      "No courts nearby? Rally neighbors to convert one — that's a project too",
    ],
  },
];

const ALSO_POPULAR = [
  "Flag football",
  "Volleyball",
  "Disc golf",
  "Ultimate frisbee",
  "3x3 basketball",
  "Cornhole league",
  "Padel",
];

export default function StartClubPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero — same full-bleed collage treatment as the logged-out landing */}
      <section
        className="relative bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-collage.jpg)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/40"
        />

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
            <img src="/logo-dark.svg" alt="Peoplearound" className="h-10 w-auto" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-pa-brand px-4 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
            >
              Sign up
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-8 text-center lg:pb-20 lg:pt-12">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Start a club people actually show up to
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/85">
            A run club, pickup soccer, a pickleball crew — share the idea on
            Peoplearound and the people around you join in. Ten minutes to
            start, one neighborhood to fill it.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/projects/new"
              className="rounded-lg bg-pa-brand px-6 py-3 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
            >
              Start your club — it&apos;s free
            </Link>
            <a
              href="#templates"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              See starter plans
            </a>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  <step.icon
                    className="h-6 w-6 text-emerald-700 dark:text-emerald-400"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <p className="mt-3 font-medium">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-black/60 dark:text-white/60">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Starter plans */}
        <section id="templates" className="mx-auto w-full max-w-5xl px-4 pb-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Pick a starter plan
          </h2>
          <p className="mt-1 text-center text-sm text-black/50 dark:text-white/50">
            Borrow one of these, tweak it to your street, and share it — the
            idea shaper turns your words into a ready-to-join page.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {TEMPLATES.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-2xl border border-slate-300 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-zinc-900"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${t.accent}`}
                >
                  <t.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="mt-4 text-lg font-semibold tracking-tight">
                  {t.name}
                </p>
                <p className="mt-0.5 text-sm text-black/55 dark:text-white/55">
                  {t.tagline}
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                  {t.plan.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-relaxed text-black/70 dark:text-white/70"
                    >
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pa-brand"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/projects/new"
                  className="mt-5 rounded-lg border border-slate-400 px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                >
                  Use this plan
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-black/50 dark:text-white/50">
              Also taking off:
            </span>
            {ALSO_POPULAR.map((s) => (
              <span
                key={s}
                className="rounded-full border border-slate-400 bg-white px-3 py-1 text-sm text-black/70 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/70"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Why Peoplearound and not a group chat */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-12">
          <div className="rounded-2xl bg-emerald-50 p-8 dark:bg-emerald-950/40">
            <h2 className="text-xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-200">
              Why not just a group chat?
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <p className="text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                <strong>Neighbors find you.</strong> A chat only reaches people
                you already know. On Peoplearound, your club is visible to the
                whole neighborhood — including the runner three streets over
                you&apos;ve never met.
              </p>
              <p className="text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                <strong>Joining means something.</strong> People request to
                join, you approve the team, and the roster is real — not 40
                lurkers and 4 regulars.
              </p>
              <p className="text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                <strong>Credit is permanent.</strong> Whoever books the field,
                brings the bibs, or coaches the newcomers gets confirmed,
                attributed credit — the club&apos;s history stays with the
                people who built it.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="pb-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your neighborhood is one idea away
          </h2>
          <Link
            href="/projects/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pa-brand px-7 py-3 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
          >
            <HeartHandshake className="h-4 w-4" aria-hidden />
            Start your club
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-stone-100/60 dark:border-slate-600 dark:bg-zinc-900/60">
        <p className="py-6 text-center text-xs text-black/40 dark:text-white/40">
          © Peoplearound 2026 ·{" "}
          <span title={BUILD_TIME ? `Built ${BUILD_TIME}` : undefined}>
            {versionLabel()}
          </span>
        </p>
      </footer>
    </div>
  );
}
