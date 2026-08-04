# Peoplearound — Incentives

*The living record of every motivation mechanic: what ships, why it's safe, and what's next.*

> The test for any incentive (from [PRD §3.10](PRD.md#310-recognition-and-progression--p1)): does it reward being acknowledged for real help, or does it reward activity for its own sake? **Only the former ships.**

## 1. Principles (inherited, non-negotiable)

Every incentive in this document must pass all five. These come from the
[Concept](CONCEPT.md), [PRD](PRD.md#310-recognition-and-progression--p1), and
[UX anti-patterns](UX_SPEC.md#6-ux-anti-patterns-do-not-build), and they do not
get relaxed under growth pressure:

1. **Recognition follows, never baits.** Status arrives after a real fact, it is never dangled to drive activity.
2. **Facts, not points.** Every incentive is a true statement about the world ("first member", "brought 4 neighbors"), never an abstract score.
3. **No leaderboards of individuals.** Scarcity and pride are fine; ranking neighbors against each other is not.
4. **No punishment, no streaks.** Absence and leaving are never penalized; nothing breaks.
5. **Derived, not writable.** Wherever possible an incentive is computed from existing records (join order, attributed sign-ups) — no gameable counters.

## 2. Shipped

### 2.1 Founding Neighbors ✅ *(2026-08)*

**The mechanic:** the first 10 members of any location are its Founding
Neighbors, permanently. Derived purely from `community_members` join order —
no schema, no counter, no gaming surface.

**Why it works:** real scarcity (only 10 ever exist, by definition), real
legacy ("I started Peoplearound in Aurora"), and it targets the moment
motivation peaks and the product is loneliest — being early somewhere empty.

**Surfaces today:** the founding-era banner on the home feed (see 2.3).
**Surfaces planned:** 🌱 badge on profiles and project team lists; "Founding
neighbor of Aurora" line in the Me page's deeds record.

### 2.2 Personal invite links with attribution ✅ *(2026-08)*

**The mechanic:** every user has a personal link (`/login?via=<id>`). A
sign-up through it stamps `profiles.invited_by` — once, never overwritten,
self-invites blocked by a DB constraint. The inviter's record then carries a
fact: *"brought N neighbors here."*

**Why it works:** it is the same deeds-not-declarations currency as
contributions. No referral points, no rewards catalog — just permanent,
attributed credit for the single most valuable act during cold start.

**Surfaces today:** the founding-era banner ("You've brought 3 neighbors here
already") and `/invite`.
**Surfaces planned:** the Me page deeds timeline; the neighborhood's history
("Maria brought 4 of Aurora's first 10 neighbors").

### 2.3 The founding-era mission banner ✅ *(2026-08)*

**The mechanic:** while a location has fewer than 10 neighbors, the feed
leads with a warm banner: the neighborhood's name, "N of 10 founding spots
taken", the viewer's founding rank if they have one, their brought-count,
and a one-tap copy of their personal invite link. At 10 neighbors it retires
forever.

**Why it works:** it makes growth a *collective, finite mission* (allowed:
collective recognition) instead of an individual chase, and it removes
itself the moment the job is done — recognition that fades is recognition
that never becomes bait.

### 2.4 The first-neighbor moment ✅ *(2026-08)*

**The mechanic:** a visitor from uncovered territory sees *"You're in
{place} — brand new to Peoplearound! Sign up to put it on the map and be its
first neighbor."* Signing up literally creates the location, with them as
member #1 (see [ARCHITECTURE — frontier locations](ARCHITECTURE.md#frontier-locations-live)).

**Why it works:** founding a place is the strongest identity hook the
product has, and it doubles as the anti-bot wall — a place only exists once
a real account claims it.

### 2.5 Badges v1 — evidence, not trophies ✅ *(2026-08)*

**The mechanic:** seven badges, every one **derived from confirmed records
at read time** (`src/lib/badges.ts` — no badge table, no counters, nothing
to farm):

| Badge | Certifies |
|---|---|
| 🌱 Founding Neighbor | One of the first 10 in a location (join order) |
| 🛠️ First Confirmed Help | First contribution confirmed by a neighbor |
| 🤲 Trusted Hands | 5 confirmed contributions |
| 👀 Witness | Attested 3 neighbors' contributions |
| 🙋 Showed Up | A confirmed *presence* contribution |
| 💡 Made It Real | Founded a project a team carried to completion |
| 🌟 Brought the Neighbors | 3 sign-ups through their invite link |

**Design language:** brand-letter patches (SVG — the chunky "P" silhouette
in deep navy with a pale outline, the achievement icon seated in the bowl,
a folded gradient ribbon carrying the label, celebratory specks), scout-patch
style, sized for real product UI, each badge with its own color identity.
**Earned badges only** — no locked/greyed teasers, because dangling
unearned badges is bait (§1.1). Rendered on the profile page with the fact
each badge certifies written underneath.

**The unlock moment:** a new badge gets exactly one celebration — a
full-screen moment with confetti, a soft glow, the patch presented on a
card, and the fact it certifies ("A neighbor confirmed your first
contribution"). Celebrated-state is remembered per user (localStorage), so
the party never repeats; the UX spec's one-warm-flourish allowance applies
here because the trigger is always acknowledged help, never activity.

**Decision recorded:** a **visible point system was rejected** (see §4) —
points invite optimizing the number instead of the neighbor. The PRD's
*private* impact score remains deferred to Phase 1, when reputation's
impact-weighting exists (a number without weighting degenerates into volume
counting).

## 3. Pipeline (design-approved, not yet built)

Ordered by leverage; each entry must still pass §1 at build time.

1. **Badge surfacing beyond the profile** — founding/trusted marks on team lists and attestation lines. Cheap (derived data already exists), compounds 2.1/2.5.
2. **Founder privileges as responsibility** — founding neighbors can set their neighborhood's description/photo and host its first event. Progression unlocks *responsibility, not vanity* (PRD §3.10).
3. **Neighborhood milestones** — collective celebration beats in the feed and history: "Aurora reached 10 neighbors 🎉", "Aurora's first completed project". Celebrates the place, never ranks people.
4. **Invite context in the acknowledgment loop** — when someone you brought gets their first confirmed contribution, you get a quiet moment too: "Maria — who you brought here — just helped complete the garden." Connects the two currencies.
5. **First-project quest for new locations** — after founding, one gentle prompt: "Every neighborhood starts with one idea — share yours." Invitational, one-time, dismissible.
6. **Digital → physical founding artifact** *(post-pilot)* — at 10 neighbors, the founding cohort gets something real (a printable "Founded by" poster for the coffee shop notice board). The reward escapes the app entirely.

## 4. Explicitly rejected

Recorded so they stay rejected when growth pressure argues for them:

- **A visible point system** *(rejected 2026-08)* — the attention economy's core primitive; the moment there's a number, people optimize the number instead of the neighbor. Fails §1.2 and §1.3 outright. The only sanctioned number is the PRD's *private, impact-weighted* score — own eyes only, Phase 1.
- **Locked-badge teasers** *(rejected 2026-08)* — greyed-out "here's what you could earn" grids are recognition dangled as bait; badges appear only after the fact they certify.
- **Referral rewards/discounts/credits** — makes inviting transactional; the product has no money and the inviter's motive must stay social.
- **Invite leaderboards** ("top inviters this month") — ranks individuals; makes the lonely feel behind.
- **Founding status for sale or extension** ("11th? Share to unlock a spot!") — manufactured scarcity is bait; real scarcity is the point.
- **Streak-based promotion mechanics** — punishes absence.
- **Vanity metrics on the banner** (views, clicks of your link) — activity volume, not acknowledged help.

## 5. Measuring (without corrupting)

Track these to know if incentives *work*; never surface them as user-facing
scores:

- Share of new locations that reach 10 neighbors within 60 days (founding-era conversion).
- Share of sign-ups arriving via personal links (`invited_by` set).
- Median invites-that-stuck per founding neighbor.
- **Anti-metric:** any incentive that raises sign-ups but not the [north star](ROADMAP.md#success-metrics) (attested contributions per active user) is decoration — revisit it.
