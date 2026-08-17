import Link from "next/link";
import { Plus } from "lucide-react";
import { CHIP, CHIP_IDLE, chip } from "@/lib/chips";

/**
 * The community picker that opens the feed.
 *
 * It used to be a <select> beside a "What's happening in your communities"
 * heading. The heading said what the buttons already show, and a dropdown
 * hides every option but one — so the choices are laid out flat, the way
 * Nextdoor's feed tabs are: one button per community, the current one
 * outlined. Server-rendered links, so each view has its own shareable URL
 * and the control needs no JavaScript.
 */
export function CommunityFilter({
  communities,
  selected,
}: {
  communities: { id: string; label: string }[];
  selected: string;
}) {
  return (
    <nav
      aria-label="Filter the feed by community"
      className="flex flex-wrap items-center gap-2"
    >
      <Link
        href="/people#feed"
        aria-current={selected === "" ? "page" : undefined}
        className={chip(selected === "")}
      >
        All my communities
      </Link>

      {communities.map((c) => (
        <Link
          key={c.id}
          href={`/people?community=${c.id}#feed`}
          aria-current={selected === c.id ? "page" : undefined}
          className={`${chip(selected === c.id)} max-w-56 truncate`}
        >
          {c.label}
        </Link>
      ))}

      <Link
        href="/explore"
        title="Find and join another community"
        className={`${CHIP} ${CHIP_IDLE} flex items-center gap-1.5 border-dashed`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        Add a community
      </Link>
    </nav>
  );
}
