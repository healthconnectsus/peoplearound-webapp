"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATES, TRANSITIONS, type ProjectState } from "@/lib/projects";

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "community").trim();
  const requested = String(formData.get("state") ?? "idea") as ProjectState;

  if (!title) {
    redirect(
      `/projects/new?error=${encodeURIComponent("Title is required.")}`,
    );
  }
  // Projects may only be created as idea or active.
  const state: ProjectState = requested === "active" ? "active" : "idea";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title, description, category, state })
    .select("id")
    .single();

  if (error) {
    redirect(`/projects/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect(`/projects/${data.id}`);
}

export async function setProjectState(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const next = String(formData.get("state") ?? "") as ProjectState;
  if (!projectId || !PROJECT_STATES.includes(next)) {
    redirect(`/projects/${projectId}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("state, owner_id")
    .eq("id", projectId)
    .single();

  // Owner-only, and only along an allowed transition.
  if (!project || project.owner_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }
  if (!TRANSITIONS[project.state as ProjectState].includes(next)) {
    redirect(`/projects/${projectId}`);
  }

  await supabase.from("projects").update({ state: next }).eq("id", projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS guarantees only the owner can delete.
  await supabase.from("projects").delete().eq("id", projectId);

  revalidatePath("/");
  redirect("/");
}

// ------------------------------------------------------------------
// Stars — the lightweight "I'd be glad this existed" signal.
// ------------------------------------------------------------------
export async function toggleStar(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("stars")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("stars")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("stars")
      .insert({ project_id: projectId, user_id: user.id });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

// ------------------------------------------------------------------
// Memberships — request to join, leave, and owner approval.
// ------------------------------------------------------------------
export async function requestJoin(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Owners are the implicit founder — they never request to join their own.
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id === user.id) {
    redirect(`/projects/${projectId}`);
  }

  // Idempotent: a new request always starts pending.
  await supabase
    .from("memberships")
    .upsert(
      { project_id: projectId, user_id: user.id, status: "pending" },
      { onConflict: "project_id,user_id", ignoreDuplicates: true },
    );

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function leaveProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Deletes the caller's own membership (pending request or accepted seat).
  await supabase
    .from("memberships")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function respondToMembership(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const memberId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!projectId || !memberId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Owner-only. RLS also enforces this; check here for correct behavior.
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  if (decision === "accept") {
    await supabase
      .from("memberships")
      .update({ status: "accepted" })
      .eq("project_id", projectId)
      .eq("user_id", memberId);
  } else {
    // Decline a request or remove an existing member.
    await supabase
      .from("memberships")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", memberId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}
