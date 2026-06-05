import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { versionLabel } from "@/lib/version";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards this route, but guard here too as defense in depth.
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-600">
        Peoplearound
      </h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Signed in as <span className="font-medium">{user.email}</span>
      </p>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </form>

      <footer className="text-xs text-black/40 dark:text-white/40">
        {versionLabel()}
      </footer>
    </main>
  );
}
