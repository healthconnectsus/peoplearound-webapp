"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ops actions for /admin. Every action re-verifies profiles.is_admin on the
 * session user before touching anything with the service role — the page
 * gate alone is not the security boundary.
 */

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/");
  const admin = createAdminClient();
  if (!admin) redirect("/admin?error=Service+role+not+configured");
  return admin;
}

/** Clear all flags on a project (reviewed, nothing wrong). */
export async function dismissFlags(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/admin");
  const admin = await requireAdmin();
  await admin.from("project_flags").delete().eq("project_id", projectId);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Quietly archive a project (never "failed") and clear its flags. */
export async function archiveProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/admin");
  const admin = await requireAdmin();
  await admin.from("projects").update({ state: "archived" }).eq("id", projectId);
  await admin.from("project_flags").delete().eq("project_id", projectId);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Rename a community / set its city (frontier cleanup). */
export async function renameCommunity(formData: FormData) {
  const id = String(formData.get("communityId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  if (!id || !name) redirect("/admin");
  const admin = await requireAdmin();
  await admin
    .from("neighborhoods")
    .update({ name, city: city || null })
    .eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Delete a community — only when it has no members and no projects. */
export async function deleteCommunity(formData: FormData) {
  const id = String(formData.get("communityId") ?? "");
  if (!id) redirect("/admin");
  const admin = await requireAdmin();
  const [{ count: members }, { count: projects }] = await Promise.all([
    admin
      .from("community_members")
      .select("user_id", { count: "exact", head: true })
      .eq("community_id", id),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", id),
  ]);
  if ((members ?? 0) === 0 && (projects ?? 0) === 0) {
    await admin.from("neighborhoods").delete().eq("id", id);
  }
  revalidatePath("/admin");
  redirect("/admin");
}
