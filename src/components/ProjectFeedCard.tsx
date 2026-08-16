import Link from "next/link";
import {
  HELP_META,
  REACH_META,
  STATE_META,
  categoryMeta,
  categoryTint,
  initials,
  timeAgo,
  type Project,
} from "@/lib/projects";

/**
 * The feed card grammar, shared between Explore (every zone) and People
 * around ("In your communities" only). One look for "a project exists"
 * across both pages, so moving between them doesn't feel like a different
 * app.
 */

export type CardData = Project & {
  starCount: number;
  team: string[]; // owner first, then accepted collaborators
  beat: string | null; // the freshest human moment on this project
  hot: boolean; // has an event in the next 7 days
};

export function Avatars({ names }: { names: string[] }) {
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {names.slice(0, 4).map((n, i) => (
        <span
          key={`${n}-${i}`}
          title={n}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-[9px] font-semibold text-emerald-800 dark:border-zinc-900 dark:bg-emerald-900 dark:text-emerald-200"
        >
          {initials(n)}
        </span>
      ))}
      {names.length > 4 ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black/10 text-[9px] font-semibold dark:border-zinc-900 dark:bg-white/15">
          +{names.length - 4}
        </span>
      ) : null}
    </span>
  );
}

export function ProjectCard({ p }: { p: CardData }) {
  const meta = STATE_META[p.state];
  const cat = categoryMeta(p.category);
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className={`block overflow-hidden rounded-2xl border border-slate-300 border-l-4 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/10 dark:border-slate-600 dark:bg-zinc-900 ${categoryTint(p.category)}`}
      >
        {p.photo_url ? (
          <div
            aria-hidden
            className="h-40 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${p.photo_url})` }}
          />
        ) : null}
        <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-snug">
            <span className="mr-1.5" aria-hidden>
              {cat.emoji}
            </span>
            {p.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>

        {p.beat ? (
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {p.beat}
          </p>
        ) : p.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-black/60 dark:text-white/60">
            {p.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-black/45 dark:text-white/45">
          <Avatars names={p.team} />
          <span>
            {p.team[0]}
            {p.team.length > 1 ? ` + ${p.team.length - 1}` : ""}
          </span>
          <span title="People who'd love this to exist">⭐ {p.starCount}</span>
          {p.when_text ? <span>🗓 {p.when_text}</span> : null}
          {p.help !== "local" ? (
            <span title={HELP_META[p.help].hint}>
              {HELP_META[p.help].emoji} {HELP_META[p.help].label}
            </span>
          ) : null}
          {p.reach !== "neighborhood" ? (
            <span title={REACH_META[p.reach].hint}>
              {REACH_META[p.reach].emoji} {REACH_META[p.reach].label}
            </span>
          ) : null}
        </div>
        </div>
      </Link>
    </li>
  );
}

export function CompactRow({ p }: { p: CardData }) {
  const cat = categoryMeta(p.category);
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <span className="min-w-0 truncate text-sm">
          <span className="mr-1" aria-hidden>
            {cat.emoji}
          </span>
          <span className="font-medium">{p.title}</span>{" "}
          <span className="text-black/40 dark:text-white/40">
            · {p.beat ?? `${STATE_META[p.state].label.toLowerCase()}, ${timeAgo(p.created_at)}`}
          </span>
        </span>
        <span className="shrink-0 text-xs text-black/45 dark:text-white/45">
          {HELP_META[p.help].emoji} · ⭐ {p.starCount}
        </span>
      </Link>
    </li>
  );
}
