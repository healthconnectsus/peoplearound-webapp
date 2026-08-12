"use client";

import { useRouter } from "next/navigation";

/**
 * The community picker beside "What's happening in your communities" — a
 * plain <select> dressed as a link, because a real dropdown control is the
 * honest version of this interaction (keyboard, mobile, screen readers all
 * free). "All my communities" is the default; the last row jumps to the
 * create-a-community form instead of filtering.
 */
export function CommunityFilter({
  communities,
  selected,
}: {
  communities: { id: string; label: string }[];
  selected: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__new__") router.push("/people#communities");
        else if (v === "") router.push("/people#feed");
        else router.push(`/people?community=${v}#feed`);
      }}
      className="max-w-56 cursor-pointer truncate rounded-full border border-black/15 bg-white px-2.5 py-1 text-xs font-medium normal-case tracking-normal text-emerald-700 outline-none transition-colors hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-emerald-400 dark:hover:bg-white/10"
    >
      <option value="">All my communities</option>
      {communities.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
      <option value="__new__">➕ Add a new community</option>
    </select>
  );
}
