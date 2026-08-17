import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { toggleStar } from "@/app/projects/actions";
import { SubmitButton } from "./SubmitButton";
import {
  HELP_META,
  REACH_META,
  STATE_META,
  categoryMeta,
  categoryShadow,
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
  starred?: boolean; // has the viewer starred it
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

/** The starter's face — their upload, or their initials. */
function OwnerAvatar({
  name,
  avatarUrl,
  onPhoto,
}: {
  name: string;
  avatarUrl: string | null;
  onPhoto: boolean;
}) {
  const ring = onPhoto ? "ring-1 ring-white/60" : "ring-1 ring-black/10";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, unoptimized is fine
      <img
        src={avatarUrl}
        alt=""
        className={`h-7 w-7 shrink-0 rounded-full object-cover ${ring}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${ring} ${
        onPhoto
          ? "bg-white/25 text-white backdrop-blur-sm"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      }`}
    >
      {initials(name)}
    </span>
  );
}

export function ProjectCard({
  p,
  returnTo,
}: {
  p: CardData;
  /** Path to re-render after starring, so the feed doesn't navigate away. */
  returnTo?: string;
}) {
  const meta = STATE_META[p.state];
  const cat = categoryMeta(p.category);
  const starter = p.team[0] ?? p.owner?.display_name ?? "A neighbor";
  const place = p.neighborhood?.name ?? null;
  // "Meadowood · 23 hr ago" — where it's happening and how fresh it is.
  const line = [place, timeAgo(p.created_at)].filter(Boolean).join(" · ");

  return (
    <li>
      <div
        className={`overflow-hidden rounded-2xl border border-slate-300 border-l-4 bg-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-600 dark:bg-zinc-900 ${categoryTint(p.category)} ${categoryShadow(p.category)}`}
      >
        <Link href={`/projects/${p.id}`} className="block">
          {p.photo_url ? (
            <div
              className="relative h-56 w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${p.photo_url})` }}
            >
              {/* Dark scrim so white type stays legible over any photo. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/35 to-slate-900/5"
              />
              <span
                className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
              >
                {meta.label}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="text-lg font-semibold leading-snug drop-shadow-sm">
                  <span className="mr-1.5" aria-hidden>
                    {cat.emoji}
                  </span>
                  {p.title}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <OwnerAvatar
                    name={starter}
                    avatarUrl={p.owner?.avatar_url ?? null}
                    onPhoto
                  />
                  <span className="min-w-0 text-xs leading-tight">
                    <span className="block truncate font-medium">
                      {starter}
                    </span>
                    <span className="block truncate text-white/75">{line}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-snug">
                  <span className="mr-1.5" aria-hidden>
                    {cat.emoji}
                  </span>
                  {p.title}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <OwnerAvatar
                    name={starter}
                    avatarUrl={p.owner?.avatar_url ?? null}
                    onPhoto={false}
                  />
                  <span className="min-w-0 text-xs leading-tight">
                    <span className="block truncate font-medium">
                      {starter}
                    </span>
                    <span className="block truncate text-black/45 dark:text-white/45">
                      {line}
                    </span>
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
              >
                {meta.label}
              </span>
            </div>
          )}

          <div className="px-4 pb-3 pt-3">
            {p.beat ? (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {p.beat}
              </p>
            ) : p.description ? (
              <p className="line-clamp-2 text-sm text-black/60 dark:text-white/60">
                {p.description}
              </p>
            ) : null}

            {p.when_text || p.help !== "local" || p.reach !== "neighborhood" ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-black/45 dark:text-white/45">
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
            ) : null}
          </div>
        </Link>

        {/* Actions live outside the Link — a button inside an anchor is
            invalid, and starring shouldn't open the project. */}
        <div className="flex items-center gap-1 border-t border-slate-200 px-2 py-1.5 dark:border-slate-700">
          <form action={toggleStar}>
            <input type="hidden" name="projectId" value={p.id} />
            {returnTo ? (
              <input type="hidden" name="returnTo" value={returnTo} />
            ) : null}
            <SubmitButton
              aria-label={
                p.starred
                  ? `Remove your star from ${p.title}`
                  : `Star ${p.title} — you'd love this to exist`
              }
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-black/60 transition-colors hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              pendingLabel={
                <>
                  <Star className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  <span>{p.starCount}</span>
                </>
              }
            >
              <Star
                className={`h-4 w-4 ${p.starred ? "fill-amber-400 text-amber-500" : ""}`}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className={p.starred ? "font-medium" : ""}>
                {p.starCount}
              </span>
            </SubmitButton>
          </form>

          <Link
            href={`/chats?to=${p.owner_id}`}
            aria-label={`Message ${starter} about ${p.title}`}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-black/60 transition-colors hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            <span>Message</span>
          </Link>

          <span className="ml-auto flex items-center pr-1">
            <Avatars names={p.team} />
          </span>
        </div>
      </div>
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
