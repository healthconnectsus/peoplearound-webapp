"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CONTRIBUTION_TYPES,
  PROJECT_STATES,
  TRANSITIONS,
  type ContributionType,
  type ProjectState,
} from "@/lib/projects";

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

  // A project lives in its founder's neighborhood (stamped by DB trigger),
  // so having one is a prerequisite. RLS enforces this too.
  const { data: profile } = await supabase
    .from("profiles")
    .select("neighborhood_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.neighborhood_id) redirect("/neighborhood");

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

// ------------------------------------------------------------------
// Contributions — the trust core. A teammate logs, the founder accepts,
// a second person attests → confirmed. RLS enforces every rule; the
// checks here only produce friendlier behavior. The logged → confirmed
// transition lives exclusively in the reconcile_contributions() database
// function (security definer) — never in client-writable SQL.
// ------------------------------------------------------------------
export async function logContribution(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const type = String(formData.get("type") ?? "") as ContributionType;
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 1000);
  if (!projectId) redirect("/");
  if (!CONTRIBUTION_TYPES.includes(type) || !description) {
    redirect(`/projects/${projectId}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Accepted teammates only — the founder never logs their own credit.
  const { data: membership } = await supabase
    .from("memberships")
    .select("status")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.status !== "accepted") {
    redirect(`/projects/${projectId}`);
  }

  await supabase.from("contributions").insert({
    project_id: projectId,
    contributor_id: user.id,
    type,
    description,
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function withdrawContribution(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");
  if (!projectId || !contributionId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: only the contributor or founder, and only while still 'logged'.
  await supabase.from("contributions").delete().eq("id", contributionId);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function acceptContribution(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");
  if (!projectId || !contributionId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: founder only, never their own work, logged → accepted only.
  await supabase
    .from("contributions")
    .update({ status: "accepted" })
    .eq("id", contributionId);

  // If a witness already attested, this promotes it straight to confirmed.
  await supabase.rpc("reconcile_contributions", { p_project_id: projectId });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

// ------------------------------------------------------------------
// Events — physical coordination. The founder creates; anyone RSVPs
// with a single lightweight "joining" signal. Absence is never recorded.
// ------------------------------------------------------------------
export async function createEvent(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "")
    .trim()
    .slice(0, 140);
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const place = String(formData.get("place") ?? "")
    .trim()
    .slice(0, 200);
  if (!projectId) redirect("/");

  // datetime-local gives naive "YYYY-MM-DDTHH:mm"; store it verbatim as the
  // neighborhood-local time (see formatEventTime in lib/projects.ts).
  const startsAt = `${startsAtRaw.slice(0, 16)}:00Z`;
  if (!title || Number.isNaN(Date.parse(startsAt))) {
    redirect(`/projects/${projectId}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Founder-only. RLS also enforces this; check here for correct behavior.
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  await supabase.from("events").insert({
    project_id: projectId,
    title,
    starts_at: startsAt,
    place,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

export async function deleteEvent(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!projectId || !eventId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS guarantees only the founder can delete.
  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

export async function toggleRsvp(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!projectId || !eventId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Withdrawing a signal, never a penalty — the row simply goes away.
    await supabase
      .from("rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("rsvps")
      .insert({ event_id: eventId, user_id: user.id });
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function attestContribution(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");
  if (!projectId || !contributionId) redirect(`/projects/${projectId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: teammates/stargazers only, never your own work, never the founder.
  await supabase
    .from("attestations")
    .upsert(
      { contribution_id: contributionId, attester_id: user.id },
      { onConflict: "contribution_id,attester_id", ignoreDuplicates: true },
    );

  await supabase.rpc("reconcile_contributions", { p_project_id: projectId });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
