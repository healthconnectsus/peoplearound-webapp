"use client";

import { useState } from "react";
import { CalendarPlus, Megaphone, Pencil } from "lucide-react";

/**
 * Stewards' tools, folded away beside the thing they act on.
 *
 * The project page used to render the photo editor, the event form and the
 * update composer inline, always open — so opening your own project looked
 * like an edit screen rather than the thing you made. Now each form opens
 * from a button next to its own section heading ("Plan an event" beside
 * Events, "Post an update" beside Updates), and only stewards see them.
 *
 * The forms themselves are passed in as nodes rendered on the server, so
 * their server actions keep working — these components only decide whether
 * one is on screen.
 */

type Tool = "event" | "update" | "edit";

const TOOL_META: Record<Tool, { label: string; Icon: typeof CalendarPlus }> = {
  event: { label: "Plan an event", Icon: CalendarPlus },
  update: { label: "Post an update", Icon: Megaphone },
  edit: { label: "Edit project", Icon: Pencil },
};

function ToolButton({
  tool,
  open,
  onToggle,
}: {
  tool: Tool;
  open: boolean;
  onToggle: () => void;
}) {
  const { label, Icon } = TOOL_META[tool];
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors ${
        open
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-400 hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );
}

/** A page section whose steward form opens from a button beside its heading. */
export function StewardSection({
  title,
  tool,
  form,
  startOpen = false,
  children,
}: {
  title: string;
  /** null for anyone without permission — then it's a plain section. */
  tool: Tool | null;
  form?: React.ReactNode;
  /** Arrive with the form already open, e.g. from "Plan an event". */
  startOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);

  return (
    <div className="mt-7">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {tool && form ? (
          <ToolButton
            tool={tool}
            open={open}
            onToggle={() => setOpen((v) => !v)}
          />
        ) : null}
      </div>
      {open && form ? <div className="mb-3">{form}</div> : null}
      {children}
    </div>
  );
}

/** The project editor, folded under the hero. Founder only. */
export function EditProjectTool({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <ToolButton tool="edit" open={open} onToggle={() => setOpen((v) => !v)} />
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
