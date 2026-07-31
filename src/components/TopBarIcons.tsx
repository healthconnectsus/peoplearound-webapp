"use client";

import { useState } from "react";
import Link from "next/link";

export type Notification = {
  key: string;
  emoji: string;
  text: string;
  href: string;
};

function IconButton({
  label,
  emoji,
  badge,
  onClick,
  expanded,
}: {
  label: string;
  emoji: string;
  badge?: number;
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
    >
      <span aria-hidden>{emoji}</span>
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function Panel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-[1090] cursor-default"
        tabIndex={-1}
      />
      <div className="absolute right-0 top-11 z-[1100] w-80 rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        {children}
      </div>
    </>
  );
}

export function TopBarIcons({
  notifications,
  badge,
}: {
  notifications: Notification[];
  badge: number;
}) {
  const [open, setOpen] = useState<"bell" | "chat" | null>(null);

  return (
    <div className="relative flex items-center gap-1">
      <IconButton
        label="Notifications"
        emoji="🔔"
        badge={badge}
        expanded={open === "bell"}
        onClick={() => setOpen(open === "bell" ? null : "bell")}
      />
      <IconButton
        label="Messages"
        emoji="💬"
        expanded={open === "chat"}
        onClick={() => setOpen(open === "chat" ? null : "chat")}
      />

      {open === "bell" ? (
        <Panel onClose={() => setOpen(null)}>
          <p className="px-3 py-2 text-sm font-semibold">Notifications</p>
          {notifications.length === 0 ? (
            <p className="px-3 pb-3 pt-1 text-sm text-black/50 dark:text-white/50">
              Nothing yet. When neighbors star your ideas or ask to join your
              team, it shows up here.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.key}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(null)}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <span className="text-base" aria-hidden>
                      {n.emoji}
                    </span>
                    <span className="min-w-0 leading-snug">{n.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {open === "chat" ? (
        <Panel onClose={() => setOpen(null)}>
          <p className="px-3 py-2 text-sm font-semibold">Messages</p>
          <p className="px-3 pb-3 pt-1 text-sm text-black/50 dark:text-white/50">
            Direct messages are coming soon. For now, coordinate with your team
            right on the project page — every project has its own space.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
