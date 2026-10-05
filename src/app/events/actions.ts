"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Running an event: publishing it, correcting it, and saying you're coming.
 *
 * Who may do what is row-level security's business, not this file's — the
 * events policies allow a steward (the founder or a co-organizer) to update,
 * and anyone signed in to RSVP for themselves. These actions therefore never
 * decide permission; they just do the work and let the database refuse.
 */

/**
 * Eight characters from an alphabet with no look-alikes — no I, L, O, 0 or
 * 1 — because this ends up read off paper and typed in by hand. 31^8 is
 * about 850 billion, drawn from a crypto source, so codes cannot be guessed
 * or walked through.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newShareCode(): string {
  return Array.from(
    { length: 8 },
    () => ALPHABET[crypto.randomInt(ALPHABET.length)],
  ).join("");
}

/** datetime-local gives "YYYY-MM-DDTHH:mm"; stored as the wall clock typed. */
function wallClock(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 16);
  if (trimmed.length < 16) return null;
  const stamp = `${trimmed}:00Z`;
  return Number.isNaN(Date.parse(stamp)) ? null : stamp;
}

export async function setEventSharing(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!on) {
    // Unpublishing retires the code for good. Anything printed with it stops
    // working, which is the point — but it also means re-sharing later gives
    // a new code, so the warning on the button says so.
    await supabase
      .from("events")
      .update({ share_code: null })
      .eq("id", eventId);
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}`);
  }

  // Already published? Keep the code it has. Posters are already out there.
  const { data: current } = await supabase
    .from("events")
    .select("share_code")
    .eq("id", eventId)
    .maybeSingle();

  if (!current?.share_code) {
    let shared = false;
    for (let attempt = 0; attempt < 4 && !shared; attempt++) {
      const { data, error } = await supabase
        .from("events")
        .update({ share_code: newShareCode() })
        .eq("id", eventId)
        .select("share_code")
        .maybeSingle();
      if (data?.share_code) shared = true;
      // 23505 is the one-in-a-trillion collision; anything else is a refusal
      // (not a steward, event gone) and retrying would not help.
      else if (error?.code !== "23505") break;
    }
    if (!shared) {
      redirect(`/events/${eventId}?error=Could+not+publish+this+event`);
    }
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function updateEventDetails(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) redirect("/events");

  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  const place = String(formData.get("place") ?? "").trim().slice(0, 200);
  const description =
    String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const startsAt = wallClock(String(formData.get("startsAt") ?? ""));
  const endsRaw = String(formData.get("endsAt") ?? "").trim();
  const endsAt = endsRaw ? wallClock(endsRaw) : null;

  if (!title || !startsAt) {
    redirect(`/events/${eventId}?error=An+event+needs+a+name+and+a+time`);
  }
  if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    redirect(`/events/${eventId}?error=The+end+time+has+to+be+after+the+start`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved } = await supabase
    .from("events")
    .update({
      title,
      place,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select("project_id")
    .maybeSingle();

  if (!saved) redirect(`/events/${eventId}?error=Could+not+save+those+changes`);

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/projects/${saved.project_id}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}?message=Saved`);
}

/** "I'm in" / "changed my plans", from the event's own page. */
export async function toggleEventRsvp(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Withdrawing a signal, never a penalty — the row simply goes away.
    await supabase
      .from("rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("rsvps").insert({ event_id: eventId, user_id: user.id });
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}`);
}
