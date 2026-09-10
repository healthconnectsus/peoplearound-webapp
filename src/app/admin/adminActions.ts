"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { importConfiguration, populateCity } from "@/lib/city-events/importer";

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

/** Runs one city now; an all-cities request queues the remainder durably. */
export async function populateEventsNow(formData: FormData) {
  const admin = await requireAdmin();
  const cityId = String(formData.get('cityId') ?? '');
  if (cityId && !/^[0-9a-f-]{36}$/i.test(cityId)) redirect('/admin?error=Invalid+city');
  const config = importConfiguration();
  if (!config.search) redirect('/admin?error=Add+a+SerpApi+key+to+enable+imports');
  if (!cityId) {
    const { error } = await admin.from('event_cities').update({ next_run_at: new Date().toISOString() })
      .eq('enabled', true).is('lease_token', null);
    if (error) redirect('/admin?error=Import+queue+unavailable.+Apply+migration+0045');
  }
  const result = await populateCity(cityId || undefined);
  revalidatePath('/events');
  revalidatePath('/admin');
  const message = result.message + (!cityId ? ' Remaining cities will run from the automatic queue.' : '');
  redirect(`/admin?${result.status === 'error' || result.status === 'not_configured' ? 'error' : 'message'}=${encodeURIComponent(message)}`);
}

export async function configureEventCity(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get('cityId') ?? '');
  const location = String(formData.get('location') ?? '').trim().slice(0, 160);
  if (!id || !location) redirect('/admin?error=City+search+location+is+required');
  const { data, error } = await admin.from('event_cities').update({
    search_location: location, enabled: formData.get('enabled') === 'on',
    sources_checked_at: null, next_run_at: new Date().toISOString(),
  }).eq('id', id).is('lease_token', null).select('id').maybeSingle();
  if (error) redirect('/admin?error=Could+not+save+city+import+settings');
  if (!data) redirect('/admin?error=City+not+found+or+an+import+is+running.+Try+again+after+it+finishes');
  revalidatePath('/admin');
  redirect('/admin?message=City+import+settings+saved');
}
