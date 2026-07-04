import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import {
  STATE_META,
  TRANSITIONS,
  categoryMeta,
  timeAgo,
  type Membership,
  type Project,
} from "@/lib/projects";
import {
  deleteProject,
  leaveProject,
  requestJoin,
  respondToMembership,
  setProjectState,
  toggleStar,
} from "../actions";

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("projects")
    .select(
      // profiles is reachable via several FKs now (owner, memberships, stars),
      // so the owner embed must name its constraint explicitly.
      "id,owner_id,title,description,category,state,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const project = data as unknown as Project;
  const isOwner = project.owner_id === user.id;
  const meta = STATE_META[project.state];
  const cat = categoryMeta(project.category);
  const nextStates = TRANSITIONS[project.state];
  const founderName = project.owner?.display_name ?? "Someone";

  // Stars — count + whether the current user has starred.
  const { data: starRows } = await supabase
    .from("stars")
    .select("user_id")
    .eq("project_id", id);
  const stars = starRows ?? [];
  const starCount = stars.length;
  const hasStarred = stars.some((s) => s.user_id === user.id);

  // Memberships — requests and accepted collaborators.
  const { data: memberRows } = await supabase
    .from("memberships")
    .select("user_id,status,created_at,profile:profiles(display_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const members = (memberRows ?? []) as unknown as Membership[];

  const myMembership = members.find((m) => m.user_id === user.id) ?? null;
  const pending = members.filter((m) => m.status === "pending");
  const accepted = members.filter((m) => m.status === "accepted");
  const teamSize = accepted.length + 1; // founder + accepted collaborators

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <Link
          href="/"
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← All projects
        </Link>

        <div className="mt-4 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold leading-snug">
            <span className="mr-2" aria-hidden>
              {cat.emoji}
            </span>
            {project.title}
          </h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>

        <p className="mt-1.5 text-sm text-black/50 dark:text-white/50">
          Started by <span className="font-medium">{founderName}</span>{" "}
          {timeAgo(project.created_at)} · {cat.label}
        </p>

        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          🤝 {teamSize} {teamSize === 1 ? "person" : "people"} building · ⭐{" "}
          {starCount} {starCount === 1 ? "star" : "stars"}
        </p>

        {project.description ? (
          <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">
            {project.description}
          </p>
        ) : (
          <p className="mt-5 text-sm italic text-black/40 dark:text-white/40">
            No description yet.
          </p>
        )}

        {/* Actions: join + star */}
        <div className="mt-7 rounded-2xl border border-black/10 p-4 dark:border-white/10">
          {isOwner ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              This is your project. When neighbors ask to join, their requests
              show up right here.
            </p>
          ) : !myMembership ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              Want to help build this? Ask to join — {founderName} will review
              your request.
            </p>
          ) : myMembership.status === "pending" ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              ⏳ Your request is with {founderName}. You&apos;ll be on the team
              once they accept.
            </p>
          ) : (
            <p className="text-sm text-black/60 dark:text-white/60">
              🎉 You&apos;re on the team — you and {founderName} are building
              this together.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isOwner && !myMembership ? (
              <form action={requestJoin}>
                <input type="hidden" name="projectId" value={project.id} />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  🤝 Ask to join
                </button>
              </form>
            ) : null}

            {!isOwner && myMembership?.status === "pending" ? (
              <form action={leaveProject}>
                <input type="hidden" name="projectId" value={project.id} />
                <button
                  type="submit"
                  className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Cancel my request
                </button>
              </form>
            ) : null}

            {!isOwner && myMembership?.status === "accepted" ? (
              <form action={leaveProject}>
                <input type="hidden" name="projectId" value={project.id} />
                <ConfirmSubmit
                  message="Leave this project?"
                  className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Leave project
                </ConfirmSubmit>
              </form>
            ) : null}

            <form action={toggleStar}>
              <input type="hidden" name="projectId" value={project.id} />
              <button
                type="submit"
                title="A star tells the founder you'd love this to exist"
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  hasStarred
                    ? "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                }`}
              >
                {hasStarred ? "⭐ Starred" : "☆ Star this idea"}
              </button>
            </form>
          </div>
        </div>

        {/* Owner: pending join requests */}
        {isOwner && pending.length > 0 ? (
          <div className="mt-7">
            <h2 className="mb-2 text-sm font-semibold">
              Wants to join ({pending.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {pending.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
                >
                  <span className="text-sm">
                    <span className="font-medium">
                      {m.profile?.display_name ?? "Someone"}
                    </span>{" "}
                    <span className="text-black/40 dark:text-white/40">
                      asked {timeAgo(m.created_at)}
                    </span>
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <form action={respondToMembership}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="userId" value={m.user_id} />
                      <input type="hidden" name="decision" value="accept" />
                      <button
                        type="submit"
                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        ✓ Accept
                      </button>
                    </form>
                    <form action={respondToMembership}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="userId" value={m.user_id} />
                      <input type="hidden" name="decision" value="decline" />
                      <button
                        type="submit"
                        className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* The team */}
        <div className="mt-7">
          <h2 className="mb-2 text-sm font-semibold">The team</h2>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/10">
              <span className="text-sm font-medium">{founderName}</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Founder
              </span>
            </li>
            {accepted.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
              >
                <span className="text-sm">
                  {m.profile?.display_name ?? "Someone"}
                </span>
                {isOwner ? (
                  <form action={respondToMembership}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <input type="hidden" name="decision" value="decline" />
                    <ConfirmSubmit
                      message={`Remove ${m.profile?.display_name ?? "this person"} from the project?`}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Remove
                    </ConfirmSubmit>
                  </form>
                ) : (
                  <span className="text-xs text-black/40 dark:text-white/40">
                    joined {timeAgo(m.created_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {accepted.length === 0 && !isOwner ? (
            <p className="mt-2 text-xs text-black/40 dark:text-white/40">
              No collaborators yet — you could be the first.
            </p>
          ) : null}
        </div>

        {/* Owner: state transitions */}
        {isOwner && nextStates.length > 0 ? (
          <div className="mt-7">
            <h2 className="mb-2 text-sm font-semibold">Update status</h2>
            <div className="flex flex-wrap gap-2">
              {nextStates.map((s) => (
                <form key={s} action={setProjectState}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="state" value={s} />
                  <button
                    type="submit"
                    className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Mark as {STATE_META[s].label.toLowerCase()}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ) : null}

        {isOwner ? (
          <form action={deleteProject} className="mt-10">
            <input type="hidden" name="projectId" value={project.id} />
            <ConfirmSubmit
              message="Delete this project permanently? This cannot be undone."
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Delete project
            </ConfirmSubmit>
          </form>
        ) : null}
      </main>
    </div>
  );
}
