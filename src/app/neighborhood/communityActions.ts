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
  redirect(`/people?error=${encodeURIComponent(message)}#communities`);
}

/**
 * Where to land after joining or leaving.
 *
 * These actions were written when /people was the only place you could join
 * a community, so they hard-redirected there. Joining from the Explore
 * directory would throw you onto a different page mid-browse — pass the path
 * you're on and you stay put.
 */
function landing(formData: FormData, fallback: string): string {
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  return returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : fallback;
}

export async function joinCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) redirect("/people#communities");
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("community_members")
    .upsert(
      { community_id: communityId, user_id: user.id },
      { onConflict: "community_id,user_id" },
    );

  const { data: profile } = await supabase
    .from("profiles")
    .select("neighborhood_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // Pre-migration-0011 fallback: community_members doesn't exist yet, but
    // setting the primary neighborhood must still work so onboarding never
    // dead-ends. Only surface the migration error when we can't even do that.
    const migrationMissing = /relation|does not exist|schema/i.test(
      error.message,
    );
    if (!migrationMissing || profile?.neighborhood_id === communityId) {
      fail(migrationHint(error.message));
    }
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ neighborhood_id: communityId })
      .eq("id", user.id);
    if (profileErr) fail(profileErr.message);
    revalidatePath("/", "layout");
    redirect("/");
  }

  // First community you join becomes your primary automatically.
  if (!profile?.neighborhood_id) {
    await supabase
      .from("profiles")
      .update({ neighborhood_id: communityId })
      .eq("id", user.id);
    revalidatePath("/", "layout");
    redirect("/");
  }

  revalidatePath("/", "layout");
  redirect(landing(formData, "/people?message=Joined#communities"));
}

export async function leaveCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) redirect("/people#communities");
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
  redirect(landing(formData, "/people?message=Left the community#communities"));
}

export async function setPrimaryCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) redirect("/people#communities");
  const { supabase, user } = await requireUser();

  // Must be a real community; make sure membership exists too.
  const { data: community } = await supabase
    .from("neighborhoods")
    .select("id")
    .eq("id", communityId)
    .maybeSingle();
  if (!community) redirect("/people#communities");

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
  redirect("/people?message=Primary community updated#communities");
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
  redirect("/people?message=Community created#communities");
}

function migrationHint(message: string): string {
  return /relation|column|schema|policy/i.test(message)
    ? "Database migration 0011 hasn't been applied yet — run supabase/migrations/0011_communities_and_chats.sql in the Supabase SQL editor."
    : message;
}
