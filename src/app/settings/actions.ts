"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves whichever profile fields the submitting form included. Each section
 * of the Edit Profile page is its own small form (Nextdoor-style), so we
 * only touch keys present in the FormData.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, unknown> = {};

  if (formData.has("displayName")) {
    const v = String(formData.get("displayName") ?? "").trim();
    if (!v) redirect("/settings?error=Enter a display name");
    updates.display_name = v.slice(0, 60);
  }
  if (formData.has("bio")) {
    updates.bio = String(formData.get("bio") ?? "").trim().slice(0, 500) || null;
  }
  if (formData.has("gender")) {
    updates.gender = String(formData.get("gender") ?? "") || null;
  }
  if (formData.has("pronouns")) {
    updates.pronouns = String(formData.get("pronouns") ?? "") || null;
    updates.show_pronouns = formData.get("showPronouns") === "on";
  }
  if (formData.has("website")) {
    let v = String(formData.get("website") ?? "").trim();
    if (v && !/^https?:\/\//i.test(v)) v = `https://${v}`;
    updates.website = v.slice(0, 200) || null;
  }
  if (formData.has("hometown")) {
    updates.hometown =
      String(formData.get("hometown") ?? "").trim().slice(0, 40) || null;
  }

  if (Object.keys(updates).length === 0) redirect("/settings");

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    const hint = /column|schema/i.test(error.message)
      ? "Database migration 0010 hasn't been applied yet — run supabase/migrations/0010_profile_fields.sql in the Supabase SQL editor."
      : error.message;
    redirect(`/settings?error=${encodeURIComponent(hint)}`);
  }

  revalidatePath("/", "layout");
  redirect("/settings?message=Saved");
}
