"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends a message. Accepts either an existing conversationId or a toUserId —
 * in the latter case it finds (or creates) the 1:1 conversation first.
 */
export async function sendMessage(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  const conversationId = String(formData.get("conversationId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  if (!body) redirect(conversationId ? `/chats?c=${conversationId}` : "/chats");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let cid = conversationId;

  if (!cid && toUserId && toUserId !== user.id) {
    // Reuse an existing 1:1 conversation with this person if there is one.
    const { data: myRows, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);
    if (error) {
      redirect(
        `/chats?error=${encodeURIComponent(
          "Messaging needs migration 0011 — run supabase/migrations/0011_communities_and_chats.sql in the Supabase SQL editor.",
        )}`,
      );
    }
    const myIds = (myRows ?? []).map((r) => r.conversation_id);
    if (myIds.length > 0) {
      const { data: theirRows } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", toUserId)
        .in("conversation_id", myIds);
      cid = theirRows?.[0]?.conversation_id ?? "";
    }
    if (!cid) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({})
        .select("id")
        .single();
      if (convErr || !conv) {
        redirect(`/chats?error=${encodeURIComponent(convErr?.message ?? "Could not start the chat")}`);
      }
      // Order matters for RLS: add yourself first, then the other person.
      const { error: selfErr } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: conv.id, user_id: user.id });
      const { error: otherErr } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: conv.id, user_id: toUserId });
      if (selfErr || otherErr) {
        redirect(`/chats?error=${encodeURIComponent((selfErr ?? otherErr)!.message)}`);
      }
      cid = conv.id;
    }
  }

  if (!cid) redirect("/chats");

  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: cid,
    sender_id: user.id,
    body: body.slice(0, 4000),
  });
  if (msgErr) {
    redirect(`/chats?c=${cid}&error=${encodeURIComponent(msgErr.message)}`);
  }

  // Sending implies you've read the thread.
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", cid)
    .eq("user_id", user.id);

  redirect(`/chats?c=${cid}`);
}

/** Marks a conversation read (called when a thread is opened). */
export async function markRead(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}
