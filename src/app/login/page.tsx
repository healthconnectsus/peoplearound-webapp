import Image from "next/image";
import { signIn, signUp, signInWithMagicLink } from "./actions";
import { versionLabel, BUILD_TIME } from "@/lib/version";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Peoplearound"
            width={1536}
            height={1024}
            priority
            className="h-auto w-56 rounded-xl"
          />
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Achieve goals together.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        {/* Email + password */}
        <form className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/20"
            />
          </label>

          <div className="mt-2 flex gap-2">
            <button
              formAction={signIn}
              className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Sign in
            </button>
            <button
              formAction={signUp}
              className="flex-1 rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Create account
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
          <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
          or
          <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
        </div>

        {/* Magic link */}
        <form action={signInWithMagicLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Magic link</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Email me a sign-in link
          </button>
        </form>
      </div>

      {/* Commit version */}
      <footer className="text-center text-xs text-black/40 dark:text-white/40">
        <span title={BUILD_TIME ? `Built ${BUILD_TIME}` : undefined}>
          {versionLabel()}
        </span>
      </footer>
    </main>
  );
}
