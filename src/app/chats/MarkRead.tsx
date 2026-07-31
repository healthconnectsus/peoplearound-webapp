"use client";

import { useEffect } from "react";
import { markRead } from "./actions";

/** Fires once when a thread is opened so it stops counting as unread. */
export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    void markRead(fd);
  }, [conversationId]);
  return null;
}
