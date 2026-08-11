import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { IdeaForm } from "./IdeaForm";
import { playbookBySlug } from "@/lib/playbooks";
import { myMapCenter } from "@/lib/mapPins";

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
    <AppShell focus>
      <main className="w-full max-w-[90rem] flex-1 p-4 lg:py-6 lg:pl-6 lg:pr-8">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight">Start something with people ✨</h1>
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
      </main>
    </AppShell>
  );
}
