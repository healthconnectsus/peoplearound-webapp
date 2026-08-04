import { AppShell } from "@/components/AppShell";
import { IdeaForm } from "./IdeaForm";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AppShell>
      <main className="w-full max-w-xl flex-1 p-4 lg:px-8 lg:py-6">
        <h1 className="mb-1 text-xl font-semibold">Share your idea 💡</h1>
        <p className="mb-6 text-sm text-black/60 dark:text-white/60">
          Tell the people around you what you want to build. They can star it,
          or ask to join and help make it happen.
        </p>
        <IdeaForm error={error} />
      </main>
    </AppShell>
  );
}
