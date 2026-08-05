import { AppShell } from "@/components/AppShell";
import { IdeaForm } from "./IdeaForm";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AppShell focus>
      <main className="w-full max-w-7xl flex-1 p-4 lg:py-6 lg:pl-16 lg:pr-8">
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Start an idea 💡</h1>
        <p className="mb-12 text-sm text-black/60 dark:text-white/60">
          Neighbors can star it — or join you and build it.
        </p>
        <IdeaForm error={error} />
      </main>
    </AppShell>
  );
}
