"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const KINDS = [
  "neighborhood",
  "cultural",
  "hobby",
  "identity",
  "geographic",
  "interest",
  "other",
];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function fail(message: string): never {
  redirect(`/neighborhood?error=${encodeURIComponent(message)}`);
}

export async function joinCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) redirect("/neighborhood");
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("community_members")
    .upsert(
      { community_id: communityId, user_id: user.id },
      { onConflict: "community_id,user_id" },
    );
  if (error) fail(migrationHint(error.message));

  // First community you join becomes your primary automatically.
  const { data: profile } = await supabase
    .from("profiles")
    .select("neighborhood_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.neighborhood_id) {
    await supabase
      .from("profiles")
      .update({ neighborhood_id: communityId })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  redirect("/neighborhood?message=Joined");
}

export async function leaveCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) redirect("/neighborhood");
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("neighborhood_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.neighborhood_id === communityId) {
    fail("Pick a different primary community before leaving this one.");
  }

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);
  if (error) fail(migrationHint(error.message));

  revalidatePath("/", "layout");
  redirect("/neighborhood?message=Left the community");
}

export async function setPrimaryCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) redirect("/neighborhood");
  const { supabase, user } = await requireUser();

  // Must be a real community; make sure membership exists too.
  const { data: community } = await supabase
    .from("neighborhoods")
    .select("id")
    .eq("id", communityId)
    .maybeSingle();
  if (!community) redirect("/neighborhood");

  await supabase
    .from("community_members")
    .upsert(
      { community_id: communityId, user_id: user.id },
      { onConflict: "community_id,user_id" },
    );
  const { error } = await supabase
    .from("profiles")
    .update({ neighborhood_id: communityId })
    .eq("id", user.id);
  if (error) fail(error.message);

  revalidatePath("/", "layout");
  redirect("/neighborhood?message=Primary community updated");
}

export async function createCommunity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "other");
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) fail("Give the community a name");
  if (!KINDS.includes(kind)) fail("Pick a community type");

  const { supabase, user } = await requireUser();

  const { data: created, error } = await supabase
    .from("neighborhoods")
    .insert({
      name: name.slice(0, 80),
      kind,
      city: city.slice(0, 80) || null,
      description: description.slice(0, 300) || null,
    })
    .select("id")
    .single();
  if (error || !created) fail(migrationHint(error?.message ?? "Could not create community"));

  await supabase
    .from("community_members")
    .upsert(
      { community_id: created.id, user_id: user.id },
      { onConflict: "community_id,user_id" },
    );

  revalidatePath("/", "layout");
  redirect("/neighborhood?message=Community created");
}

function migrationHint(message: string): string {
  return /relation|column|schema|policy/i.test(message)
    ? "Database migration 0011 hasn't been applied yet — run supabase/migrations/0011_communities_and_chats.sql in the Supabase SQL editor."
    : message;
}
