"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Offers: give / lend / offer. No money changes hands anywhere in this
 * file — claiming is a human handshake, not a checkout.
 */

const KINDS = ["give", "lend", "offer"] as const;

export async function postOffer(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "give");
  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 2000);
  const photoUrl = String(formData.get("photoUrl") ?? "").trim().slice(0, 500);
  if (!title) redirect("/offers");
  const kind = (KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "give";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("offers").insert({
    user_id: user.id,
    kind,
    title,
    description,
    photo_url: photoUrl || null,
  });

  revalidatePath("/offers");
  redirect("/offers");
}

/** Claim an offer — RLS allows this only on unclaimed, visible offers. */
export async function claimOffer(formData: FormData) {
  const id = String(formData.get("offerId") ?? "");
  if (!id) redirect("/offers");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("offers")
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/offers");
  redirect("/offers");
}

/** The poster releases a claim (plans changed — no penalty, no stigma). */
export async function releaseOffer(formData: FormData) {
  const id = String(formData.get("offerId") ?? "");
  if (!id) redirect("/offers");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("offers")
    .update({ claimed_by: null, claimed_at: null })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/offers");
  redirect("/offers");
}

export async function deleteOffer(formData: FormData) {
  const id = String(formData.get("offerId") ?? "");
  if (!id) redirect("/offers");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("offers").delete().eq("id", id);

  revalidatePath("/offers");
  redirect("/offers");
}
