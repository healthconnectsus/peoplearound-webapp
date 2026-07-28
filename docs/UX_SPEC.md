# Peoplearound — UX Specification

**Share an idea. Build it together.** · *UX Specification · Draft v2 (project pivot)*

> Every screen should make a person feel the neighborhood is alive, that they are needed, and that what they did was seen.

## Contents

1. [UX principles](#1-ux-principles)
2. [Navigation and information architecture](#2-navigation-and-information-architecture)
3. [Onboarding flow](#3-onboarding-flow)
4. [Key screens](#4-key-screens)
5. [Tone and visual direction](#5-tone-and-visual-direction)
6. [UX anti-patterns (do not build)](#6-ux-anti-patterns-do-not-build)

---

## 1. UX principles

These principles decide every screen-level tradeoff. When a design choice is unclear, the answer is whichever option better serves these.

- **Presence over performance.** The UI shows what people are building together, not what they're saying about themselves. No vanity feed, no infinite scroll.
- **Low activation energy.** Every screen offers one obvious small action a lost or hesitant person can take — star, ask to join, RSVP — before any big commitment.
- **Acknowledgment is the emotional peak.** The single most important moment in the product is a person learning their contribution was confirmed — with being *accepted onto a team* as its little sibling. The UI treats both as celebrations, not buried notifications.
- **Failure is invisible and gentle.** No screen ever displays a project as failed. Quiet projects are softened, reframed, or redirected.
- **Recognition follows, never baits.** Badges and progress appear after real contribution; they are never dangled to drive activity.
- **Local and calm.** Hyperlocal scope keeps volume low and human. The app should feel like a town square, not a stadium.

## 2. Navigation and information architecture

Web today (header nav: feed · share an idea · sign out); the mobile app maps the same jobs to a bottom tab bar.

| Tab | Primary content | Job it serves |
|---|---|---|
| **Around** | "What's happening?" feed | "Show me my neighborhood is alive right now." |
| **Projects** | Browse / search local projects | "Find something I'd love to help build." |
| **Create (+)** | New project / event / offer | "Share my idea, or offer what I have." |
| **Offers** | Give / lend / offer board | "See what neighbors are sharing; offer my own." |
| **Me** | Your deeds, badges, projects | "See what I've built and what needs me." |

> The **Create** button sits center of the tab bar but is deliberately not the loudest element. We want people to feel they can join others before being pushed to broadcast their own idea.

## 3. Onboarding flow

**Goal:** get a new (possibly lonely or skeptical) person to one small, real action fast — ideally a star or a join request, not a project creation.

1. **Welcome** — one line on what Peoplearound is ("Share an idea. Build it together — with the people around you"). No sign-up wall yet.
2. **Locate** — request location to find the user's neighborhood. Explain plainly why (everything here is local).
3. **Verify neighborhood** — confirm the detected neighborhood; this becomes the user's scope.
4. **Auth** — phone or email via Supabase Auth. Kept late so the person sees value first.
5. **First taste** — immediately show the live feed with 2–3 active local projects and a gentle prompt: "See something you'd be glad existed? Tap the star."

> **First action target:** a star or a join request within the first session — never "share your first idea" as the onboarding ask. We lower activation energy, not raise it.

## 4. Key screens

### 4.1 Around (What's happening?)

The home tab. A calm, location-scoped feed of life nearby. *(Basic version live: project cards with category emoji, founder, relative time, team size, star count.)*

- Card types: active project updates, upcoming events, new teammates joining, recently acknowledged contributions, new offers.
- Each card has one clear lightweight action (star, ask to join, RSVP, view).
- Recently-acknowledged cards quietly celebrate neighbors ("Maria's garden reached its first planting day — 6 neighbors built it together") — modeling the behavior we want.
- No engagement-maximizing infinite scroll; feed is finite and refreshes, valuing calm over time-on-app.

### 4.2 Project page (living page)

The heart of the product. Persistent, stateful, story-like. *(Live: header, state badge, team list, join flow, star; history timeline to come.)*

- **Header:** title, founder, current state (idea / building / completed), star + team counts.
- **Primary actions:** ⭐ Star · 🤝 Ask to join — with context-aware microcopy that always tells you where you stand ("Your request is with Maria", "You're on the team").
- **The team:** founder badged as Founder, plus accepted collaborators. Founders see pending join requests inline with Accept / Decline.
- **History timeline** *(planned)*: the accumulating true story — stars, joins, accepted contributions (with who), events, milestones. This is the screen's emotional core.
- **Founder-only controls:** review join requests, update state, create events — visually quiet, not dominating the page.

> The history timeline, not a photo or a like count, is the hero of the project page. The making is the product.

### 4.3 Share-an-idea flow *(live)*

How an idea becomes a joinable project. Must feel like talking to a neighbor, not filling in a government form.

1. **Just talk it out** — a free-form box invites the person to describe the idea in their own words; a mic button lets them literally say it out loud (browser speech recognition).
2. **✨ Shape my idea** — Claude turns the rough description into a clear title, warm first-person description, category, and stage, prefilling the form. One gentle tip suggests the most useful missing detail. Suggestive, never blocking — the manual form always works without it.
3. **Review and edit** — every AI-filled field stays editable; category is a row of tappable emoji pills, stage is two friendly cards ("💭 Just an idea" / "🚀 Already building").
4. **Share it 🎉** — the project goes live on the feed.

### 4.4 Join flow *(live)*

The bridge from interest to team.

1. Tap **🤝 Ask to join** on a project. The page explains: the founder reviews requests.
2. While pending: status shown honestly ("⏳ Your request is with Maria"), with a no-stigma **Cancel request**.
3. Founder sees **Wants to join (n)** with Accept / Decline per person.
4. On accept: the joiner appears in "The team" — a small celebratory beat ("🎉 You're on the team").
5. **Leave project** is always available, framed neutrally; prior confirmed contributions are retained.

### 4.5 Contribute flow *(planned)*

How a teammate logs help. Must feel easy yet produce a real, attributable record.

1. Tap **Contribute** on a project.
2. Choose type: knowledge, resource, skill, time, or presence.
3. Describe briefly what you're offering or did.
4. Submit → status `logged`. The founder is notified to accept.
5. On founder acceptance + one co-attestation → status `confirmed`, and the contributor gets the celebratory acknowledgment moment ([4.6](#46-the-acknowledgment-moment)).

### 4.6 The acknowledgment moment *(planned)*

The emotional peak of the entire product, and therefore the most carefully designed screen.

- Triggered when a contribution becomes confirmed (founder accepted + co-attested).
- A warm full-screen moment: *"Maria confirmed your help on the Oak Street garden. You were needed — and you showed up."*
- Shows who acknowledged it and adds the deed to the user's permanent record; any badge earned surfaces here, as recognition after the fact.
- Tone is sincere, not gamey — confetti-light. The reward is being seen by a person, not points popping.

### 4.7 Acknowledge / attest flow (founder + community) *(planned)*

How credit gets confirmed without a single point of failure.

- Founder sees pending contributions with a clear **Accept** action.
- Teammates and stargazers who witnessed a contribution can **Attest** ("Yes, I saw this happen"). Cannot attest your own.
- If the founder is unresponsive past a window, community attestation alone can confirm — the UI surfaces this path so contributors aren't stuck.

### 4.8 Events *(planned)*

- Created from a project: title, time, place.
- Simple **Join / not** (GroupMe-style). RSVP is coordination only — no count of "no-shows," ever.
- Post-event prompt to the founder: acknowledge who contributed (feeds [4.6](#46-the-acknowledgment-moment)).
- Event cards surface prominently in Around as the easiest on-ramp.

### 4.9 Offers (give / lend / offer) *(planned)*

- A board of things neighbors will give, lend, or offer. No prices, no checkout — there is no money in the product.
- An offer can be attached to a project, converting it into a contribution there.
- Clear give vs lend vs offer-a-skill labels; simple request/claim interaction.

### 4.10 Me (profile as a record of deeds) *(planned)*

The anti-LinkedIn, anti-Facebook profile. Worth measured in confirmed deeds, not declarations.

- **Header:** name, neighborhood, a one-line auto-assembled summary ("Trusted on community projects; known by 30 neighbors").
- **Deeds timeline:** confirmed contributions with who acknowledged them — the resume of mattering.
- **Badges:** attested milestones, shown as evidence of real help.
- **Personal impact:** a private progress view (own eyes mainly); no comparison to others.
- **My projects:** projects you founded or joined, with their states and gentle agent suggestions.

> No public ranking of people appears anywhere in the app. Collective and project-level recognition is allowed; individual leaderboards are not.

### 4.11 AI agent surfaces

- **At creation** *(live)*: the "Just talk it out" box — voice or text in, a shaped draft out, everything editable. Suggestive, never blocking.
- **On a stalling project** (founder-only, private) *(planned)*: a gentle card with one concrete next step. Coach tone.
- **Off-ramp** *(planned)*: for a quiet project, a private, kind prompt offering a smaller version or a nearby active project to join. Never the word "failed."
- **Visual treatment:** the agent is visibly secondary — small, calm, dismissible. It must feel like scaffolding that fades, not a character the user relates to instead of people.

## 5. Tone and visual direction

- **Mood:** warm, calm, human — a town square at golden hour, not a neon arcade or a corporate network.
- **Palette:** grounded greens and warm neutrals; the emerald accent signals growth and contribution. *(Live: emerald-600 primary, category emoji, rounded-2xl cards.)*
- **Faces over avatars-as-brands:** real people, real neighborhood; photography and faces emphasize presence.
- **Restraint with metrics:** numbers are small and quiet; stories and faces are large. We celebrate deeds, not dashboards.
- **Motion:** gentle. The acknowledgment moment is the one place we allow a warm flourish.

## 6. UX anti-patterns (do not build)

- Infinite-scroll engagement feed optimized for time-on-app.
- Public leaderboard ranking individual neighbors.
- Streak counters or guilt mechanics that punish absence.
- Any screen that displays or implies a project "failed."
- Like/reaction counts presented as the primary signal of worth.
- Badges or rewards dangled before contribution to drive activity.
- A cash marketplace / checkout (offers are non-monetary in MVP).
- An AI agent prominent enough that people relate to it instead of to neighbors.

> If a screen would make a person feel watched, ranked, behind, or like a product being sold — it does not ship, however much it would boost engagement.
