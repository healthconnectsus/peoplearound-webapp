import Image from "next/image";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import type { HostedPage } from "./pages";

/**
 * A page that lives at a printed code: one person, one ask, one way to give.
 *
 * It wears their colour, not ours. The mark they printed is the only brand
 * on it, and the site appears once, small, at the bottom. It is built for a
 * phone held in one hand by someone who just scanned a piece of paper: one
 * column, the ask before the asking, and a button for the people who cannot
 * scan the code because it is on their own screen.
 */

// A serif with some warmth for the headline; the body stays in the site's
// Roboto. Self-hosted at build time like Roboto in the root layout, so the
// CSP's font-src 'self' still holds.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export function Fundraiser({ page }: { page: HostedPage }) {
  const { ink } = page;

  return (
    <main
      className="min-h-dvh px-5 py-10 text-[#3b2a2e] sm:py-16"
      style={{
        // A soft wash of their colour at the top of a warm white page.
        background: `radial-gradient(90% 55% at 50% 0%, ${ink}1f, transparent 70%) #fffaf6`,
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <Image
          src={page.logo.image}
          alt={page.logo.alt}
          priority
          sizes="(min-width: 640px) 300px, 64vw"
          className="h-auto w-[64%] max-w-[300px]"
        />

        <div className="mt-9">
          {page.kicker ? (
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70"
              style={{ color: ink }}
            >
              {page.kicker}
            </p>
          ) : null}
          <h1
            className={`${display.className} mt-2 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.01em] sm:text-[2.6rem]`}
            style={{ color: ink }}
          >
            {page.headline}
            {/* Stuck to the last word, so it never sits on a line of its own. */}
            &nbsp;<span aria-hidden>🌺</span>
          </h1>
        </div>

        {page.paragraphs.map((p) => (
          <p key={p} className="mt-4 max-w-sm text-[17px] leading-relaxed">
            {p}
          </p>
        ))}

        <section
          aria-labelledby="give"
          className="mt-9 w-full rounded-[28px] bg-white p-5 ring-1 ring-black/[0.06] sm:p-6"
          style={{ boxShadow: `0 30px 60px -30px ${ink}66` }}
        >
          <h2
            id="give"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45"
          >
            Send a gift on Venmo
          </h2>

          {/* Served as the file it is: the optimizer re-quantizes PNGs, and
              a code is the one picture that must not drift. */}
          <Image
            src={page.venmo.card}
            alt={`${page.name}'s Venmo code`}
            unoptimized
            className="mx-auto mt-4 h-auto w-full max-w-[300px] rounded-2xl"
          />

          <a
            href={page.venmo.url}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full px-6 text-[17px] font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99]"
            style={{ background: ink, outlineColor: ink }}
          >
            Open Venmo
          </a>
          <p className="mt-3 text-sm leading-relaxed text-black/50">
            Tap the button on your phone, or point your camera at the code.
          </p>
        </section>

        {page.signoff ? (
          <p
            className={`${display.className} mt-9 text-[1.6rem] italic`}
            style={{ color: ink }}
          >
            {page.signoff} <span aria-hidden>♥</span>
          </p>
        ) : null}

        <footer className="mt-12 text-xs text-black/35">
          <Link href="/" className="underline-offset-2 hover:underline">
            A page on Peoplearound
          </Link>
        </footer>
      </div>
    </main>
  );
}
