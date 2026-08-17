import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The private impact score (PRD §3.10) — the last piece of the recognition
 * layer. A personal sense of progress, like a fitness streak.
 *
 * Rules it inherits from the trust core:
 *  • Accrues ONLY from confirmed contributions. Nothing you can do alone —
 *    logging in, posting, starring — moves it. The anti-gaming boundary is
 *    the same one the whole product stands on: worth is acknowledged by
 *    others, never self-declared.
 *  • Impact-weighted, not volume-weighted. Work more neighbors attested,
 *    work that helped a project actually finish, and work that arrived
 *    early (when a project most needs momentum) count for more than the
 *    same contribution repeated.
 *  • Private. It renders on /analytics for you; there is no leaderboard,
 *    no comparison, and no public field anywhere.
 *
 * The formula is deliberately simple enough to print, because a score you
 * can't explain reads as a slot machine:
 *    10 × confirmed
 *  +  5 × each distinct attestation (capped at 3 per contribution)
 *  + 10 × contributions on projects that reached completion
 *  +  5 × contributions made in a project's first 14 days
 */

export type Impact = {
  total: number;
  confirmed: number;
  /** The printed formula, line by line. */
  parts: {
    base: number;
    attested: number;
    completed: number;
    early: number;
  };
};

const EARLY_DAYS = 14;
const ATTESTER_CAP = 3;

/* eslint-disable @typescript-eslint/no-explicit-any -- accepts ssr + js clients */
export async function computeImpact(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Impact> {
  const { data } = await supabase
    .from("contributions")
    .select(
      "id,created_at,project:projects(state,created_at),attestations(attester_id)",
    )
    .eq("contributor_id", userId)
    .eq("status", "confirmed");

  const rows = (data ?? []) as unknown as {
    id: string;
    created_at: string;
    project?: { state: string; created_at: string } | null;
    attestations: { attester_id: string }[];
  }[];

  let base = 0;
  let attested = 0;
  let completed = 0;
  let early = 0;

  for (const r of rows) {
    base += 10;

    const distinct = new Set((r.attestations ?? []).map((a) => a.attester_id));
    attested += 5 * Math.min(distinct.size, ATTESTER_CAP);

    if (r.project?.state === "completed") completed += 10;

    if (r.project?.created_at) {
      const ageAtContribution =
        new Date(r.created_at).getTime() -
        new Date(r.project.created_at).getTime();
      if (ageAtContribution <= EARLY_DAYS * 86400_000) early += 5;
    }
  }

  return {
    total: base + attested + completed + early,
    confirmed: rows.length,
    parts: { base, attested, completed, early },
  };
}
