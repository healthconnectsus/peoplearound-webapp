import Link from "next/link";
import { UsersRound, HandHelping } from "lucide-react";
import { initials } from "@/lib/projects";

/**
 * The actionable strip at the top of Explore — Nextdoor's "What's happening,
 * neighbor?" pattern, pointed at our two doors. The "input" is a link, not a
 * field: the wizard is where words get written, and a fake-editable box that
 * swallowed a first sentence would be worse than an honest button.
 */
export function FeedComposer({ name }: { name: string | null }) {
  // One row: avatar, prompt, and the two doors. The prompt gives up its width
  // first (min-w-0 + flex-1) so the buttons keep their labels intact; below
  // sm they wrap under it rather than squeezing.
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:flex-nowrap">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
        {initials(name)}
      </span>
      <Link
        href="/projects/new"
        className="min-w-0 flex-1 basis-full rounded-full bg-black/[0.05] px-4 py-2.5 text-sm text-black/50 transition-colors hover:bg-black/[0.08] dark:bg-white/10 dark:text-white/50 dark:hover:bg-white/15 sm:basis-auto"
      >
        Hey community,&hellip;
      </Link>
      <Link
        href="/projects/new"
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        <UsersRound className="h-4 w-4" strokeWidth={2} aria-hidden />
        Let&rsquo;s do something
      </Link>
      <Link
        href="/people?compose=1#asks"
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-amber-400 px-4 py-2.5 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400"
      >
        <HandHelping className="h-4 w-4" strokeWidth={2} aria-hidden />
        I need a favor
      </Link>
    </div>
  );
}
