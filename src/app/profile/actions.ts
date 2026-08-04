"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permanently deletes the CALLER'S OWN account. The auth user row is removed
 * via the admin API; every foreign key cascades from there (profile →
 * projects, stars, memberships, contributions, attestations, rsvps, …).
 * Only ever operates on the authenticated session's own user id.
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  if (!admin) {
    redirect(
      `/profile?error=${encodeURIComponent("Account deletion isn't configured on this server.")}`,
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(
      `/profile?error=${encodeURIComponent("Couldn't delete the account — please try again.")}`,
    );
  }

  // Clear the local session cookies; the user no longer exists server-side.
  await supabase.auth.signOut();
  redirect(
    `/login?message=${encodeURIComponent("Your account and all of its data have been deleted.")}`,
  );
}
