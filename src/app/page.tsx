import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ipHash, registerFrontierLocation } from "@/lib/frontier";
import { createClient } from "@/lib/supabase/server";

/**
 * The front door. Every signed-in visit to peoplearound.com passes through
 * here exactly once per session-worth-of-onboarding-state: invite
 * attribution (pa-via cookie), silent neighborhood claim or frontier
 * registration (pa-hood / pa-frontier cookies, set by the logged-out
 * AutoLocate flow), then a handoff to the default page.
 *
 * The default page is People around, not Explore — "what's happening among
 * people I've actually joined" beats "what's interesting" as a first
 * impression. Explore (src/app/explore/page.tsx) still exists, one rail tap
 * away, for browsing your city and beyond.
 */
export default async function Root() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("neighborhood_id,invited_by")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as {
    neighborhood_id: string | null;
    invited_by: string | null;
  } | null;

  // Invite attribution: if this account arrived through someone's personal
  // link (pa-via cookie), record who brought them — once, never overwritten.
  if (profile && profile.invited_by == null) {
    const store = await cookies();
    const via = store.get("pa-via")?.value ?? "";
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(via) &&
      via !== user.id
    ) {
      const { data: inviter } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", via)
        .maybeSingle();
      if (inviter) {
        await supabase
          .from("profiles")
          .update({ invited_by: via })
          .eq("id", user.id);
      }
    }
  }

  if (!profile?.neighborhood_id) {
    // First visit after sign-up: if the logged-out landing page already
    // matched their location to a neighborhood (pa-hood cookie, set by
    // AutoLocate), claim it silently instead of asking again.
    const store = await cookies();
    const guess = store.get("pa-hood")?.value ?? "";
    let claimId: string | null = null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guess)) {
      const { data: hood } = await supabase
        .from("neighborhoods")
        .select("id")
        .eq("id", guess)
        .maybeSingle();
      if (hood) claimId = hood.id;
    }

    // Or: the landing page previewed a place we don't cover yet
    // (pa-frontier cookie). Now that a real account exists, register it —
    // this is the moment a new location earns its directory entry and the
    // ops alert fires.
    if (!claimId) {
      const frontier = store.get("pa-frontier")?.value ?? "";
      const parts = frontier.split(",").map(Number);
      if (
        parts.length === 2 &&
        parts.every(Number.isFinite) &&
        Math.abs(parts[0]) <= 90 &&
        Math.abs(parts[1]) <= 180
      ) {
        const [lat, lng] = parts;
        // Someone may have covered it since the preview — match first.
        const { data: match } = await supabase.rpc("locate_teaser", { lat, lng });
        const found = (match as { id: string }[] | null)?.[0];
        if (found) {
          claimId = found.id;
        } else {
          const hdrs = await headers();
          const ip =
            hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
          const result = await registerFrontierLocation(
            lat,
            lng,
            ipHash(ip),
            user.email ?? null,
          );
          if (result.ok) claimId = result.id;
        }
      }
    }

    if (claimId) {
      await supabase
        .from("profiles")
        .update({ neighborhood_id: claimId })
        .eq("id", user.id);
      await supabase
        .from("community_members")
        .upsert(
          { community_id: claimId, user_id: user.id },
          { onConflict: "community_id,user_id", ignoreDuplicates: true },
        );
      redirect("/people");
    }
    redirect("/neighborhood");
  }

  redirect("/people");
}
