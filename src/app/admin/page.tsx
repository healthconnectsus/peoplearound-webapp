import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { timeAgo } from "@/lib/projects";
import {
  archiveProject,
  deleteCommunity,
  dismissFlags,
  renameCommunity,
} from "./adminActions";

/**
 * Ops console — visible only to profiles.is_admin. Replaces SQL-editor
 * moderation: the flag review queue, community cleanup (frontier renames),
 * and a health strip. Every action here is a human decision, in keeping
 * with "nothing is auto-hidden."
 */

const INPUT =
  "rounded-lg border border-slate-400 bg-transparent px-3 py-1.5 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-slate-400";
const PILL =
  "rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) notFound();

  const admin = createAdminClient();
  if (!admin) {
    return (
      <AppShell>
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
          <p className="mt-4 text-sm text-red-600">
            SUPABASE_SERVICE_ROLE_KEY is not configured.
          </p>
        </main>
      </AppShell>
    );
  }

  const [
    { data: flagRows },
    { data: hoods },
    { count: userCount },
    { count: projectCount },
    { count: flagCount },
  ] = await Promise.all([
    admin
      .from("project_flags")
      .select(
        "project_id,reason,note,created_at,project:projects(id,title,state,owner:profiles!projects_owner_id_fkey(display_name)),flagger:profiles!project_flags_user_id_fkey(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("neighborhoods")
      .select("id,name,city,kind,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
    admin.from("project_flags").select("project_id", { count: "exact", head: true }),
  ]);

  // Group flags per project for the queue.
  type FlagRow = {
    project_id: string;
    reason: string;
    note: string | null;
    created_at: string;
    project?: {
      id: string;
      title: string;
      state: string;
      owner?: { display_name: string | null } | null;
    } | null;
    flagger?: { display_name: string | null } | null;
  };
  const byProject = new Map<string, FlagRow[]>();
  for (const f of (flagRows ?? []) as unknown as FlagRow[]) {
    const arr = byProject.get(f.project_id) ?? [];
    arr.push(f);
    byProject.set(f.project_id, arr);
  }
  const queue = [...byProject.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  // Member counts per community (one query, tallied here).
  const { data: memberRows } = await admin
    .from("community_members")
    .select("community_id");
  const memberCount = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCount.set(m.community_id, (memberCount.get(m.community_id) ?? 0) + 1);
  }

  return (
    <AppShell>
      <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Ops console — only admins see this. Every decision here is a human
          one.
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {/* Health strip */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Neighbors", value: userCount ?? 0 },
            { label: "Projects", value: projectCount ?? 0 },
            { label: "Open flags", value: flagCount ?? 0 },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-300 bg-white p-4 text-center shadow-sm dark:border-slate-600 dark:bg-zinc-900"
            >
              <p className="text-2xl font-extrabold">{s.value}</p>
              <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Flag queue */}
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Flag review queue · {queue.length}
          </h2>
          {queue.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
              Nothing to review. 🎉
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {queue.map(([projectId, flags]) => {
                const project = flags[0].project;
                return (
                  <li
                    key={projectId}
                    className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/projects/${projectId}`}
                        className="font-semibold hover:underline"
                      >
                        {project?.title ?? "(deleted project)"}
                      </Link>
                      <span className="text-xs text-black/45 dark:text-white/45">
                        by {project?.owner?.display_name ?? "?"} ·{" "}
                        {flags.length} flag{flags.length === 1 ? "" : "s"} ·{" "}
                        {project?.state}
                      </span>
                    </div>
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
                      {flags.map((f, i) => (
                        <li key={i}>
                          🚩 <span className="font-medium">{f.reason}</span>
                          {f.note ? ` — “${f.note}”` : ""}{" "}
                          <span className="text-xs text-black/40 dark:text-white/40">
                            · {f.flagger?.display_name ?? "?"} ·{" "}
                            {timeAgo(f.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={dismissFlags}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <button type="submit" className={PILL}>
                          ✓ Looks fine — clear flags
                        </button>
                      </form>
                      <form action={archiveProject}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <ConfirmSubmit
                          message="Quietly archive this project? It disappears from feeds; the founder keeps their history."
                          className={PILL}
                        >
                          Archive project
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Communities */}
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Communities · newest first
          </h2>
          <ul className="flex flex-col gap-2">
            {((hoods ?? []) as {
              id: string;
              name: string;
              city: string | null;
              kind: string;
              created_by: string | null;
              created_at: string;
            }[]).map((h) => {
              const members = memberCount.get(h.id) ?? 0;
              return (
                <li
                  key={h.id}
                  className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
                >
                  <form
                    action={renameCommunity}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="communityId" value={h.id} />
                    <input
                      name="name"
                      defaultValue={h.name}
                      className={`${INPUT} w-44`}
                      aria-label="Community name"
                    />
                    <input
                      name="city"
                      defaultValue={h.city ?? ""}
                      placeholder="City"
                      className={`${INPUT} w-32`}
                      aria-label="City"
                    />
                    <span className="text-xs text-black/45 dark:text-white/45">
                      {h.kind} · {members} member{members === 1 ? "" : "s"} ·{" "}
                      {timeAgo(h.created_at)}
                    </span>
                    <button type="submit" className={PILL}>
                      Save
                    </button>
                  </form>
                  {members === 0 ? (
                    <form action={deleteCommunity} className="mt-2">
                      <input type="hidden" name="communityId" value={h.id} />
                      <ConfirmSubmit
                        message="Delete this empty community?"
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete (empty)
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
