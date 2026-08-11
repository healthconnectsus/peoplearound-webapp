"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Small help: "a hand for 20 minutes." Stored as a `need` row on `offers`
 * (migration 0033) so it inherits the board's RLS, rate cap, claim policy
 * and location blunting.
 *
 * Nobody is ever asked to justify a need here, and there is no money field
 * to fill in — the whole point is that asking should cost less than staying
 * stuck.
 */

const ALLOWED_MINUTES = [10, 20, 30, 60, 120, 240];

export async function postAsk(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 2000);
  const whenText = String(formData.get("whenText") ?? "").trim().slice(0, 80);
  const place = String(formData.get("place") ?? "").trim().slice(0, 120);
  const photoUrl = String(formData.get("photoUrl") ?? "").trim().slice(0, 500);

  const minutesRaw = Number.parseInt(String(formData.get("minutes") ?? ""), 10);
  const minutes = ALLOWED_MINUTES.includes(minutesRaw) ? minutesRaw : 30;

  const latNum = Number.parseFloat(String(formData.get("lat") ?? ""));
  const lngNum = Number.parseFloat(String(formData.get("lng") ?? ""));
  const hasSpot =
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    Math.abs(latNum) <= 90 &&
    Math.abs(lngNum) <= 180;

  if (!title) redirect("/people#asks");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("offers").insert({
    user_id: user.id,
    kind: "need",
    title,
    description,
    minutes,
    when_text: whenText || null,
    place: place || null,
    photo_url: photoUrl || null,
    lat: hasSpot ? Math.round(latNum * 1000) / 1000 : null,
    lng: hasSpot ? Math.round(lngNum * 1000) / 1000 : null,
  });

  revalidatePath("/people");
  redirect("/people#asks");
}

/** "I'll help" — RLS permits this only on open, visible rows. */
export async function claimAsk(formData: FormData) {
  const id = String(formData.get("askId") ?? "");
  if (!id) redirect("/people#asks");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("offers")
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/people");
  redirect("/people#asks");
}

/**
 * The asker marks it handled — which also takes it off the board. Deleting
 * rather than flagging done: a small ask has no history worth keeping, and
 * nobody needs a permanent record of the day they couldn't lift a sofa alone.
 */
export async function closeAsk(formData: FormData) {
  const id = String(formData.get("askId") ?? "");
  if (!id) redirect("/people#asks");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("offers").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/people");
  redirect("/people#asks");
}

/** Plans changed — put it back on the board, no penalty either way. */
export async function reopenAsk(formData: FormData) {
  const id = String(formData.get("askId") ?? "");
  if (!id) redirect("/people#asks");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Either side can step back: the asker releases the helper, or the helper
  // withdraws. RLS confines both to rows they can already see.
  await supabase
    .from("offers")
    .update({ claimed_by: null, claimed_at: null })
    .eq("id", id)
    .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`);

  revalidatePath("/people");
  redirect("/people#asks");
}
