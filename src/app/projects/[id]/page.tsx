import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { NeighborhoodMap } from "@/components/NeighborhoodMap";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import {
  CONTRIBUTION_TYPES,
  CONTRIBUTION_TYPE_META,
  HELP_META,
  REACH_META,
  STATE_META,
  TRANSITIONS,
  categoryMeta,
  formatEventTime,
  isUpcomingEvent,
  isWithinDays,
  timeAgo,
  excerpt,
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
      "id,owner_id,title,description,category,state,help,reach,photo_url,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name)",
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
    .select("user_id,status,created_at,profile:profiles(display_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const members = (memberRows ?? []) as unknown as Membership[];

  const myMembership = members.find((m) => m.user_id === user.id) ?? null;
  const pending = members.filter((m) => m.status === "pending");
  const accepted = members.filter((m) => m.status === "accepted");
  const teamSize = accepted.length + 1; // founder + accepted collaborators
  const isTeammate = myMembership?.status === "accepted";

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

  if (project.state === "completed") {
    timeline.push({
      at: project.updated_at,
      icon: "🎉",
      text: "The project reached completion",
    });
  }

  timeline.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <AppShell>
      <LiveRefresh tables="projects,stars,memberships,events,rsvps,contributions,attestations" />
      <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-16 lg:pr-8">
        <Link
          href="/"
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← All projects
        </Link>

        {project.photo_url ? (
          <div
            aria-hidden
            className="mt-4 h-56 w-full rounded-2xl border border-black/5 bg-cover bg-center shadow-sm dark:border-white/5"
            style={{ backgroundImage: `url(${project.photo_url})` }}
          />
        ) : null}

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

        {project.lat != null && project.lng != null ? (
          <div className="mt-5">
            <NeighborhoodMap
              pins={[
                {
                  id: project.id,
                  title: project.title,
                  emoji: cat.emoji,
                  href: `/projects/${project.id}`,
                  lat: project.lat,
                  lng: project.lng,
                  subtitle: `${meta.label} · ${founderName}`,
                },
              ]}
            />
          </div>
        ) : null}

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

        {/* The story so far — the history timeline is the hero of the page */}
        <div className="mt-7">
          <h2 className="mb-3 text-sm font-semibold">The story so far</h2>
          <ol className="relative ml-2 flex flex-col gap-4 border-l border-black/10 pl-5 dark:border-white/10">
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
        <div className="mt-7">
          <h2 className="mb-2 text-sm font-semibold">Events</h2>

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
                        ? "border-black/10 dark:border-white/10"
                        : "border-black/5 opacity-60 dark:border-white/5"
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
                      <form action={toggleRsvp} className="mt-2.5">
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
                              : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                          }`}
                        >
                          {iAmIn ? "✓ You're in — tap to change plans" : "🙋 I'm in"}
                        </button>
                      </form>
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

          {isOwner ? (
            <form
              action={createEvent}
              className="mt-4 rounded-2xl border border-black/10 p-4 dark:border-white/10"
            >
              <input type="hidden" name="projectId" value={project.id} />
              <h3 className="text-sm font-semibold">Plan an event</h3>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                A concrete time and place — the gentlest way for a neighbor to
                get involved. Joining is a signal, not a promise.
              </p>
              <input
                type="text"
                name="title"
                required
                maxLength={140}
                placeholder='e.g. "Planting day — bring gloves!"'
                className="mt-3 w-full rounded-xl border border-black/15 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="datetime-local"
                  name="startsAt"
                  required
                  className="rounded-xl border border-black/15 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-white/20 dark:[color-scheme:dark]"
                />
                <input
                  type="text"
                  name="place"
                  maxLength={200}
                  placeholder="Where? e.g. the Oak Street lot"
                  className="min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
                />
              </div>
              <button
                type="submit"
                className="mt-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Create event
              </button>
            </form>
          ) : null}
        </div>

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
                    className="rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
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

                    {(isOwner && !isMine && c.status === "logged") ||
                    (canAttest && !iAttested) ||
                    (isMine && c.status === "logged") ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {isOwner && !isMine && c.status === "logged" ? (
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
                                className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
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
                              className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
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
              className="mt-4 rounded-2xl border border-black/10 p-4 dark:border-white/10"
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
                      className="cursor-pointer rounded-full border border-black/15 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800 dark:border-white/20 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40 dark:has-[:checked]:text-emerald-300"
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
                className="mt-3 w-full rounded-xl border border-black/15 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
              />

              <button
                type="submit"
                className="mt-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Add to the record
              </button>
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
    </AppShell>
  );
}
