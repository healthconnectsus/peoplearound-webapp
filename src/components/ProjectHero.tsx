import { initials, timeAgo } from "@/lib/projects";

/**
 * The photo header, shared by the feed card and the project page.
 *
 * One shape wherever a project introduces itself: the cover photo carrying
 * its own title, the starter's face and name, and where/when it began
 * ("Meadowood · 23 hr ago"). Living in one file is what keeps the two
 * surfaces identical — the last time the card and the page each owned their
 * own markup, they drifted into looking like different products.
 *
 * Square corners on purpose: no rounded frames anywhere in this grammar.
 */

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

function Byline({
  name,
  avatarUrl,
  line,
  onPhoto,
}: {
  name: string;
  avatarUrl: string | null;
  line: string;
  onPhoto: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <OwnerAvatar name={name} avatarUrl={avatarUrl} onPhoto={onPhoto} />
      <span className="min-w-0 text-xs leading-tight">
        <span className="block truncate font-medium">{name}</span>
        <span
          className={`block truncate ${
            onPhoto ? "text-white/75" : "text-black/45 dark:text-white/45"
          }`}
        >
          {line}
        </span>
      </span>
    </div>
  );
}

export function ProjectHero({
  title,
  emoji,
  photoUrl,
  stateLabel,
  stateBadge,
  ownerName,
  ownerAvatarUrl,
  place,
  createdAt,
  heading = "h3",
  titleClass = "text-lg font-semibold",
}: {
  title: string;
  emoji: string;
  photoUrl: string | null;
  stateLabel: string;
  stateBadge: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  place: string | null;
  createdAt: string;
  /** h1 on the project page, h3 in the feed. */
  heading?: "h1" | "h3";
  titleClass?: string;
}) {
  const Title = heading;
  // "Meadowood · 23 hr ago" — where it's happening and how fresh it is.
  const line = [place, timeAgo(createdAt)].filter(Boolean).join(" · ");

  const badge = (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${stateBadge}`}
    >
      {stateLabel}
    </span>
  );

  if (!photoUrl) {
    return (
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <Title className={`${titleClass} leading-snug`}>
            <span className="mr-1.5" aria-hidden>
              {emoji}
            </span>
            {title}
          </Title>
          <Byline
            name={ownerName}
            avatarUrl={ownerAvatarUrl}
            line={line}
            onPhoto={false}
          />
        </div>
        {badge}
      </div>
    );
  }

  return (
    <div
      className="relative h-56 w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${photoUrl})` }}
    >
      {/* Dark scrim so white type stays legible over any photo. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/35 to-slate-900/5"
      />
      <span className="absolute right-3 top-3">{badge}</span>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <Title className={`${titleClass} leading-snug drop-shadow-sm`}>
          <span className="mr-1.5" aria-hidden>
            {emoji}
          </span>
          {title}
        </Title>
        <Byline
          name={ownerName}
          avatarUrl={ownerAvatarUrl}
          line={line}
          onPhoto
        />
      </div>
    </div>
  );
}
