import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { signOut } from "@/app/login/actions";
import { updateProfile } from "./actions";
import { setDigestOptOut } from "@/app/notificationActions";
import { AvatarUpload, CoverUpload } from "./PhotoUploads";
import { PushToggle } from "@/components/PushToggle";

const GENDER_OPTIONS = [
  "Woman",
  "Man",
  "Non-binary",
  "Prefer to self-describe",
  "Prefer not to say",
];
const PRONOUN_OPTIONS = ["She/her", "He/him", "They/them", "Other"];

const SAVE_BTN =
  "self-end rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700";
const INPUT =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-white/20";

type ProfileRow = {
  display_name: string | null;
  bio?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  show_pronouns?: boolean | null;
  website?: string | null;
  hometown?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  neighborhood?: { name: string; city: string | null } | null;
};

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

  // select("*") keeps this page working before migration 0010 is applied —
  // new columns simply come back undefined.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "*,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name,city)",
    )
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileRow ?? null) as unknown as ProfileRow | null;
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Neighbor";

  return (
    <AppShell>
      <main className="w-full max-w-xl flex-1 p-4 lg:py-6 lg:pl-28 lg:pr-8">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/15 transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Edit profile</h1>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <CoverUpload userId={user.id} coverUrl={profile?.cover_url ?? null} />
          <div className="px-6 pb-6">
            <AvatarUpload
              userId={user.id}
              name={name}
              avatarUrl={profile?.avatar_url ?? null}
            />

            <form action={updateProfile} className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                defaultValue={profile?.display_name ?? ""}
                maxLength={60}
                required
                className={INPUT}
              />
              <button type="submit" className={SAVE_BTN}>
                Save
              </button>
            </form>

            <form action={updateProfile} className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={500}
                defaultValue={profile?.bio ?? ""}
                placeholder="A neighbor who loves building things with people nearby"
                className={`${INPUT} resize-none`}
              />
              <p className="text-right text-xs text-black/40 dark:text-white/40">
                {(profile?.bio ?? "").length}/500
              </p>
              <button type="submit" className={SAVE_BTN}>
                Save
              </button>
            </form>

            <form action={updateProfile} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="gender">
                  Gender identity
                </label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={profile?.gender ?? ""}
                  className={`${INPUT} max-w-xs`}
                >
                  <option value="">Gender identity</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="pronouns">
                  Pronouns
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    id="pronouns"
                    name="pronouns"
                    defaultValue={profile?.pronouns ?? ""}
                    className={`${INPUT} max-w-[10rem]`}
                  >
                    <option value="">Pronouns</option>
                    {PRONOUN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
                    <input
                      type="checkbox"
                      name="showPronouns"
                      defaultChecked={profile?.show_pronouns ?? false}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Display on profile
                  </label>
                </div>
              </div>
              <button type="submit" className={SAVE_BTN}>
                Save
              </button>
            </form>

            <form action={updateProfile} className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="website">
                Website
              </label>
              <input
                id="website"
                name="website"
                type="text"
                inputMode="url"
                placeholder="http://"
                defaultValue={profile?.website ?? ""}
                maxLength={200}
                className={INPUT}
              />
              <button type="submit" className={SAVE_BTN}>
                Save
              </button>
            </form>

            <form action={updateProfile} className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="hometown">
                Hometown
              </label>
              <input
                id="hometown"
                name="hometown"
                type="text"
                defaultValue={profile?.hometown ?? ""}
                maxLength={40}
                className={INPUT}
              />
              <p className="text-right text-xs text-black/40 dark:text-white/40">
                {(profile?.hometown ?? "").length}/40
              </p>
              <button type="submit" className={SAVE_BTN}>
                Save
              </button>
            </form>

            <div className="mt-6 border-t border-black/10 pt-5 dark:border-white/15">
              <p className="text-sm font-medium">Neighborhood</p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {profile?.neighborhood
                  ? profile.neighborhood.city
                    ? `${profile.neighborhood.name} (${profile.neighborhood.city})`
                    : profile.neighborhood.name
                  : "Not set"}
              </p>
              <Link
                href="/neighborhood"
                className="mt-3 inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Update neighborhood
              </Link>
            </div>

            <div className="mt-6 border-t border-black/10 pt-5 dark:border-white/15">
              <p className="text-sm font-semibold">Weekly digest</p>
              <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                One email a week with what moved in your neighborhood — only
                when something actually happened.
              </p>
              <form action={setDigestOptOut} className="mt-2 flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="digest"
                    defaultChecked={!(profile as unknown as { digest_opt_out?: boolean } | null)?.digest_opt_out}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Send me the weekly digest
                </label>
                <button
                  type="submit"
                  className="rounded-full border border-black/15 px-4 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Save
                </button>
              </form>
            </div>

            <div className="mt-6 border-t border-black/10 pt-5 dark:border-white/15">
              <p className="text-sm font-semibold">Notifications on your phone</p>
              <p className="mt-0.5 mb-2 text-xs text-black/50 dark:text-white/50">
                A quiet ping when someone joins your idea, confirms your help,
                or plans something nearby. Never ads, never &ldquo;come back&rdquo;.
              </p>
              <PushToggle
                vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
              />
            </div>

            <div className="mt-6 border-t border-black/10 pt-5 dark:border-white/15">
              <p className="text-sm text-black/50 dark:text-white/50">
                Signed in as {user.email}
              </p>
              <form action={signOut} className="mt-3">
                <button
                  type="submit"
                  className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
