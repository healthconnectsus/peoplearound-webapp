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

// ------------------------------------------------------------------
// Jobs — what needs doing, and who said they'd do it (migration 0076).
// ------------------------------------------------------------------

export async function addEventRole(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const detail =
    String(formData.get("detail") ?? "").trim().slice(0, 300) || null;
  const needed = Math.min(
    200,
    Math.max(1, Number.parseInt(String(formData.get("needed") ?? "1"), 10) || 1),
  );
  if (!eventId) redirect("/events");
  if (!title) {
    redirect(`/events/${eventId}?error=A+job+needs+a+name`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Keeps new jobs in the order they were written.
  const { count } = await supabase
    .from("event_roles")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("event_roles").insert({
    event_id: eventId,
    title,
    detail,
    needed,
    position: count ?? 0,
    created_by: user.id,
  });
  if (error) redirect(`/events/${eventId}?error=Could+not+add+that+job`);

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function removeEventRole(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!eventId || !roleId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row-level security decides; signups go with it (on delete cascade).
  await supabase.from("event_roles").delete().eq("id", roleId);

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

/** "I'll do it" / "actually, I can't" on one job. */
export async function toggleRoleSignup(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!eventId || !roleId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("event_role_signups")
    .select("user_id")
    .eq("role_id", roleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Stepping back from a job, not from the event: the RSVP stays.
    await supabase
      .from("event_role_signups")
      .delete()
      .eq("role_id", roleId)
      .eq("user_id", user.id);
  } else {
    const { error } = await supabase
      .from("event_role_signups")
      .insert({ role_id: roleId, user_id: user.id });
    if (error) {
      // The capacity trigger refuses the signup that would overfill a job —
      // two people can tap the last slot at the same moment.
      redirect(
        `/events/${eventId}?error=${encodeURIComponent(
          "Someone just took the last spot on that one",
        )}`,
      );
    }
    // Taking a job means you're coming; say so without a second tap.
    await supabase
      .from("rsvps")
      .upsert(
        { event_id: eventId, user_id: user.id },
        { onConflict: "event_id,user_id", ignoreDuplicates: true },
      );
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

/**
 * Call it off, and say so.
 *
 * Deleting an event is right for a mistake; this is for the thing rain
 * stopped. The event keeps its page, the poster's QR still lands somewhere
 * truthful, and everyone coming is told at once (migration 0078).
 */
export async function cancelEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 280);
  if (!eventId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: told, error } = await supabase.rpc("cancel_event", {
    p_event: eventId,
    p_reason: reason,
  });
  if (error) redirect(`/events/${eventId}?error=Could+not+cancel+that`);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(
    `/events/${eventId}?message=${encodeURIComponent(
      told && told > 0
        ? `Called off — ${told} ${told === 1 ? "person was" : "people were"} told`
        : "Called off",
    )}`,
  );
}

/** Back on after all. */
export async function uncancelEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("uncancel_event", { p_event: eventId });
  if (error) redirect(`/events/${eventId}?error=Could+not+do+that`);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(
    `/events/${eventId}?message=${encodeURIComponent(
      "Back on — tell everyone, they were told it was off",
    )}`,
  );
}

/**
 * A note to everyone coming: "bring boots, it's muddy".
 *
 * Reaches the people who said they're coming and the people who took a job —
 * including the ones who found the event on a poster and are in no group
 * chat. The database decides whether you may send it, and refuses more than
 * one every ten minutes (migration 0077).
 */
export async function sendEventNote(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 280);
  if (!eventId) redirect("/events");
  if (!body) redirect(`/events/${eventId}?error=Write+something+first`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: told, error } = await supabase.rpc("message_event_people", {
    p_event: eventId,
    p_body: body,
  });

  if (error) {
    const why = /ten minutes/.test(error.message)
      ? "A note just went out — give it ten minutes"
      : "That note could not be sent";
    redirect(`/events/${eventId}?error=${encodeURIComponent(why)}`);
  }

  revalidatePath(`/events/${eventId}`);
  redirect(
    `/events/${eventId}?message=${encodeURIComponent(
      told === 0
        ? "Noted — nobody is coming yet, so nobody was pinged"
        : `Sent to ${told} ${told === 1 ? "person" : "people"}`,
    )}`,
  );
}

/** The organizer ticking off who actually turned up. */
export async function setAttendance(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const present = String(formData.get("present") ?? "") === "1";
  if (!eventId || !userId) redirect("/events");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (present) {
    await supabase
      .from("event_attendance")
      .upsert(
        { event_id: eventId, user_id: userId, marked_by: user.id },
        { onConflict: "event_id,user_id", ignoreDuplicates: true },
      );
  } else {
    await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}#run-sheet`);
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
