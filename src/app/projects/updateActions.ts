"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Project updates — the build log. The founder or an accepted teammate
 * posts short progress notes that land in the project's history timeline.
 * RLS enforces who may post; these actions just shape the input.
 */

export async function postUpdate(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "")
    .trim()
    .slice(0, 2000);
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  if (!projectId) redirect("/");
  if (!body) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("project_updates").insert({
    project_id: projectId,
    author_id: user.id,
    body,
    photo_url: photoUrl || null,
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function deleteUpdate(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const updateId = String(formData.get("updateId") ?? "");
  if (!projectId || !updateId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: author or founder only.
  await supabase.from("project_updates").delete().eq("id", updateId);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

/** Founder sets or clears the project's cover photo (uploaded client-side). */
export async function setProjectPhoto(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const photoUrl = String(formData.get("photoUrl") ?? "").trim().slice(0, 500);
  if (!projectId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: owners update their own projects.
  await supabase
    .from("projects")
    .update({ photo_url: photoUrl || null })
    .eq("id", projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

/** Founder dismisses a private gardener nudge. */
export async function dismissNudge(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("project_nudges")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("project_id", projectId);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
