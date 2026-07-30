"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    redirect("/settings?error=Enter a display name");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.slice(0, 60) })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/settings?message=Saved");
}
