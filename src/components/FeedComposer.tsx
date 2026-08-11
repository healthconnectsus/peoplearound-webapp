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
  return (
    <div className="mb-5 rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          {initials(name)}
        </span>
        <Link
          href="/projects/new"
          className="min-w-0 flex-1 rounded-full bg-black/[0.05] px-4 py-2.5 text-sm text-black/50 transition-colors hover:bg-black/[0.08] dark:bg-white/10 dark:text-white/50 dark:hover:bg-white/15"
        >
          Hey community,&hellip;
        </Link>
      </div>
      {/* Same width as the input above (pl matches the avatar's h-10 + gap-3),
          and the two doors split that width evenly instead of sizing to
          their own text — a matched pair, not two random-width buttons. */}
      <div className="mt-2.5 flex gap-2 pl-[3.25rem]">
        <Link
          href="/projects/new"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <UsersRound className="h-4 w-4" strokeWidth={2} aria-hidden />
          Let&rsquo;s do something
        </Link>
        <Link
          href="/people?compose=1#asks"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400"
        >
          <HandHelping className="h-4 w-4" strokeWidth={2} aria-hidden />
          I need a favor
        </Link>
      </div>
    </div>
  );
}
