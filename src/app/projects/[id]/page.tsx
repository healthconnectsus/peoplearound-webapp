import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { NeighborhoodMap } from "@/components/NeighborhoodMap";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { computeBadges } from "@/lib/badges";
import { FlagButton } from "./FlagButton";
import { UpdateComposer, ProjectPhotoEditor } from "./UpdateComposer";
import { CoverPhotoTool, StewardSection } from "./OwnerTools";
import { ProjectHero } from "@/components/ProjectHero";
import { deleteUpdate, dismissNudge } from "../updateActions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import {
  CONTRIBUTION_TYPES,
  CONTRIBUTION_TYPE_META,
  HELP_META,
  REACH_META,
  STATE_META,
  TRANSITIONS,
  categoryMeta,
  categoryShadow,
  categoryTint,
  formatEventTime,
  isUpcomingEvent,
  isWithinDays,
  timeAgo,
  excerpt,
  googleCalendarUrl,
  type Contribution,
  type Membership,
  type Project,
  type ProjectEvent,
  type Star,
  type TimelineEntry,
} from "@/lib/projects";
import {
  acceptContribution,
  attestContribution,
  createEvent,
  deleteEvent,
  deleteProject,
  leaveProject,
  logContribution,
  requestJoin,
  respondToMembership,
  setMemberRole,
  setProjectState,
  toggleRsvp,
  toggleStar,
  withdrawContribution,
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
      "id,owner_id,title,description,category,state,help,reach,photo_url,photo_credit_name,photo_credit_url,when_text,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name,avatar_url),neighborhood:neighborhoods(name,city)",
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
  const hasPin = project.lat != null && project.lng != null;

  // Stars — count, whether the current user has starred, and who/when for
  // the history timeline.
  const { data: starRows } = await supabase
    .from("stars")
    .select("user_id,created_at,profile:profiles(display_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const stars = (starRows ?? []) as unknown as Star[];
  const starCount = stars.length;
  const hasStarred = stars.some((s) => s.user_id === user.id);

  // Memberships — requests and accepted collaborators.
  const { data: memberRows } = await supabase
    .from("memberships")
    .select("user_id,status,role,created_at,profile:profiles(display_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const members = (memberRows ?? []) as unknown as Membership[];

  const myMembership = members.find((m) => m.user_id === user.id) ?? null;
  const pending = members.filter((m) => m.status === "pending");
  const accepted = members.filter((m) => m.status === "accepted");
  const teamSize = accepted.length + 1; // founder + accepted collaborators
  const isTeammate = myMembership?.status === "accepted";
  // Co-organizers steward the project alongside the founder: accept joins,
  // run events, accept others' contributions (never their own).
  const myRole = (myMembership as unknown as { role?: string } | null)?.role;
  const isSteward = isOwner || (isTeammate && myRole === "co_organizer");

  // Private analytics: count this visit (deduped per day; owners excluded;
  // raw rows never client-readable — see migration 0020).
  if (!isOwner) {
    await supabase.rpc("record_project_view", { p_project_id: id });
  }

  // Badges here too, so sharing your first idea celebrates immediately on
  // the page you land on after creating it.
  const badges = await computeBadges(supabase, user.id, {
    id: project.neighborhood_id ?? null,
    name: null,
  });

  // The build log — founder/teammate progress notes.
  const { data: updateRows } = await supabase
    .from("project_updates")
    .select("id,author_id,body,photo_url,created_at,author:profiles(display_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  const updates = (updateRows ?? []) as unknown as {
    id: string;
    author_id: string;
    body: string;
    photo_url: string | null;
    created_at: string;
    author?: { display_name: string | null } | null;
  }[];

  // A private word from the gardener, if this project has gone quiet.
  // RLS returns a row only to the founder (migration 0029).
  const { data: nudgeRow } = await supabase
    .from("project_nudges")
    .select("kind,body,dismissed_at")
    .eq("project_id", id)
    .maybeSingle();
  const nudge =
    nudgeRow && !(nudgeRow as { dismissed_at: string | null }).dismissed_at
      ? (nudgeRow as { kind: string; body: string })
      : null;

  // Community moderation: have I already reported this one? (RLS returns
  // only my own flag row.)
  const { data: myFlag } = await supabase
    .from("project_flags")
    .select("user_id")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Contributions — apply any pending confirmations (server-side, idempotent;
  // this is also what makes the 7-day founder-bypass window take effect),
  // then read the record.
  await supabase.rpc("reconcile_contributions", { p_project_id: id });
  const { data: contributionRows } = await supabase
    .from("contributions")
    .select(
      "id,contributor_id,type,description,status,created_at,confirmed_at,contributor:profiles(display_name),attestations(attester_id,created_at,attester:profiles(display_name))",
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  const contributions = (contributionRows ?? []) as unknown as Contribution[];

  // Events — physical coordination, with each event's joining signals.
  const { data: eventRows } = await supabase
    .from("events")
    .select("id,project_id,title,starts_at,place,created_at,rsvps(user_id)")
    .eq("project_id", id)
    .order("starts_at", { ascending: true });
  const events = (eventRows ?? []) as unknown as ProjectEvent[];
  const upcomingEvents = events.filter((e) => isUpcomingEvent(e.starts_at));
  const pastEvents = events
    .filter((e) => !isUpcomingEvent(e.starts_at))
    .reverse();

  // The acknowledgment moment: the current user's own recently confirmed work.
  const myFreshlyConfirmed = contributions.filter(
    (c) =>
      c.contributor_id === user.id &&
      c.status === "confirmed" &&
      isWithinDays(c.confirmed_at, 7),
  );

  // ----------------------------------------------------------------
  // The history timeline — the accumulating true story of the project,
  // assembled from what actually happened: the idea, stars, joins,
  // confirmed contributions, and events. The making is the product.
  // ----------------------------------------------------------------
  const timeline: TimelineEntry[] = [];

  timeline.push({
    at: project.created_at,
    icon: cat.emoji,
    text: `${founderName} shared the idea`,
  });

  // Stars, clustered by day so a good day reads as one warm beat.
  const starsByDay = new Map<string, Star[]>();
  for (const s of stars) {
    const day = s.created_at.slice(0, 10);
    starsByDay.set(day, [...(starsByDay.get(day) ?? []), s]);
  }
  for (const dayStars of starsByDay.values()) {
    const first = dayStars[0].profile?.display_name ?? "A neighbor";
    const others = dayStars.length - 1;
    timeline.push({
      at: dayStars[dayStars.length - 1].created_at,
      icon: "⭐",
      text:
        others === 0
          ? `${first} would be glad this existed`
          : `${first} and ${others} other ${others === 1 ? "neighbor" : "neighbors"} starred this`,
    });
  }

  for (const m of accepted) {
    timeline.push({
      at: m.created_at,
      icon: "🤝",
      text: `${m.profile?.display_name ?? "A neighbor"} joined the team`,
    });
  }

  // Only confirmed contributions enter the story — the trust layer's output.
  for (const c of contributions) {
    if (c.status !== "confirmed") continue;
    timeline.push({
      at: c.created_at,
      icon: CONTRIBUTION_TYPE_META[c.type].emoji,
      text: `${c.contributor?.display_name ?? "A neighbor"} — ${excerpt(c.description)} (confirmed)`,
    });
  }

  for (const e of pastEvents) {
    const count = e.rsvps.length;
    timeline.push({
      at: e.starts_at,
      icon: "📅",
      text: `${e.title}${count > 0 ? ` — ${count} ${count === 1 ? "neighbor" : "neighbors"} joined in` : ""}`,
    });
  }

  for (const u of updates) {
    timeline.push({
      at: u.created_at,
      icon: "📣",
      text: `${u.author?.display_name ?? "The team"} — ${excerpt(u.body)}`,
    });
  }

  if (project.state === "completed") {
    timeline.push({
      at: project.updated_at,
      icon: "🎉",
      text: "The project reached completion",
    });
  }

  timeline.sort((a, b) => a.at.localeCompare(b.at));

  // Stewards' forms. They're built here but handed to OwnerTools, which keeps
  // them closed until asked for — opening your own project should show you
  // the project, not an edit screen.
  const eventForm = (
    <form
      action={createEvent}
      className="rounded-2xl border border-slate-400 p-4 dark:border-slate-500"
    >
      <input type="hidden" name="projectId" value={project.id} />
      <h3 className="text-sm font-semibold">Plan an event</h3>
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
        A concrete time and place — the gentlest way for a neighbor to get
        involved. Joining is a signal, not a promise.
      </p>
      <input
        type="text"
        name="title"
        required
        maxLength={140}
        placeholder='e.g. "Planting day — bring gloves!"'
        className="mt-3 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          type="datetime-local"
          name="startsAt"
          required
          className="rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400 dark:[color-scheme:dark]"
        />
        <input
          type="text"
          name="place"
          maxLength={200}
          placeholder="Where? e.g. the Oak Street lot"
          className="min-w-0 flex-1 rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
        />
      </div>
      <SubmitButton
        pendingLabel="Creating…"
        className="mt-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Create event
      </SubmitButton>
    </form>
  );

  return (
    <AppShell>
      <BadgeCelebration badges={badges} userId={user.id} />
      <LiveRefresh
        tables={[
          `projects:id=eq.${id}`,
          `stars:project_id=eq.${id}`,
          `memberships:project_id=eq.${id}`,
          `events:project_id=eq.${id}`,
          `contributions:project_id=eq.${id}`,
          `project_updates:project_id=eq.${id}`,
        ].join(",")}
      />
      <div
        className={
          hasPin
            ? // Same split as MapShell (used by every other "around me"
              // page) — this page predated it and kept the old wider
              // columns, so its map read as a different app.
              "lg:grid lg:grid-cols-[minmax(0,1fr)_40%] xl:grid-cols-[minmax(0,1fr)_42%]"
            : ""
        }
      >
        {/* Where it's happening — sticky beside the story, like the feed. */}
        {hasPin ? (
          <aside className="p-4 pb-0 lg:order-2 lg:sticky lg:top-0 lg:h-screen lg:p-4">
            <NeighborhoodMap
              className="h-64 lg:h-full"
              pins={[
                {
                  id: project.id,
                  title: project.title,
                  emoji: cat.emoji,
                  href: `/projects/${project.id}`,
                  lat: project.lat!,
                  lng: project.lng!,
                  subtitle: `${meta.label} · ${founderName}`,
                },
              ]}
            />
          </aside>
        ) : null}

      <main className="w-full max-w-3xl flex-1 p-4 lg:order-1 lg:py-6 lg:pl-36 lg:pr-8">
        <Link
          href="/"
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← All projects
        </Link>

        {/* The same header the feed card uses — title, starter and
            "Aurora · 9 days ago" all riding on the photo. */}
        <div
          className={`mt-4 overflow-hidden rounded-2xl border border-slate-300 border-l-4 bg-white shadow-md dark:border-slate-600 dark:bg-zinc-900 ${categoryTint(project.category)} ${categoryShadow(project.category)}`}
        >
          <ProjectHero
            title={project.title}
            emoji={cat.emoji}
            photoUrl={project.photo_url ?? null}
            stateLabel={meta.label}
            stateBadge={meta.badge}
            ownerName={founderName}
            ownerAvatarUrl={project.owner?.avatar_url ?? null}
            place={project.neighborhood?.name ?? null}
            createdAt={project.created_at}
            heading="h1"
            titleClass="text-2xl font-bold"
          />
        </div>

        {/* The photographer's name travels with the photo (0039) — the
            Unsplash guidelines require credit wherever it's displayed,
            and this page is where it's displayed biggest. */}
        {project.photo_url && project.photo_credit_name ? (
          <p className="mt-1 text-right text-[11px] text-black/35 dark:text-white/35">
            Photo by{" "}
            <a
              href={project.photo_credit_url ?? "https://unsplash.com/?utm_source=peoplearound&utm_medium=referral"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-black/55 dark:hover:text-white/55"
            >
              {project.photo_credit_name}
            </a>{" "}
            on{" "}
            <a
              href="https://unsplash.com/?utm_source=peoplearound&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-black/55 dark:hover:text-white/55"
            >
              Unsplash
            </a>
          </p>
        ) : null}

        {/* Founder only — nobody else sees an edit affordance. */}
        {isOwner ? (
          <CoverPhotoTool>
            <ProjectPhotoEditor
              projectId={project.id}
              userId={user.id}
              photoUrl={project.photo_url ?? null}
            />
          </CoverPhotoTool>
        ) : null}

        <p className="mt-4 text-sm text-black/50 dark:text-white/50">
          {cat.label} · 🤝 {teamSize} {teamSize === 1 ? "person" : "people"}{" "}
          building · ⭐ {starCount} {starCount === 1 ? "star" : "stars"}
          {project.help ? (
            <span title={HELP_META[project.help].hint}>
              {" · "}
              {HELP_META[project.help].emoji} Looking for:{" "}
              {HELP_META[project.help].label.toLowerCase()}
            </span>
          ) : null}
          {project.reach && project.reach !== "neighborhood" ? (
            <span title={REACH_META[project.reach].hint}>
              {" · "}
              {REACH_META[project.reach].emoji} Open to:{" "}
              {REACH_META[project.reach].label.toLowerCase()}
            </span>
          ) : null}
          {project.when_text ? (
            <span title="The rhythm this happens on — neighbors settle the details">
              {" · "}🗓 {project.when_text}
            </span>
          ) : null}
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
        <div className="mt-7 rounded-2xl border border-slate-400 p-4 dark:border-slate-500">
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
                  className="rounded-full border border-slate-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
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
                  className="rounded-full border border-slate-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
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
                    : "border-slate-400 hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                }`}
              >
                {hasStarred ? "⭐ Starred" : "☆ Star this idea"}
              </button>
            </form>
          </div>
        </div>

        {/* The acknowledgment moment — your work was confirmed by real people. */}
        {myFreshlyConfirmed.length > 0 ? (
          <div className="mt-7 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700/60 dark:bg-emerald-950/40">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              🎉 {founderName} confirmed your help on this project.
            </p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
              You were needed — and you showed up.{" "}
              {myFreshlyConfirmed[0].attestations.length > 0 ? (
                <>
                  {myFreshlyConfirmed[0].attestations
                    .map((a) => a.attester?.display_name ?? "A neighbor")
                    .join(", ")}{" "}
                  saw it happen. It&apos;s part of this project&apos;s story
                  now.
                </>
              ) : (
                "It's part of this project's story now."
              )}
            </p>
          </div>
        ) : null}

        {/* Owner: pending join requests */}
        {isSteward && pending.length > 0 ? (
          <div className="mt-7">
            <h2 className="mb-2 text-sm font-semibold">
              Wants to join ({pending.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {pending.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-400 px-4 py-3 dark:border-slate-500"
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
                        className="rounded-full border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
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
          <ul className="flex flex-col">
            <li className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-sm font-medium">{founderName}</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Founder
              </span>
            </li>
            {accepted.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {m.profile?.display_name ?? "Someone"}
                  {(m as unknown as { role?: string }).role === "co_organizer" ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                      🛠️ Co-organizer
                    </span>
                  ) : null}
                </span>
                {isOwner ? (
                  <span className="flex flex-wrap items-center gap-3">
                    <form action={setMemberRole}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="memberId" value={m.user_id} />
                      <input
                        type="hidden"
                        name="role"
                        value={
                          (m as unknown as { role?: string }).role === "co_organizer"
                            ? "member"
                            : "co_organizer"
                        }
                      />
                      <button
                        type="submit"
                        title="Co-organizers can accept join requests, run events, and accept others' contributions"
                        className="text-xs text-black/50 hover:underline dark:text-white/50"
                      >
                        {(m as unknown as { role?: string }).role === "co_organizer"
                          ? "Make member"
                          : "Make co-organizer"}
                      </button>
                    </form>
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
                  </span>
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

        {/* The gardener's private nudge — founder only, dismissible, and
            deliberately quiet: scaffolding that fades (UX_SPEC §4.16). */}
        {nudge && isOwner ? (
          <div className="mt-7 rounded-2xl border border-amber-300/50 bg-amber-50/60 p-4 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              🌱 A thought, just for you
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/80 dark:text-amber-200/80">
              {nudge.body}
            </p>
            <form action={dismissNudge} className="mt-2">
              <input type="hidden" name="projectId" value={project.id} />
              <button
                type="submit"
                className="text-xs text-amber-900/60 hover:underline dark:text-amber-200/60"
              >
                Thanks — dismiss
              </button>
            </form>
          </div>
        ) : null}

        {/* Updates — the build log (founder + teammates) */}
        <StewardSection
          title="Updates"
          tool={isOwner || isTeammate ? "update" : null}
          form={<UpdateComposer projectId={project.id} userId={user.id} />}
        >

          {updates.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-white/40">
              {isOwner || isTeammate
                ? "No updates yet — a short note keeps neighbors following along."
                : "No updates yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {updates.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-slate-400 px-4 py-3 dark:border-slate-500"
                >
                  <p className="text-xs text-black/45 dark:text-white/45">
                    📣 {u.author?.display_name ?? "The team"} ·{" "}
                    {timeAgo(u.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                    {u.body}
                  </p>
                  {u.photo_url ? (
                    <div
                      aria-hidden
                      className="mt-2 h-48 w-full rounded-xl border border-slate-300 bg-cover bg-center dark:border-slate-600"
                      style={{ backgroundImage: `url(${u.photo_url})` }}
                    />
                  ) : null}
                  {u.author_id === user.id || isOwner ? (
                    <form action={deleteUpdate} className="mt-2">
                      <input
                        type="hidden"
                        name="projectId"
                        value={project.id}
                      />
                      <input type="hidden" name="updateId" value={u.id} />
                      <button
                        type="submit"
                        className="text-xs text-black/40 hover:underline dark:text-white/40"
                      >
                        Remove
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </StewardSection>

        {/* The story so far — the history timeline is the hero of the page */}
        <div className="mt-7">
          <h2 className="mb-3 text-sm font-semibold">The story so far</h2>
          <ol className="relative ml-2 flex flex-col gap-4 border-l border-slate-400 pl-5 dark:border-slate-500">
            {timeline.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[11px] leading-none dark:bg-zinc-950"
                >
                  {entry.icon}
                </span>
                <p className="text-sm leading-snug">{entry.text}</p>
                <p className="mt-0.5 text-xs text-black/40 dark:text-white/40">
                  {timeAgo(entry.at)}
                </p>
              </li>
            ))}
          </ol>
          {timeline.length === 1 ? (
            <p className="mt-3 text-xs text-black/40 dark:text-white/40">
              Every story starts somewhere. Stars, teammates, and confirmed
              contributions will all be recorded here.
            </p>
          ) : null}
        </div>

        {/* Events — where it becomes physical */}
        <StewardSection
          title="Events"
          tool={isSteward ? "event" : null}
          form={eventForm}
        >

          {events.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-white/40">
              {isOwner
                ? "No events yet — a concrete time and place is the easiest way to get neighbors involved."
                : "No events planned yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...upcomingEvents, ...pastEvents].map((e) => {
                const upcoming = isUpcomingEvent(e.starts_at);
                const iAmIn = e.rsvps.some((r) => r.user_id === user.id);
                const count = e.rsvps.length;
                return (
                  <li
                    key={e.id}
                    className={`rounded-xl border px-4 py-3 ${
                      upcoming
                        ? "border-slate-400 dark:border-slate-500"
                        : "border-slate-300 opacity-60 dark:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          <span className="mr-1" aria-hidden>
                            📅
                          </span>
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                          {formatEventTime(e.starts_at)}
                          {e.place ? ` · ${e.place}` : ""}
                          {!upcoming ? " · happened" : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                          🙋 {count} {count === 1 ? "neighbor" : "neighbors"}{" "}
                          joining
                        </p>
                      </div>
                      {isOwner ? (
                        <form action={deleteEvent}>
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <input type="hidden" name="eventId" value={e.id} />
                          <ConfirmSubmit
                            message="Remove this event?"
                            className="shrink-0 text-xs text-black/40 hover:underline dark:text-white/40"
                          >
                            Remove
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </div>

                    {upcoming ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        <form action={toggleRsvp}>
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <input type="hidden" name="eventId" value={e.id} />
                          <button
                            type="submit"
                            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                              iAmIn
                                ? "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-slate-400 hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                            }`}
                          >
                            {iAmIn ? "✓ You're in — tap to change plans" : "🙋 I'm in"}
                          </button>
                        </form>
                        <a
                          href={googleCalendarUrl(
                            e,
                            project.title,
                            `https://peoplearound.com/projects/${project.id}`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
                        >
                          Google Calendar
                        </a>
                        <a
                          href={`/api/event-ics?id=${e.id}`}
                          className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
                        >
                          .ics
                        </a>
                      </div>
                    ) : isOwner ? (
                      <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                        Did neighbors help make this happen? When they log it
                        below, accept it so it counts.
                      </p>
                    ) : iAmIn && isTeammate ? (
                      <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                        Were you there and pitched in? Log it below so it
                        becomes part of the record.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </StewardSection>

        {/* Contributions — the trust layer */}
        <div className="mt-7">
          <h2 className="mb-2 text-sm font-semibold">Contributions</h2>

          {contributions.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-white/40">
              {isTeammate
                ? "Nothing logged yet — when you help move this project forward, record it below."
                : "Nothing logged yet. When the team gets to work, what they build shows up here."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {contributions.map((c) => {
                const typeMeta = CONTRIBUTION_TYPE_META[c.type];
                const isMine = c.contributor_id === user.id;
                const iAttested = c.attestations.some(
                  (a) => a.attester_id === user.id,
                );
                const canAttest =
                  !isOwner && !isMine && (isTeammate || hasStarred);
                const witnessNames = c.attestations
                  .map((a) => a.attester?.display_name ?? "a neighbor")
                  .join(", ");
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-slate-400 px-4 py-3 dark:border-slate-500"
                  >
                    <p className="text-sm">
                      <span className="mr-1" aria-hidden>
                        {typeMeta.emoji}
                      </span>
                      <span className="font-medium">
                        {c.contributor?.display_name ?? "Someone"}
                      </span>{" "}
                      <span className="text-black/40 dark:text-white/40">
                        · {typeMeta.label.toLowerCase()} ·{" "}
                        {timeAgo(c.created_at)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                      {c.description}
                    </p>

                    <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                      {c.status === "confirmed" ? (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          ✅ Confirmed
                          {witnessNames ? ` — seen by ${witnessNames}` : ""}
                        </span>
                      ) : c.status === "accepted" ? (
                        <>
                          ☑️ Accepted by {founderName} — becomes confirmed once
                          a teammate or stargazer attests
                        </>
                      ) : (
                        <>
                          ⏳ With {founderName} to accept
                          {c.attestations.length > 0
                            ? ` · already seen by ${witnessNames}`
                            : ""}
                        </>
                      )}
                    </p>

                    {(isSteward && !isMine && c.status === "logged") ||
                    (canAttest && !iAttested) ||
                    (isMine && c.status === "logged") ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {isSteward && !isMine && c.status === "logged" ? (
                          <>
                            <form action={acceptContribution}>
                              <input
                                type="hidden"
                                name="projectId"
                                value={project.id}
                              />
                              <input
                                type="hidden"
                                name="contributionId"
                                value={c.id}
                              />
                              <button
                                type="submit"
                                className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                              >
                                ✓ Yes, this helped
                              </button>
                            </form>
                            <form action={withdrawContribution}>
                              <input
                                type="hidden"
                                name="projectId"
                                value={project.id}
                              />
                              <input
                                type="hidden"
                                name="contributionId"
                                value={c.id}
                              />
                              <ConfirmSubmit
                                message="Quietly remove this entry? Do this only if it doesn't reflect what happened."
                                className="rounded-full border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                              >
                                Not this one
                              </ConfirmSubmit>
                            </form>
                          </>
                        ) : null}

                        {canAttest && !iAttested ? (
                          <form action={attestContribution}>
                            <input
                              type="hidden"
                              name="projectId"
                              value={project.id}
                            />
                            <input
                              type="hidden"
                              name="contributionId"
                              value={c.id}
                            />
                            <button
                              type="submit"
                              title="Attest that this really happened"
                              className="rounded-full border border-emerald-600/40 px-4 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            >
                              🙌 I saw this happen
                            </button>
                          </form>
                        ) : null}

                        {isMine && c.status === "logged" ? (
                          <form action={withdrawContribution}>
                            <input
                              type="hidden"
                              name="projectId"
                              value={project.id}
                            />
                            <input
                              type="hidden"
                              name="contributionId"
                              value={c.id}
                            />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                            >
                              Withdraw
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Teammates log what they did; the founder + a witness confirm it. */}
          {isTeammate ? (
            <form
              action={logContribution}
              className="mt-4 rounded-2xl border border-slate-400 p-4 dark:border-slate-500"
            >
              <input type="hidden" name="projectId" value={project.id} />
              <h3 className="text-sm font-semibold">Log a contribution</h3>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Count it if the project moved forward because of it.{" "}
                {founderName} confirms it landed, and one teammate or stargazer
                attests they saw it — then it&apos;s part of the record.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {CONTRIBUTION_TYPES.map((t, i) => {
                  const m = CONTRIBUTION_TYPE_META[t];
                  return (
                    <label
                      key={t}
                      title={m.hint}
                      className="cursor-pointer rounded-full border border-slate-400 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800 dark:border-slate-400 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40 dark:has-[:checked]:text-emerald-300"
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        defaultChecked={i === 0}
                        className="sr-only"
                      />
                      {m.emoji} {m.label}
                    </label>
                  );
                })}
              </div>

              <textarea
                name="description"
                required
                maxLength={1000}
                rows={3}
                placeholder="What did you do, and how did it move the project forward?"
                className="mt-3 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
              />

              <SubmitButton
                pendingLabel="Adding…"
                className="mt-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Add to the record
              </SubmitButton>
            </form>
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
                    className="rounded-full border border-slate-400 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
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

        {/* Community moderation — quiet by design; not shown on your own. */}
        {!isOwner ? (
          <div className="mt-10 border-t border-slate-300 pt-4 dark:border-slate-600">
            <FlagButton
              projectId={project.id}
              alreadyFlagged={Boolean(myFlag)}
            />
          </div>
        ) : null}
      </main>
      </div>
    </AppShell>
  );
}
