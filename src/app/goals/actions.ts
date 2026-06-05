"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GOAL_STATES, TRANSITIONS, type GoalState } from "@/lib/goals";

export async function createGoal(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "community").trim();
  const requested = String(formData.get("state") ?? "idea") as GoalState;

  if (!title) {
    redirect(`/goals/new?error=${encodeURIComponent("Title is required.")}`);
  }
  // Goals may only be created as idea or active.
  const state: GoalState = requested === "active" ? "active" : "idea";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("goals")
    .insert({ owner_id: user.id, title, description, category, state })
    .select("id")
    .single();

  if (error) {
    redirect(`/goals/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect(`/goals/${data.id}`);
}

export async function setGoalState(formData: FormData) {
  const goalId = String(formData.get("goalId") ?? "");
  const next = String(formData.get("state") ?? "") as GoalState;
  if (!goalId || !GOAL_STATES.includes(next)) redirect(`/goals/${goalId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goal } = await supabase
    .from("goals")
    .select("state, owner_id")
    .eq("id", goalId)
    .single();

  // Owner-only, and only along an allowed transition.
  if (!goal || goal.owner_id !== user.id) redirect(`/goals/${goalId}`);
  if (!TRANSITIONS[goal.state as GoalState].includes(next)) {
    redirect(`/goals/${goalId}`);
  }

  await supabase.from("goals").update({ state: next }).eq("id", goalId);

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
  redirect(`/goals/${goalId}`);
}

export async function deleteGoal(formData: FormData) {
  const goalId = String(formData.get("goalId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS guarantees only the owner can delete.
  await supabase.from("goals").delete().eq("id", goalId);

  revalidatePath("/");
  redirect("/");
}
