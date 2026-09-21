import type { UserGrowth as Growth } from "@/lib/adminStats";
import { FunnelBar, Stat } from "./parts";

/**
 * Peoplearound's users, for admins (migration 0072).
 *
 * Every number counts real people only: accounts that have signed in at
 * least once. Demo accounts and sign-ups that never signed in would swamp
 * everything else — in September 2026 they were 217 of 222 accounts — so
 * they are left out, and shown once at the end so it is clear what was
 * left out and why.
 */

const H3 =
  "text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60";
const SUB = "mt-0.5 text-xs text-black/45 dark:text-white/45";
const CARD =
  "rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const count = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** Plain sentences about what the numbers say, the trend first. */
function insights(g: Growth): string[] {
  const { real, accounts, weeks, communities } = g;
  const out: string[] = [];

  const versus =
    real.last_30d > real.prev_30d
      ? `up from ${real.prev_30d} in the 30 days before`
      : real.last_30d < real.prev_30d
        ? `down from ${real.prev_30d} in the 30 days before`
        : "the same as in the 30 days before";
  out.push(
    `${count(real.last_30d, "real sign-up")} in the last 30 days, ${versus}.`,
  );

  // Demo neighborhoods only ever gain the team, testing; leave them out of
  // the question of where people are arriving.
  const growing = communities.filter((c) => !c.is_demo && c.real_30d > 0);
  out.push(
    growing.length > 0
      ? `Arriving lately in ${growing
          .slice(0, 4)
          .map(
            (c) =>
              `${c.name}${c.city && c.city !== c.name ? ` (${c.city})` : ""} +${c.real_30d}`,
          )
          .join(", ")} — new real members over the last 30 days.`
      : "No community outside the demo gained a real member in the last 30 days.",
  );

  if (real.total > 0) {
    const outside = real.total - real.in_community;
    out.push(
      `${real.did_something} of ${real.total} ${real.did_something === 1 ? "has" : "have"} done anything beyond signing up — started a project, starred one, joined a team, RSVP'd, offered help or sent a message. ` +
        (outside > 0
          ? `${outside} ${outside === 1 ? "is" : "are"} in no community yet.`
          : "All of them are in a community."),
    );
    out.push(
      `${real.active_7d} of ${real.total} used the site in the last 7 days, ${real.active_30d} in the last 30.`,
    );
  }

  if (accounts.real_admins > 0) {
    out.push(
      `${accounts.real_admins} of the ${real.total} real users ${accounts.real_admins === 1 ? "is an admin account" : "are admin accounts"} — the team itself.`,
    );
  }

  const never = accounts.dormant + accounts.unverified;
  if (never > 0) {
    const peak = weeks.reduce(
      (a, w) => (w.never_signed_in > a.never_signed_in ? w : a),
      weeks[0],
    );
    out.push(
      `${count(never, "sign-up")} never signed in and ${never === 1 ? "is" : "are"} left out of every number here.` +
        (peak && peak.never_signed_in >= 10
          ? ` ${peak.never_signed_in} of them came in the single week of ${day(peak.week)} — a burst like that is typical of automated sign-ups rather than people.`
          : ""),
    );
  }

  return out;
}

