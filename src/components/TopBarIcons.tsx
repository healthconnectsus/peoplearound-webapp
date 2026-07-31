"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  MessageCircle,
  Star,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type Notification = {
  key: string;
  kind: "join" | "stars";
  text: string;
  href: string;
};

const KIND_ICON: Record<Notification["kind"], LucideIcon> = {
  join: UserPlus,
  stars: Star,
};

function IconButton({
  label,
  icon: Icon,
  badge,
  onClick,
  expanded,
}: {
  label: string;
  icon: LucideIcon;
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
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-black/65 transition-colors hover:bg-black/5 dark:text-white/65 dark:hover:bg-white/10"
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
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
  const [open, setOpen] = useState<"bell" | null>(null);

  return (
    <div className="relative flex items-center gap-1">
      <IconButton
        label="Notifications"
        icon={Bell}
        badge={badge}
        expanded={open === "bell"}
        onClick={() => setOpen(open === "bell" ? null : "bell")}
      />
      <Link
        href="/chats"
        aria-label="Chats"
        className="flex h-9 w-9 items-center justify-center rounded-full text-black/65 transition-colors hover:bg-black/5 dark:text-white/65 dark:hover:bg-white/10"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </Link>

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
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li key={n.key}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(null)}
                      className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-black/50 dark:text-white/50"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="min-w-0 leading-snug">{n.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      ) : null}

    </div>
  );
}
