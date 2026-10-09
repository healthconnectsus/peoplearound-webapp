import { formatEventTime } from "@/lib/projects";

/**
 * The coach: what to do next, worked out before anyone goes looking.
 *
 * The database gathers the numbers (migration 0080 — `my_coach`,
 * `project_coach`, `coach_material`); this file decides what they mean. One
 * set of rules, used everywhere a person might need a nudge:
 *
 *   - the home page, top three, every time you arrive;
 *   - a project's own page, for whoever runs it, with a progress tracker;
 *   - the analytics page, all of them, beside the numbers behind them;
 *   - a weekly notification, so the news comes to you.
 *
 * Every step is one sentence and one button that lands where the work is,
 * with the form already open where there is one. The rules are ordered by
 * what costs someone else if it waits: a neighbor who asked to join and
 * heard nothing goes first; a missing photo goes last.
 *
 * Never: counting someone's failure at them, inventing a statistic, or
 * nagging about something that cannot be done from the button.
 */

export type CoachEvent = {
  id: string;
  title: string;
  starts_at: string;
  published: boolean;
  going: number;
  jobs: number;
  open_spots: number;
};

export type CoachProject = {
  id: string;
  title: string;
  state: "idea" | "active" | "completed" | "archived";
  created_at: string;
  has_photo: boolean;
  desc_len: number;
  stars: number;
  stars_7d: number;
  views_7d: number;
  views_prev_7d: number;
  team: number;
  pending: number;
  logged: number;
  confirmed: number;
  updates: number;
  last_activity_at: string;
  events_total: number;
  events_published: number;
  next_event: CoachEvent | null;
  last_event: {
    id: string;
    title: string;
    starts_at: string;
    updates_since: number;
  } | null;
  has_nudge: boolean;
};

export type CoachDoc = {
  projects: CoachProject[];
  going: {
    id: string;
    title: string;
    starts_at: string;
    place: string;
    job: string | null;
  }[];
  open_spots_near: number;
};

export type Step = {
  key: string;
  /** Higher first. */
  weight: number;
  text: string;
  cta: string;
  href: string;
  projectId?: string;
};

const DAY = 864e5;
const ageDays = (iso: string) => (Date.now() - Date.parse(iso)) / DAY;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
/** A title in curly quotes, shortened if it would crowd the sentence. */
const quote = (t: string) =>
  `“${t.length > 48 ? `${t.slice(0, 46).trimEnd()}…` : t}”`;

/** The steps for one project, strongest first. */
export function projectSteps(p: CoachProject): Step[] {
  if (p.state === "archived") return [];
  const steps: Step[] = [];
  const base = `/projects/${p.id}`;
  const t = quote(p.title);
  const add = (s: Omit<Step, "projectId">) =>
    steps.push({ ...s, projectId: p.id });

  // People waiting on you come first: silence costs them, not you.
  if (p.pending > 0) {
    add({
      key: `pending:${p.id}`,
      weight: 100,
      text: `${plural(p.pending, "neighbor wants", "neighbors want")} to join ${t}`,
      cta: "Review",
      href: `${base}#requests`,
    });
  }
  if (p.logged > 0) {
    add({
      key: `logged:${p.id}`,
      weight: 95,
      text: `Help logged on ${t} is waiting to be accepted`,
      cta: "Review",
      href: `${base}#contributions`,
    });
  }

  const ev = p.next_event;
  if (ev) {
    const soon = ageDays(ev.starts_at) > -3; // within three days
    const evPage = `/events/${ev.id}`;
    // Open spots matter once the event is public; before that, publishing is
    // the step that fills them.
    if (soon && ev.published && ev.open_spots > 0) {
      add({
        key: `spots:${ev.id}`,
        weight: 85,
        text: `${quote(ev.title)} is ${formatEventTime(ev.starts_at)} and ${plural(ev.open_spots, "job spot is", "job spots are")} still open`,
        cta: "Send a note",
        href: `${evPage}#notes`,
      });
    }
    if (!ev.published) {
      add({
        key: `publish:${ev.id}`,
        weight: soon ? 72 : 55,
        text: `Publish ${quote(ev.title)} — it gets a page anyone can open, a QR code and a poster`,
        cta: "Publish",
        href: evPage,
      });
    }
    if (ev.jobs === 0) {
      add({
        key: `jobs:${ev.id}`,
        weight: 58,
        text: `Say what needs doing at ${quote(ev.title)} — named jobs get taken`,
        cta: "Add jobs",
        href: `${evPage}#jobs`,
      });
    }
  } else if (p.state !== "completed" && (p.stars >= 3 || p.team >= 1)) {
    add({
      key: `date:${p.id}`,
      weight: 65,
      text:
        p.stars >= 3
          ? `${p.stars} neighbors starred ${t} — give them a date`
          : `${t} has a team — give it a date`,
      cta: "Plan an event",
      href: `${base}?plan=1#events`,
    });
  }

  if (p.last_event && p.last_event.updates_since === 0) {
    add({
      key: `after:${p.last_event.id}`,
      weight: 62,
      text: `How did ${quote(p.last_event.title)} go? A photo and two lines for the people who came`,
      cta: "Post an update",
      href: `${base}?update=1#updates`,
    });
  }

  if (p.state !== "completed" && p.views_7d === 0 && ageDays(p.created_at) >= 2) {
    add({
      key: `share:${p.id}`,
      weight: 48,
      text: `Nobody opened ${t} this week — send it to one neighbor`,
      cta: "Share",
      href: `${base}#share`,
    });
  }

  if (p.views_7d >= 5 && p.stars_7d === 0) {
    if (!p.has_photo) {
      add({
        key: `photo:${p.id}`,
        weight: 44,
        text: `${p.views_7d} neighbors looked at ${t} this week — a photo helps it stand out`,
        cta: "Add a photo",
        href: `${base}?edit=1`,
      });
    } else if (p.desc_len < 120) {
      add({
        key: `words:${p.id}`,
        weight: 42,
        text: `${p.views_7d} neighbors looked at ${t} this week — say what you need and when`,
        cta: "Edit",
        href: `${base}?edit=1`,
      });
    }
  }

  const quiet = Math.floor(ageDays(p.last_activity_at));
  if (
    quiet >= 10 &&
    (p.state === "idea" || p.state === "active") &&
    (p.team >= 1 || p.stars >= 1) &&
    !steps.some((s) => s.key.startsWith("after:"))
  ) {
    add({
      key: `quiet:${p.id}`,
      weight: 40,
      text: `No news on ${t} for ${quiet} days — two lines keep people with you`,
      cta: "Post an update",
      href: `${base}?update=1#updates`,
    });
  }

  if (p.has_nudge) {
    add({
      key: `nudge:${p.id}`,
      weight: 36,
      text: `The gardener left you a thought about ${t}`,
      cta: "Read it",
      href: `${base}#nudge`,
    });
  }

  return steps.sort((a, b) => b.weight - a.weight);
}

