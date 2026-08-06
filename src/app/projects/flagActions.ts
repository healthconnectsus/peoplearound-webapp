"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Community moderation: a neighbor flags a project. At the review threshold
 * (3 distinct flaggers) ops gets one email so a human can look at it —
 * nothing is auto-hidden, because removal is always a human decision.
 */

const REVIEW_THRESHOLD = 3;
const ALERT_TO = process.env.ALERT_EMAIL ?? "peoplearound.alexandre@gmail.com";
const ALERT_FROM =
  process.env.ALERT_FROM ?? "Peoplearound <onboarding@resend.dev>";

const REASONS = ["spam", "harassment", "unsafe", "not_local", "other"] as const;

async function notifyOps(projectId: string) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data } = await admin.rpc("flag_review", {
    p_project_id: projectId,
    p_threshold: REVIEW_THRESHOLD,
  });
  const review = (
    data as
      | {
          flag_count: number;
          project_title: string;
          owner_name: string;
          community_name: string;
          reasons: string;
        }[]
      | null
  )?.[0];
  // Below threshold → nothing to review yet.
  if (!review) return;
  // Only email on the exact crossing, so ops gets one alert per project.
  if (review.flag_count !== REVIEW_THRESHOLD) return;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[flags] RESEND_API_KEY not set — skipping review alert");
    return;
  }
  const url = `https://peoplearound.com/projects/${projectId}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_TO],
      subject: `🚩 Needs a community admin: “${review.project_title}”`,
      html: [
        `<h2>A project reached the review threshold</h2>`,
        `<p><strong>${review.flag_count} neighbors</strong> flagged this project, so it needs a human look:</p>`,
        `<ul>`,
        `<li><strong>Project:</strong> <a href="${url}">${review.project_title}</a></li>`,
        `<li><strong>Founder:</strong> ${review.owner_name}</li>`,
        `<li><strong>Community:</strong> ${review.community_name}</li>`,
        `<li><strong>Reasons given:</strong> ${review.reasons}</li>`,
        `</ul>`,
        `<p>Nothing was hidden automatically — the project is still live. Review it and decide: leave it, talk to the founder, or archive it.</p>`,
      ].join(""),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.warn("[flags] review email failed:", await res.text());
  }
}

export async function flagProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const reasonRaw = String(formData.get("reason") ?? "other");
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 500);
  if (!projectId) redirect("/");
  const reason = (REASONS as readonly string[]).includes(reasonRaw)
    ? reasonRaw
    : "other";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: own row only, never your own project, one flag per project.
  const { error } = await supabase.from("project_flags").insert({
    project_id: projectId,
    user_id: user.id,
    reason,
    note: note || null,
  });

  if (!error) {
    await notifyOps(projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?flagged=1`);
}

export async function unflagProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("project_flags")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
