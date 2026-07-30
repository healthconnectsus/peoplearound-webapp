import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { signOut } from "@/app/login/actions";
import { updateDisplayName } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name,neighborhood:neighborhoods(name,city)")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as unknown as {
    display_name: string | null;
    neighborhood?: { name: string; city: string | null } | null;
  } | null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-xl flex-1 p-4 lg:py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        {error ? (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900">
          <h2 className="font-medium">Profile</h2>
          <form action={updateDisplayName} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              Display name
              <input
                type="text"
                name="displayName"
                defaultValue={profile?.display_name ?? ""}
                maxLength={60}
                required
                className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none transition-colors focus:border-emerald-600 dark:border-white/20"
              />
            </label>
            <p className="text-xs text-black/45 dark:text-white/45">
              This is how neighbors see you across projects and teams.
            </p>
            <button
              type="submit"
              className="self-start rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Save changes
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900">
          <h2 className="font-medium">Account</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-black/50 dark:text-white/50">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50 dark:text-white/50">Neighborhood</dt>
              <dd>
                {profile?.neighborhood?.name ?? "Not set"}{" "}
                <Link
                  href="/neighborhood"
                  className="text-emerald-700 underline dark:text-emerald-400"
                >
                  Change
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </main>
    </AppShell>
  );
}
