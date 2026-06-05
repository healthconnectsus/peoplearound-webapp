import Link from "next/link";

export default function AuthCodeError() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Sign-in link invalid or expired</h1>
      <p className="max-w-sm text-sm text-black/60 dark:text-white/60">
        That confirmation link could not be verified. It may have already been
        used or it may have expired. Please request a new one.
      </p>
      <Link
        href="/login"
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
      >
        Back to sign in
      </Link>
    </main>
  );
}
