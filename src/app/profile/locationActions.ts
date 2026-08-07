"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Your private map centre. RLS restricts `user_locations` to own rows, and a
 * DB trigger rounds to ~1.1 km, so this can never become an address book.
 */
export async function setMyLocation(formData: FormData) {
  const lat = Number.parseFloat(String(formData.get("lat") ?? ""));
  const lng = Number.parseFloat(String(formData.get("lng") ?? ""));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    redirect("/profile");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("user_locations")
    .upsert({ user_id: user.id, lat, lng }, { onConflict: "user_id" });

  revalidatePath("/profile");
  redirect("/profile");
}

export async function forgetMyLocation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("user_locations").delete().eq("user_id", user.id);

  revalidatePath("/profile");
  redirect("/profile");
}
