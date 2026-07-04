import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/login/actions";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Peoplearound"
          width={1536}
          height={1024}
          priority
          className="h-8 w-auto rounded"
        />
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/projects/new"
          className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          + Share an idea
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
