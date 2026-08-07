import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTRIBUTION_TYPE_META, type ContributionType } from "@/lib/projects";

/**
 * Reputation — assembled, never declared (PRD §3.5).
 *
 * Everything here is DERIVED from confirmed contributions and the
 * attestations behind them. There is no skills table, no endorsements, no
 * public score: a "skill" is a count of work other people confirmed, and a
 * summary line is a sentence about what actually happened. Ranking by
 * acknowledged impact, never volume of activity; surfaced contextually,
 * never as a leaderboard.
 */

export type Skill = {
  type: ContributionType;
  label: string;
  emoji: string;
  count: number;
  attesters: number; // distinct neighbors who confirmed this kind of work
};

export type Reputation = {
  skills: Skill[];
  confirmed: number;
  attesters: number; // distinct people who ever confirmed your work
  projects: number; // distinct projects you helped
  categories: string[]; // project categories you've worked in
  summary: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any -- accepts ssr + js clients */
export async function computeReputation(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Reputation> {
  const { data } = await supabase
    .from("contributions")
    .select(
      "id,type,project_id,project:projects(category),attestations(attester_id)",
    )
    .eq("contributor_id", userId)
    .eq("status", "confirmed");

  const rows = (data ?? []) as unknown as {
    id: string;
    type: ContributionType;
    project_id: string;
    project?: { category: string } | null;
    attestations: { attester_id: string }[];
  }[];

  const byType = new Map<ContributionType, { count: number; who: Set<string> }>();
  const allAttesters = new Set<string>();
  const projects = new Set<string>();
  const categories = new Set<string>();

  for (const r of rows) {
    const entry = byType.get(r.type) ?? { count: 0, who: new Set<string>() };
    entry.count += 1;
    for (const a of r.attestations ?? []) {
      entry.who.add(a.attester_id);
      allAttesters.add(a.attester_id);
    }
    byType.set(r.type, entry);
    projects.add(r.project_id);
    if (r.project?.category) categories.add(r.project.category);
  }

  const skills: Skill[] = [...byType.entries()]
    .map(([type, v]) => ({
      type,
      label: CONTRIBUTION_TYPE_META[type].label,
      emoji: CONTRIBUTION_TYPE_META[type].emoji,
      count: v.count,
      attesters: v.who.size,
    }))
    // Impact-weighted: work confirmed by more distinct neighbors ranks
    // above work merely repeated (never volume for its own sake).
    .sort((a, b) => b.attesters - a.attesters || b.count - a.count);

  const confirmed = rows.length;
  let summary: string | null = null;
  if (confirmed > 0) {
    const top = skills[0];
    const where =
      categories.size === 1
        ? `${[...categories][0]} projects`
        : `${projects.size} project${projects.size === 1 ? "" : "s"}`;
    summary = `Trusted on ${where} — ${top.label.toLowerCase()} confirmed by ${
      allAttesters.size || 1
    } neighbor${allAttesters.size === 1 ? "" : "s"}.`;
  }

  return {
    skills,
    confirmed,
    attesters: allAttesters.size,
    projects: projects.size,
    categories: [...categories],
    summary,
  };
}
