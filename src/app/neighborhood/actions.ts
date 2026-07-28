"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setNeighborhood(formData: FormData) {
  const neighborhoodId = String(formData.get("neighborhoodId") ?? "");
  if (!neighborhoodId) redirect("/neighborhood");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Guard against arbitrary ids; RLS only allows updating your own profile.
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("id")
    .eq("id", neighborhoodId)
    .maybeSingle();
  if (!neighborhood) redirect("/neighborhood");

  await supabase
    .from("profiles")
    .update({ neighborhood_id: neighborhoodId })
    .eq("id", user.id);

  revalidatePath("/");
  redirect("/");
}

/**
 * Called from the client with browser geolocation coordinates. Matches them
 * against neighborhood boundaries via PostGIS (find_neighborhood). Returns
 * an error message when nothing matches; redirects home on success.
 */
export async function locateNeighborhood(lat: number, lng: number) {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return { error: "That location didn't look right — try the list below." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("find_neighborhood", {
    lat,
    lng,
  });
  if (error || !data || data.length === 0) {
    return {
      error:
        "We couldn't match your location to a neighborhood yet — pick yours from the list below.",
    };
  }

  await supabase
    .from("profiles")
    .update({ neighborhood_id: data[0].id })
    .eq("id", user.id);

  revalidatePath("/");
  redirect("/");
}