/** Real sign-ups per week: one series, so no legend — the title names it. */
function WeeklySignups({ weeks }: { weeks: Growth["weeks"] }) {
  const peak = Math.max(1, ...weeks.map((w) => w.real));
  const total = weeks.reduce((s, w) => s + w.real, 0);
  const last = weeks.length - 1;

  return (
    <section className="mt-6">
      <h3 className={H3}>Real sign-ups · last 12 weeks</h3>
      <p className={SUB}>
        {count(total, "person", "people")} in twelve weeks. Hover or focus a
        week for its numbers.
      </p>
      <div className={`mt-3 p-4 ${CARD}`}>
        <ol
          className="flex h-32 items-end gap-0.5 border-b border-slate-300 dark:border-slate-600"
          aria-label="Real sign-ups per week, oldest first"
        >
          {weeks.map((w, i) => {
            const label = `Week of ${day(w.week)}: ${count(w.real, "real sign-up")}${
              w.never_signed_in
                ? `, and ${count(w.never_signed_in, "sign-up")} that never signed in`
                : ""
            }`;
            // Keep the first and last tooltips inside the card.
            const anchor =
              i < 2
                ? "left-0"
                : i > last - 2
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2";
            const height = w.real > 0 ? Math.max((w.real / peak) * 100, 6) : 0;
            return (
              <li
                key={w.week}
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span
                  aria-hidden
                  className={`w-full max-w-6 transition-opacity group-hover:opacity-75 group-focus:opacity-75 ${
                    w.real > 0
                      ? "rounded-t bg-pa-brand"
                      : "bg-black/10 dark:bg-white/15"
                  }`}
                  style={{ height: height > 0 ? `${height}%` : "2px" }}
                />
                {/* Just above its own bar, not the top of the plot. */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-left shadow-md group-hover:block group-focus:block dark:border-slate-600 dark:bg-zinc-800 ${anchor}`}
                  style={{ bottom: `calc(${height}% + 8px)` }}
                >
                  <span className="block text-sm font-semibold">
                    {count(w.real, "real sign-up")}
                  </span>
                  <span className="block text-xs text-black/55 dark:text-white/55">
                    week of {day(w.week)}
                  </span>
                  {w.never_signed_in > 0 ? (
                    <span className="block text-xs text-black/45 dark:text-white/45">
                      + {w.never_signed_in} never signed in
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 flex justify-between text-[11px] text-black/40 dark:text-white/40">
          <span>week of {day(weeks[0].week)}</span>
          <span>peak {peak} a week</span>
          <span>this week</span>
        </div>

        {/* The same numbers without a pointer, and the ones the chart
            leaves out. */}
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/80">
            Show as a table
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[18rem]">
              <thead>
                <tr className="border-b border-slate-300 text-left text-black/45 dark:border-slate-600 dark:text-white/45">
                  <th className="py-1.5 pr-3 font-semibold">Week of</th>
                  <th className="px-3 py-1.5 text-right font-semibold">
                    Real sign-ups
                  </th>
                  <th className="py-1.5 pl-3 text-right font-semibold">
                    Never signed in
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr
                    key={w.week}
                    className="border-b border-slate-200 last:border-0 dark:border-slate-700"
                  >
                    <td className="py-1.5 pr-3">{day(w.week)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {w.real}
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums text-black/55 dark:text-white/55">
                      {w.never_signed_in}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

export function UserGrowth({ data }: { data: Growth }) {
  const { real, accounts, communities } = data;
  const before = real.total - real.last_30d;
  const growth =
    before > 0 ? ` (+${Math.round((real.last_30d / before) * 100)}%)` : "";
  const outside = real.total - real.in_community;
  const organic = Math.max(
    0,
    real.total - real.invited_by_neighbor - real.invited_by_admin,
  );

  return (
    <section
      aria-labelledby="site-users"
      className="mt-6 rounded-2xl border border-sky-600/25 bg-sky-50/50 p-4 sm:p-5 dark:border-sky-500/25 dark:bg-sky-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="site-users" className="text-lg font-bold">
          Peoplearound users
        </h2>
        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
          🛡️ Admins only
        </span>
      </div>
      <p className={SUB}>
        Real users only — accounts that have signed in at least once. Periods
        are calendar periods in UTC; weeks start on Monday.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Real users"
          value={real.total}
          hint={`+${real.last_30d} in the last 30 days${growth}`}
        />
        <Stat label="New this year" value={real.year} hint="since January 1" />
        <Stat
          label="New this month"
          value={real.month}
          hint={`last month: ${real.prev_month}`}
        />
        <Stat
          label="New this week"
          value={real.week}
          hint={`last week: ${real.prev_week}`}
        />
        <Stat
          label="Active in the last 7 days"
          value={real.active_7d}
          hint={`of ${real.total}`}
        />
        <Stat
          label="Active in the last 30 days"
          value={real.active_30d}
          hint={`of ${real.total}`}
        />
      </div>

      <section className="mt-6">
        <h3 className={H3}>What stands out</h3>
        <ul className={`mt-2 flex flex-col gap-2 p-4 text-sm ${CARD}`}>
          {insights(data).map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-black/35 dark:text-white/35">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <WeeklySignups weeks={data.weeks} />

      <section className="mt-6">
        <h3 className={H3}>Where they are</h3>
        <p className={SUB}>
          Communities with real users, those gaining most in the last 30 days
          first. Someone in two communities counts in both.
          {outside > 0
            ? ` ${count(outside, "real user")} ${outside === 1 ? "is" : "are"} in none yet.`
            : ""}
        </p>
        {communities.length === 0 ? (
          <p
            className={`mt-3 p-6 text-center text-sm text-black/55 dark:text-white/55 ${CARD}`}
          >
            No real user has joined a community yet.
          </p>
        ) : (
          <div className={`mt-3 overflow-x-auto ${CARD}`}>
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-black/45 dark:border-slate-600 dark:text-white/45">
                  <th className="px-4 py-2.5 font-semibold">Community</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Real users
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Last 30 days
                  </th>
                </tr>
              </thead>
              <tbody>
                {communities.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-300 last:border-0 dark:border-slate-600"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{c.name}</span>
                      {c.city && c.city !== c.name ? (
                        <span className="text-black/45 dark:text-white/45">
                          {" "}
                          · {c.city}
                        </span>
                      ) : null}
                      {c.is_demo ? (
                        <span className="ml-2 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-black/55 dark:bg-white/10 dark:text-white/55">
                          demo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {c.real_count}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {c.real_30d > 0 ? `+${c.real_30d}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className={H3}>How they arrived</h3>
          <dl className={`mt-2 flex flex-col gap-2 p-4 text-sm ${CARD}`}>
            {[
              ["Invited by a neighbor", real.invited_by_neighbor],
              ["Invited by an admin", real.invited_by_admin],
              ["Found the site themselves", organic],
            ].map(([label, n]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-black/60 dark:text-white/60">{label}</dt>
                <dd className="font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className={H3}>How far they got</h3>
          <ul className={`mt-2 flex flex-col gap-2 p-4 ${CARD}`}>
            <FunnelBar
              label="Signed in"
              value={real.total}
              max={real.total}
              color="bg-pa-brand"
            />
            <FunnelBar
              label="In a community"
              value={real.in_community}
              max={real.total}
              color="bg-pa-brand"
            />
            <FunnelBar
              label="Did something"
              value={real.did_something}
              max={real.total}
              color="bg-pa-brand"
            />
          </ul>
        </section>
      </div>

      <section className="mt-6">
        <h3 className={H3}>Left out of these numbers</h3>
        <p className={SUB}>
          Accounts that exist but aren&apos;t people using the site.
          {accounts.real_admins > 0
            ? ` The ${count(accounts.real_admins, "admin account")} above ${accounts.real_admins === 1 ? "is" : "are"} counted as real.`
            : ""}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Never confirmed an email"
            value={accounts.unverified}
          />
          <Stat
            label="Confirmed, never signed in"
            value={accounts.dormant}
          />
          <Stat
            label="Demo accounts"
            value={accounts.demo}
            hint="seeded, for the demo neighborhoods"
          />
          {accounts.test > 0 ? (
            <Stat
              label="Test accounts"
              value={accounts.test}
              hint="left by our own checks"
            />
          ) : null}
        </div>
      </section>
    </section>
  );
}
