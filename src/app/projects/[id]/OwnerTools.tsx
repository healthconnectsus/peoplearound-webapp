"use client";

import { useState } from "react";
import { CalendarPlus, ImageUp, Megaphone } from "lucide-react";

/**
 * Stewards' tools, folded away.
 *
 * The project page used to render the photo editor, the event form and the
 * update composer inline, always open — so opening your own project looked
 * like an edit screen rather than the thing you made. Everyone sees the
 * story; only the founder (or a co-organizer) sees these buttons, and the
 * form appears only once they ask for it.
 *
 * The forms themselves are passed in as children rendered on the server, so
 * their server actions keep working — this component only decides which one
 * is on screen.
 */

type Tool = "event" | "update" | "photo";

const TOOL_META: Record<Tool, { label: string; Icon: typeof CalendarPlus }> = {
  event: { label: "Plan an event", Icon: CalendarPlus },
  update: { label: "Post an update", Icon: Megaphone },
  photo: { label: "Change cover photo", Icon: ImageUp },
};

export function OwnerTools({
  eventForm,
  updateForm,
  photoEditor,
}: {
  eventForm?: React.ReactNode;
  updateForm?: React.ReactNode;
  photoEditor?: React.ReactNode;
}) {
  const [open, setOpen] = useState<Tool | null>(null);

  const panels: Record<Tool, React.ReactNode | undefined> = {
    event: eventForm,
    update: updateForm,
    photo: photoEditor,
  };
  const tools = (Object.keys(panels) as Tool[]).filter((t) => panels[t]);
  if (tools.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {tools.map((t) => {
          const { label, Icon } = TOOL_META[t];
          const active = open === t;
          return (
            <button
              key={t}
              type="button"
              aria-expanded={active}
              onClick={() => setOpen(active ? null : t)}
              className={`flex items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-400 hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {open ? <div className="mt-3">{panels[open]}</div> : null}
    </div>
  );
}
