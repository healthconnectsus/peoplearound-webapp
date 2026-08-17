import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdeaForm } from "./IdeaForm";
import { CloseWizard } from "./CloseWizard";
import { playbookBySlug } from "@/lib/playbooks";
import { myMapCenter } from "@/lib/mapPins";

/**
 * The wizard is a lightbox, not a page in the shell: no rail, no top bar,
 * nothing to click but the work in front of you and the X that leaves. It
 * covers the viewport rather than scrolling under the chrome, because
 * "starting something" deserves the whole screen for the two minutes it
 * takes.
 */

/** Must match the trigger in migration 0017 — the DB stays the enforcer. */
const PROJECTS_PER_DAY = 10;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; playbook?: string; intent?: string }>;
}) {
  const { error, playbook, intent } = await searchParams;
  const pb = playbook ? playbookBySlug(playbook) : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The wall belongs at the door: the 0017 trigger would reject the insert
  // anyway, but only after someone wrote a whole post and pressed Share —
  // and the error redirect loses the draft. Say it now instead (0038;
  // fails open pre-migration so the wizard keeps working).
  const { data: usedToday } = await supabase.rpc("my_action_count", {
    p_action: "project",
  });
  const capReached =
    typeof usedToday === "number" && usedToday >= PROJECTS_PER_DAY;

  const center = await myMapCenter(supabase, user.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 lg:px-10">
        {/* Pinned to the page's top-left corner, ahead of the title in tab
            order: the way out is the first thing you find. The container
            keeps left padding so content clears it. */}
        <CloseWizard />
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight lg:pl-14">
          Start something with people ✨
        </h1>
        {capReached ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-3xl" aria-hidden>
              🌱
            </p>
            <p className="mt-3 font-semibold">
              You&rsquo;ve planted a lot today
            </p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Ideas are capped at {PROJECTS_PER_DAY} a day so the feed stays
              a neighborhood, not a firehose. Yours will keep — come back
              tomorrow, or spend today rallying people around the ones you
              already started.
            </p>
          </div>
        ) : (
          <IdeaForm
            error={error}
            userId={user.id}
            center={center}
            initialIntent={
              intent === "meet" || intent === "community" || intent === "personal"
                ? intent
                : null
            }
            playbook={
              pb
                ? {
                    title: pb.title,
                    description: pb.description,
                    category: pb.category,
                    help: pb.help,
                    tip: pb.firstStep,
                  }
                : null
            }
          />
        )}
      </div>
    </div>
  );
}
