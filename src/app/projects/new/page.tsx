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
      </div>
    </div>
  );
}
