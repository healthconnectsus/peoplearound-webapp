import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { AsksSection } from "@/components/AsksSection";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Small help" };

/**
 * Small help — "a hand for 20 minutes" — on a page of its own.
 *
 * It used to be a section at the bottom of the home feed, which made the
 * feed long and the asks hard to find. The chooser's "I need a favor" door
 * lands here with the form open; the offers board links here for the
 * opposite direction.
 */
async function AsksPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string }>;
}) {
  const { compose } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Small help</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">
        Twenty minutes, a second pair of hands, someone with a dolly. Asking is
        not a favor you owe back. Have something to give instead?{" "}
        <Link href="/offers" className="underline">
          Post an offer
        </Link>
        .
      </p>
      <AsksSection userId={user.id} startOpen={compose === "1"} />
    </main>
  );
}

export default function Page(props: Parameters<typeof AsksPage>[0]) {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <AsksPage {...props} />
      </Suspense>
    </AppShell>
  );
}
