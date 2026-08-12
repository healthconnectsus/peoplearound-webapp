"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  HandHeart,
  MessageCircle,
  PartyPopper,
  Star,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { markAllNotificationsRead } from "@/app/notificationActions";

export type Notification = {
  key: string;
  kind: string;
  text: string;
  href: string;
  unread?: boolean;
};

const KIND_ICON: Record<string, LucideIcon> = {
  join_request: UserPlus,
  joined: PartyPopper,
  star: Star,
  contribution: HandHeart,
  confirmed: PartyPopper,
  event: CalendarDays,
  // legacy computed kinds
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
      <div className="absolute right-0 top-11 z-[1100] w-80 rounded-2xl border border-black/15 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-zinc-900">
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
          <div className="flex items-baseline justify-between px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {badge > 0 ? (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
                >
                  Mark all read
                </button>
              </form>
            ) : null}
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 pb-3 pt-1 text-sm text-black/50 dark:text-white/50">
              Nothing yet. When neighbors star your ideas or ask to join your
              team, it shows up here.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Bell;
                return (
                  <li key={n.key}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(null)}
                      className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${n.unread ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""}`}
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