/**
 * Everything, across all of a person's projects and plans, strongest first.
 * At most two per project, so one busy project cannot crowd out the rest.
 */
export function nextSteps(doc: CoachDoc | null): Step[] {
  if (!doc) return [];
  const steps: Step[] = [];

  for (const p of doc.projects ?? []) steps.push(...projectSteps(p).slice(0, 2));

  for (const e of doc.going ?? []) {
    const within36h = ageDays(e.starts_at) > -1.5;
    steps.push({
      key: `going:${e.id}`,
      weight: within36h ? 88 : 60,
      text: `${quote(e.title)} — ${formatEventTime(e.starts_at)}${e.job ? ` · you're on ${e.job.toLowerCase()}` : ""}`,
      cta: "Details",
      href: `/events/${e.id}`,
    });
  }

  // Running nothing yet: the two easiest ways in.
  if ((doc.projects ?? []).length === 0) {
    if (doc.open_spots_near > 0) {
      steps.push({
        key: "spots-near",
        weight: 30,
        text: `${plural(doc.open_spots_near, "job spot", "job spots")} at events near you still ${doc.open_spots_near === 1 ? "needs" : "need"} someone`,
        cta: "Take one",
        href: "/events",
      });
    }
    steps.push({
      key: "start",
      weight: 25,
      text: "Start something — pick a recipe and the first steps are written for you",
      cta: "Recipes",
      href: "/playbooks",
    });
  }

  return steps.sort((a, b) => b.weight - a.weight);
}

/** Where a project stands, as the milestones every project passes. */
export function milestones(p: CoachProject): { label: string; done: boolean }[] {
  return [
    { label: "Shared", done: true },
    { label: "3 stars", done: p.stars >= 3 },
    { label: "A teammate", done: p.team >= 1 },
    { label: "A date set", done: p.events_total >= 1 },
    { label: "Promoted", done: p.events_published >= 1 },
    { label: "An update", done: p.updates >= 1 },
    { label: "Help confirmed", done: p.confirmed >= 1 },
    { label: "Finished", done: p.state === "completed" },
  ];
}

/** "14 views (+6 on last week) · 2 new stars" */
export function weekLine(p: Pick<CoachProject, "views_7d" | "views_prev_7d" | "stars_7d">): string {
  const delta = p.views_7d - p.views_prev_7d;
  const trend =
    p.views_prev_7d === 0 && p.views_7d === 0
      ? ""
      : delta === 0
        ? " (same as last week)"
        : ` (${delta > 0 ? "+" : "−"}${Math.abs(delta)} on last week)`;
  return `${plural(p.views_7d, "view")}${trend} · ${plural(p.stars_7d, "new star")}`;
}

/** The week across all projects, for the weekly notification. */
export function weekSummary(doc: CoachDoc): { body: string; href: string } | null {
  const projects = (doc.projects ?? []).filter((p) => p.state !== "archived");
  if (projects.length === 0) return null;
  const step = nextSteps(doc)[0];
  const next = step ? ` Next: ${step.text}.` : "";

  if (projects.length === 1) {
    const p = projects[0];
    // The sentence has named the project already; the step says "it".
    const brief =
      step && step.projectId === p.id
        ? ` Next: ${step.text.split(quote(p.title)).join("it").replace(/^it /, "It ")}.`
        : next;
    return {
      body: `Your week on ${quote(p.title)}: ${weekLine(p)}.${brief}`.slice(0, 300),
      href: step?.href ?? `/projects/${p.id}`,
    };
  }
  const sum = projects.reduce(
    (a, p) => ({
      views_7d: a.views_7d + p.views_7d,
      views_prev_7d: a.views_prev_7d + p.views_prev_7d,
      stars_7d: a.stars_7d + p.stars_7d,
    }),
    { views_7d: 0, views_prev_7d: 0, stars_7d: 0 },
  );
  return {
    body: `Your week across ${projects.length} projects: ${weekLine(sum)}.${next}`.slice(0, 300),
    href: step?.href ?? "/analytics",
  };
}
