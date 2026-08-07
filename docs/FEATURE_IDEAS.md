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
9. **AI Gardener phase 2** — stall nudges ("projects like yours get moving
   with one concrete ask") and dignified off-ramps, per PRD §3.9, now easy
   on the DeepSeek pipe. Success metric stays anti-metric-guarded. *(M)*
10. **Reputation & skills** — auto-assembled from confirmed contributions
    (PRD §3.5) + the private impact score. Unlocks "trusted to attest". *(L)*
11. **Project templates / playbooks** — "start a repair café" kit: proven
    steps, first-event template, what help to ask for. Templates come from
    completed projects — the acknowledgment ledger becomes a cookbook. *(M)*
12. **Co-organizer role** — founder can promote a teammate to co-organizer
    (accept joins, create events). Progression-as-responsibility, and it
    de-risks the flaky-founder problem beyond attestation bypass. *(M)*
13. **Neighborhood milestones & annual recap** — collective celebration
    beats ("Aurora's 10th neighbor 🎉", "12 things built in 2026") in feed
    and a shareable year-recap page. Collective recognition only. *(M)*
14. **PWA install + push** — manifest, offline shell, opt-in push for the
    few notifications that matter (join request, confirmation, event
    tomorrow). The bridge until React Native. *(M)*

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
19. **Data export & privacy page** — download-my-data, clear ToS/privacy
    (needed before any press moment). *(S)*
20. **Accessibility pass** — keyboard flows, focus states, contrast audit,
    reduced-motion for confetti. *(M)*

## Rejected (recorded so they stay rejected)

- **Public view counts on cards** — views are private, owner-only analytics;
  public numbers become vanity metrics (UX §6).
- **Comment threads on projects** — general-purpose comments invite
  performative posting; *updates* (founder) + *chat* (team) + *contributions*
  (record) cover the real needs without a like-economy surface.
- **Trending/algorithmic feed** — the feed stays chronological and scoped;
  no engagement optimization.

*Sizes: (S)mall = a session, (M)edium = a day-ish, (L)arge = several days.*
