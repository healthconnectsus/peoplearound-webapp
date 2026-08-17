"use client";

import { useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { sendMessage } from "./actions";

export function Composer({
  conversationId,
  toUserId,
}: {
  conversationId?: string;
  toUserId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        formRef.current?.reset();
        await sendMessage(formData);
      }}
      className="flex items-center gap-2 border-t border-slate-300 p-3 dark:border-slate-500"
    >
      {conversationId ? (
        <input type="hidden" name="conversationId" value={conversationId} />
      ) : null}
      {toUserId ? (
        <input type="hidden" name="toUserId" value={toUserId} />
      ) : null}
      <input
        type="text"
        name="body"
        required
        maxLength={4000}
        autoComplete="off"
        placeholder="Write a message…"
        className="flex-1 rounded-full border border-slate-400 bg-stone-50 px-4 py-2 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-slate-500 dark:bg-zinc-800"
      />
      <SubmitButton
        aria-label="Send"
        pendingLabel="…"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
      >
        <SendHorizontal className="h-4 w-4" aria-hidden />
      </SubmitButton>
    </form>
  );
}
