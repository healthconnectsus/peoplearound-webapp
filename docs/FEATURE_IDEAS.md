# Peoplearound — Feature Backlog

*A living list of proposed features. Each entry must serve the mission
(restore the feeling of mattering) and respect the guardrails in
[UX_SPEC §6](UX_SPEC.md#6-ux-anti-patterns-do-not-build) and
[INCENTIVES §1](INCENTIVES.md#1-principles-inherited-non-negotiable).
Move entries to the [ROADMAP](ROADMAP.md) when scheduled; record rejected
ones at the bottom so they stay rejected.*

## Tier 1 — sharpen the loop we already have (pilot-critical)

1. ~~**Real photo uploads**~~ ✅ *shipped 2026-08* — public `projects`
   storage bucket (migration 0021), reusable `PhotoPicker`, cover photo in
   the wizard and owner-editable on the project page, photos on updates.
   *(Remaining: event photos.)*
2. ~~**Project updates (founder posts)**~~ ✅ *shipped 2026-08* — founder and
   accepted teammates post text+photo progress notes (`project_updates`,
   migration 0021); each lands in the history timeline as a 📣 beat.
3. ~~**Notification inbox + email digest**~~ ✅ *shipped 2026-08* —
   `notifications` table with trigger fan-out (migration 0025), persistent
   bell with unread styling + mark-all-read, weekly Resend digest via Vercel
   Cron (Saturdays; quiet weeks send nothing; Settings opt-out).
4. ~~**Onboarding first-action nudge**~~ ✅ *shipped 2026-08* — checklist
   card for young accounts ("star an idea · say I'm in to one event"),
   retires itself once both are done.
5. ~~**Search & filters**~~ ✅ *shipped 2026-08* — server-rendered filter
   chips (category, hands-nearby/online, "event soon") composing with `q`
   search as shareable URLs.
6. ~~**Add-to-calendar for events**~~ ✅ *shipped 2026-08* — Google Calendar
   link + .ics download on every upcoming event (floating local times).
7. ~~**Admin console**~~ ✅ *shipped 2026-08* — `/admin` (gated by
   `profiles.is_admin`): health strip, flag review queue (clear / archive),
   community rename + city + delete-empty. Every action re-verifies admin
   before using the service role.

8. ~~**Private analytics page**~~ ✅ *shipped 2026-08* — `/analytics`:
   headline numbers, the looking→helping funnel (views → stars → requests →
   teammates → confirmed help), a 30-day view trend, and a per-idea table.
   Owner-only; never comparative (migrations 0020 + 0022).

## Tier 2 — deepen (Phase 1 material)

8. ~~**Offers: give / lend / offer board**~~ ✅ *shipped 2026-08* —
   `/offers` (migration 0027): post give/lend/skill offers with a photo,
   claim with one tap, poster can put a claim back on the board. Community-
   scoped, rate-capped, claim notifies the poster. No money anywhere.
9. ~~**AI Gardener phase 2**~~ ✅ *shipped 2026-08* — weekly cron finds
   quiet projects and writes ONE private nudge to the founder (stall: a
   concrete next step; 21+ days: a dignified off-ramp). Founder-only,
   dismissible, never says "failed" (migration 0029).
10. ~~**Reputation & skills**~~ ✅ *shipped 2026-08* — "What neighbors trust
    you with" on the profile: skills derived from confirmed contributions,
    ranked by how many distinct neighbors attested (impact, not volume);
    contextual summary line. No score, no leaderboard. *(Private impact
    score still deferred.)*
11. ~~**Project templates / playbooks**~~ ✅ *shipped 2026-08* —
    `/playbooks`: 8 proven starting points (repair café, community garden,
    walking group, little free pantry, tool library, skill swap, senior tech
    hour, block cleanup). Each carries a first step and an explicit "what to
    ask for" list — a vague ask is the top reason an idea gathers nobody.
    "Start from this" prefills the wizard at step 1; every word stays
    editable. As real projects complete, their histories become the next
    playbooks.
12. ~~**Co-organizer role**~~ ✅ *shipped 2026-08* — founders promote a
    teammate; co-organizers accept joins, run events, and accept others'
    contributions (never their own; only founders promote). Migration 0028.
13. ~~**Neighborhood milestones & annual recap**~~ ✅ *shipped 2026-08* — a
    milestone banner on the feed when the neighborhood crosses a threshold
    (10/25/50/100/250/500 neighbors; 1/5/10/25/50 things built), plus
    `/recap?year=` — the neighborhood's year in counts and top categories.
    Derived on read, never stored. About the place: no person is named,
    ranked, or thanked more than another.
14. ~~**PWA install + push**~~ ✅ *shipped 2026-08* — web manifest +
    maskable icons + shortcuts, a service worker with an `/offline` fallback
    (network-first, no HTML caching — this app's pages are permission-
    scoped), a one-line install invitation that never returns once dismissed,
    and opt-in Web Push. Push is a *delivery channel* for the existing
    notifications table, drained by a 10-minute cron: already-read
    notifications are skipped, dead endpoints pruned, opt-out in Settings
    (migration 0032). The bridge until React Native.

### Added on request

20. ~~**Small help ("a hand for 20 minutes")**~~ ✅ *shipped 2026-08* —
    `/asks`: post a need with an honest time estimate (10 min → half a day),
    optional when/where/photo; neighbors tap "I'll help". Stored as a `need`
    kind on `offers` (migration 0033), so scoping, rate caps, claim rules and
    ~110 m location blunting come from the board. Open asks ride the top of
    the home feed. Also fixed a hole this exposed: a claimer could rewrite a
    poster's content while claiming (migration 0034).

## Tier 3 — widen (post-pilot)

15. **Multi-language** — the AI shaper already answers in the user's
    language; localize the UI (start with Spanish for Aurora). *(L)*
16. **Neighborhood verification** — phone + address when scale demands it
    (already in ARCHITECTURE as the later phase). *(L)*
17. **City pages** — a public, read-only "what's being built in Aurora"
    page (aggregate, no personal data) for city partners and press; the
    landing page teaser, city-sized. *(M)*
18. **Embeddable widget** — "ideas near you" iframe for library/city/school
    sites; every embed is a frontier funnel. *(M)*
19. ~~**Data export & privacy page**~~ ✅ *shipped 2026-09* —
    `/api/export-my-data` returns every row the account owns as one JSON
    file, read through the caller's own session so RLS decides what comes
    out; `/privacy` is public (readable before you sign up) and describes
    what the code actually does, including where it *doesn't* protect you.
    Both linked from the profile page, the rail and the public footer.
    *(Remaining: formal terms of service — a lawyer's job, not a
    developer's.)*
20. **Accessibility pass** — *partly shipped 2026-09*: a skip-to-content
    link (the rail was eleven tabs deep on every page), one visible
    `:focus-visible` ring app-wide (dark line + white halo, so it survives
    on brand fills and photos), and reduced-motion honoured. *(Remaining:
    a full screen-reader pass over the wizard and the map, and colour
    contrast on the pale status badges.)*

## Rejected (recorded so they stay rejected)

- **Public view counts on cards** — views are private, owner-only analytics;
  public numbers become vanity metrics (UX §6).
- **Comment threads on projects** — general-purpose comments invite
  performative posting; *updates* (founder) + *chat* (team) + *contributions*
  (record) cover the real needs without a like-economy surface.
- **Trending/algorithmic feed** — the feed stays chronological and scoped;
  no engagement optimization.

*Sizes: (S)mall = a session, (M)edium = a day-ish, (L)arge = several days.*
