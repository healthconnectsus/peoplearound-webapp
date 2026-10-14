"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eventWhen } from "@/lib/events";
import { AiRefused } from "@/lib/ai";
import { writeFlyerCopy, type FlyerFacts } from "@/lib/flyer";
import { coerceFlyerCopy, type FlyerCopy } from "@/lib/flyer-copy";
import { defaultFlyerStyle, isFlyerStyle, type FlyerStyleKey } from "@/lib/flyer-styles";

/**
 * Running a project's flyer: publishing the page it points at, asking the
 * assistant for the words, and keeping the steward's own version.
 *
 * Every action re-reads the project through flyer_page() (migration 0082),
 * which answers null to anyone who is not a steward — so the check is the
 * database's, not this file's, and it is the same check the page uses.
 */

/** Everything flyer_page() returns. */
export type StudioDoc = {
  project: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    state: "idea" | "active" | "completed" | "archived";
    help: "local" | "remote" | "both";
    when_text: string | null;
    photo_url: string | null;
    share_code: string | null;
    neighborhood: { name: string; city: string | null } | null;
  } | null;
  stars: number;
  team: number;
  events: {
    title: string;
    starts_at: string;
    ends_at: string | null;
    place: string | null;
    share_code: string | null;
  }[];
  jobs: string[];
  flyer:
    | (FlyerCopy & {
        style: FlyerStyleKey;
        hint: string | null;
        model: string | null;
        generated_at: string | null;
        updated_at: string;
      })
    | null;
};

/**
 * Eight characters from an alphabet with no look-alikes — no I, L, O, 0 or
 * 1 — the same alphabet as event codes (events/actions.ts), because this
 * too ends up read off paper.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newShareCode(): string {
  return Array.from(
    { length: 8 },
    () => ALPHABET[crypto.randomInt(ALPHABET.length)],
  ).join("");
}

const UUID = /^[0-9a-f-]{36}$/i;

function studioPath(projectId: string, query?: Record<string, string>): string {
  const q = query ? `?${new URLSearchParams(query).toString()}` : "";
  return `/projects/${projectId}/flyer${q}`;
}

async function stewardDoc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<StudioDoc | null> {
  const { data } = await supabase.rpc("flyer_page", { p_id: projectId });
  const doc = data as StudioDoc | null;
  return doc?.project ? doc : null;
}

/** Publish (on=1) or unpublish the project's public page. */
export async function setProjectSharing(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!UUID.test(projectId)) redirect("/projects");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!on) {
    // Unpublishing retires the code for good. Anything printed with it stops
    // working, which is the point — and re-publishing later gives a new one,
    // so the button says so.
    const { error } = await supabase.rpc("set_project_sharing", {
      p_id: projectId,
      p_code: null,
    });
    if (error) {
      redirect(studioPath(projectId, { error: "Could not unpublish this project" }));
    }
  } else {
    let done = false;
    for (let attempt = 0; attempt < 4 && !done; attempt++) {
      const { data, error } = await supabase.rpc("set_project_sharing", {
        p_id: projectId,
        p_code: newShareCode(),
      });
      if (!error && typeof data === "string" && data) done = true;
      // 23505 is the one-in-a-trillion collision; anything else is a refusal
      // (not a steward, project gone) and retrying would not help.
      else if (error?.code !== "23505") break;
    }
    if (!done) {
      redirect(studioPath(projectId, { error: "Could not publish this project" }));
    }
  }

  revalidatePath(studioPath(projectId));
  revalidatePath(`/projects/${projectId}`);
  redirect(studioPath(projectId, on ? { published: "1" } : { unpublished: "1" }));
}

/** Ask the assistant for the words, from the project's own facts. */
export async function generateFlyer(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!UUID.test(projectId)) redirect("/projects");
  const hint =
    String(formData.get("hint") ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  const styleRaw = String(formData.get("style") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const doc = await stewardDoc(supabase, projectId);
  if (!doc?.project) redirect(`/projects/${projectId}`);

  // Every call spends real money — the same daily credit as idea shaping
  // (migration 0017). Fails open if the RPC is missing.
  const { data: allowed, error: creditError } = await supabase.rpc("consume_ai_credit");
  if (!creditError && allowed === false) {
    redirect(
      studioPath(projectId, {
        error: "You've reached today's limit for the assistant — the flyer can still be written by hand below",
      }),
    );
  }

  const p = doc.project;
  const facts: FlyerFacts = {
    title: p.title,
    description: p.description,
    category: p.category,
    state: p.state,
    help: p.help,
    when_text: p.when_text,
    community: p.neighborhood,
    events: doc.events.map((e) => ({
      title: e.title,
      when: eventWhen(e.starts_at, e.ends_at),
      place: e.place,
    })),
    jobs: doc.jobs,
    team: doc.team,
    stars: doc.stars,
    hint,
  };

  // redirect() throws, so it stays outside the try.
  let written: Awaited<ReturnType<typeof writeFlyerCopy>> | null = null;
  let failure: string | null = null;
  try {
    written = await writeFlyerCopy(facts);
  } catch (e) {
    console.error("flyer: the assistant failed", e);
    failure =
      e instanceof AiRefused
        ? "The assistant declined this one — try a different note"
        : "The assistant hit a snag — please try again";
  }
  if (!written) redirect(studioPath(projectId, { error: failure ?? "Please try again" }));

  const style: FlyerStyleKey = isFlyerStyle(styleRaw)
    ? styleRaw
    : (doc.flyer?.style ?? defaultFlyerStyle(p.category));

  const now = new Date().toISOString();
  const { error } = await supabase.from("project_flyers").upsert(
    {
      project_id: projectId,
      headline: written.copy.headline,
      subline: written.copy.subline,
      body: written.copy.body,
      bullets: written.copy.bullets,
      cta: written.copy.cta,
      style,
      hint,
      model: written.model,
      generated_at: now,
      updated_at: now,
      updated_by: user.id,
    },
    { onConflict: "project_id" },
  );
  if (error) {
    console.error("flyer: could not save", error);
    redirect(studioPath(projectId, { error: "Could not save the flyer" }));
  }

  revalidatePath(studioPath(projectId));
  revalidatePath(`/projects/${projectId}`);
  redirect(studioPath(projectId, { written: written.model ? "1" : "plain" }));
}

/** The steward's own words and look, kept. */
export async function saveFlyer(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!UUID.test(projectId)) redirect("/projects");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const copy = coerceFlyerCopy({
    headline: formData.get("headline"),
    subline: formData.get("subline"),
    body: formData.get("body"),
    bullets: [formData.get("bullet1"), formData.get("bullet2"), formData.get("bullet3")],
    cta: formData.get("cta"),
  });
  if (!copy) redirect(studioPath(projectId, { error: "A flyer needs a headline" }));

  const styleRaw = String(formData.get("style") ?? "");
  const style: FlyerStyleKey = isFlyerStyle(styleRaw) ? styleRaw : "teal";

  const { error } = await supabase.from("project_flyers").upsert(
    {
      project_id: projectId,
      headline: copy.headline,
      subline: copy.subline,
      body: copy.body,
      bullets: copy.bullets,
      cta: copy.cta,
      style,
      // Edited by hand: it is the steward's now, whoever drafted it.
      model: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "project_id" },
  );
  if (error) {
    console.error("flyer: could not save", error);
    redirect(studioPath(projectId, { error: "Could not save the flyer — are you a steward of this project?" }));
  }

  revalidatePath(studioPath(projectId));
  revalidatePath(`/projects/${projectId}`);
  redirect(studioPath(projectId, { saved: "1" }));
}
