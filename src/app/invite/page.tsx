import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { CopyLinkButton } from "./CopyLinkButton";

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: neighborCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return (
    <AppShell>
      <main className="w-full max-w-xl flex-1 p-4 lg:py-6 lg:pl-16 lg:pr-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Invite neighbors
        </h1>
        <div className="mt-6 rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm dark:border-white/5 dark:bg-zinc-900">
          <p className="text-4xl" aria-hidden>
            🏘️
          </p>
          <p className="mt-4 font-medium">
            Every neighbor makes this place more useful
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-black/60 dark:text-white/60">
            More people means more ideas, more stars, more hands on planting
            day. Send friends and neighbors your invite link — signing up takes
            a minute.
            {neighborCount
              ? ` ${neighborCount} people are already here.`
              : ""}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <CopyLinkButton userId={user.id} />
            <a
              href={`mailto:?subject=${encodeURIComponent("Join me on Peoplearound")}&body=${encodeURIComponent("I'm on Peoplearound — a place where neighbors share ideas and build them together. Join me!")}`}
              className="rounded-full border border-black/15 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Invite by email
            </a>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
