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
  searchParams: Promise<{ error?: string; playbook?: string }>;
}) {
  const { error, playbook } = await searchParams;
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
        {/* Top-left, ahead of the title in both reading and tab order: the
            way out is the first thing you find, not something you hunt for. */}
        <CloseWizard />
        <h1 className="mb-6 mt-3 text-3xl font-extrabold tracking-tight">
          Start something with people ✨
        </h1>
        <IdeaForm
          error={error}
          userId={user.id}
          center={center}
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
