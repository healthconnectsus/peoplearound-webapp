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

## 3. Onboarding flow *(live)*

**Goal:** get a new (possibly lonely or skeptical) person to one small, real action fast — ideally a star or a join request, not a project creation.

1. **Welcome** — the logged-out landing page: hero, live "ideas being built right now" teaser (anon-safe view), sign-up card. No wall before the taste.
2. **Locate, automatically** — the browser's location popup appears on arrival. Allowed + covered area → *"📍 You're near **Oak Street** — 34 neighbors are already here, building 12 ideas."* Allowed + uncovered → *"🎉 You're in **{place}** — brand new to Peoplearound! Sign up to put it on the map and be its first neighbor."* Declined → nothing, and we never nag.
3. **Auth** — email/password or magic link. Kept after the taste so the person sees value first.
4. **Neighborhood claimed silently** — the location match rides a cookie, so the first signed-in visit lands straight in the right neighborhood (or *creates* it, if they're founding somewhere new — see [ARCHITECTURE](ARCHITECTURE.md#frontier-locations-live)). The manual `/neighborhood` picker remains the fallback.
5. **First taste** — the live feed: map, pulse, "Happening soon", local projects. In small neighborhoods, the founding-era banner (see [INCENTIVES.md](INCENTIVES.md)) invites them to bring the next neighbors.

> **First action target:** a star or a join request within the first session — never "share your first idea" as the onboarding ask. We lower activation energy, not raise it.

## 4. Key screens

### 4.1 Around (What's happening?) *(live — map + zoned story feed)*

The home tab. A calm, location-scoped feed of life nearby, opening with the neighborhood as a *place*:

- **Pulse header** — the neighborhood's name plus proof of life: "34 neighbors · 6 projects building · 2 events this week · 5 contributions confirmed this month."
- **The map** — an OpenStreetMap view with an emoji pin per located project (pins pulse when the project has an event this week); tap a pin → project page. Physical proximity made visceral.
- **Happening soon** — upcoming events as the most prominent cards (the gentlest on-ramp).
- **Three zones, local first** — "On your streets" (full cards), "Around {city}" (full cards), "🌍 From anywhere" (compact rows). Wider reach never crowds out local.
- **Story-beat cards** — each card leads with its freshest human moment ("🙌 Amara's help was confirmed yesterday", "⭐ 4 neighbors starred this this week", "📅 Build day Saturday · 6 going") instead of dead metadata; team members appear as initial-avatars, categories as color accents.
- No engagement-maximizing infinite scroll; feed is finite and refreshes live (Supabase Realtime), valuing calm over time-on-app.

### 4.2 Project page (living page)

The heart of the product. Persistent, stateful, story-like. *(Live: cover photo, header, state badge, team list, join flow, star, sticky map, updates, contributions, history timeline, report control.)*

- **Header:** title, founder, current state (idea / building / completed), star + team counts.
- **Primary actions:** ⭐ Star · 🤝 Ask to join — with context-aware microcopy that always tells you where you stand ("Your request is with Maria", "You're on the team").
- **The team:** founder badged as Founder, plus accepted collaborators. Founders see pending join requests inline with Accept / Decline.
- **History timeline** ✅ *(live: "The story so far")*: the accumulating true story — the idea, stars (day-clustered), joins, confirmed contributions (with who), events held, completion. This is the screen's emotional core.
- **Founder-only controls:** review join requests, update state, create events — visually quiet, not dominating the page.

> The history timeline, not a photo or a like count, is the hero of the project page. The making is the product.

### 4.3 Share-an-idea flow *(live — step-by-step wizard)*

How an idea becomes a joinable project. Must feel like talking to a neighbor, not filling in a government form. One question at a time, with a quiet progress bar:

1. **Your idea** — "Just talk it out": a free-form box (typed, or spoken via the mic button) and **✨ Shape my idea** — the AI turns the rough description into a clear title, warm description, category, and stage, then advances to the prefilled draft. A rail of ten example ideas gives a one-tap starting point; if the assistant is unavailable, a "continue without AI" path appears.
2. **The basics** — title, description, category pills, stage cards ("💭 Just an idea" / "🚀 Already building"). Every AI-filled field stays editable.
2b. **A photo** *(optional)* — a real picture of the place or the thing, downscaled in the browser before upload.
3. **Who can help** — two friendly card rows: what help is needed (🏠 hands nearby / 💻 online help / 🤝 both) and who can find it (🏘️ my neighborhood — recommended default / 🏙️ my city / 🌍 anywhere), plus an optional map pin.
4. **Share it 🎉** — a review card showing exactly what neighbors will see, then the project goes live on the feed.

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

### 4.11 My Communities *(live — `/neighborhood`)*

- **Yours**: the communities you belong to, with your primary one marked (⭐ Primary decides your home feed); set-primary and leave are one tap.
- **Discover**: every other community — neighborhoods and cultural / hobby / identity / geographic / interest networks — with kind badges; join is one tap.
- **Create**: any signed-in user can start a community; new-location onboarding creates neighborhood communities automatically.

### 4.12 Chats *(live — `/chats`)*

- Conversation list with unread indicators (`last_read_at`); realtime message delivery.
- A calm, utilitarian surface: coordination for teams and events, not an engagement channel — no read-receipt pressure, no typing-indicator theater.

### 4.13 Updates — the build log *(live)*

- Founder and accepted teammates post short progress notes with an optional photo ("We got the permit — planting day is on!").
- Each update becomes a 📣 beat in the project's history timeline, so the story captures the middle, not just milestones.
- Deliberately not comments: only the team can post, so the page stays a build log rather than a like-economy surface.

### 4.14 Report an idea *(live)*

- A quiet "🚩 Report this idea" control at the foot of a project (never your own), with five reasons and an optional note.
- Says plainly: a community admin reviews personally, nothing disappears automatically, the founder is never told who reported.
- Reporters can undo. Flag counts are invisible to everyone — no project ever displays as "under fire."

### 4.15 Your analytics *(live — `/analytics`)*

- Private to the user: headline numbers, the looking→helping funnel (views → stars → requests → teammates → confirmed help), a 30-day view trend, and a per-idea table.
- Views count unique neighbors per day and never identify who looked; the owner's own visits don't count.
- Never comparative — no ranking against other founders, in line with §6.

### 4.16 AI agent surfaces

- **At creation** *(live)*: the "Just talk it out" box — voice or text in, a shaped draft out, everything editable. Suggestive, never blocking.
- **On a stalling project** (founder-only, private) *(planned)*: a gentle card with one concrete next step. Coach tone.
- **Off-ramp** *(planned)*: for a quiet project, a private, kind prompt offering a smaller version or a nearby active project to join. Never the word "failed."
- **Visual treatment:** the agent is visibly secondary — small, calm, dismissible. It must feel like scaffolding that fades, not a character the user relates to instead of people.

### 4.17 The map shell *(live, app-wide)*

Every "what's around me" surface — the feed, project pages, Local Faves,
Groups, Events, Offers, People around, My Communities — uses one shared
`MapShell`: content scrolls on the left, a sticky full-height map sits on the
right. Each page pins what's relevant to it (your faves; the projects hosting
upcoming events; nearby projects; community centres), and the map is dropped
entirely when a page has nothing to pin — an empty gutter is worse than no
map. Local pins are favoured over distant ones so the view frames your
neighborhood rather than a continent.

**Spatial context without exposure** — three deliberate rules:
- **Offers** carry an *approximate* spot: the poster drops a rough pin (a
  corner, a block) plus optional free text like "5th & Oak", and it is
  rounded to ~110 m in the action *and* again by a database trigger. The UI
  says so plainly: "pick a corner or a block, not your door."
- **People** are never pinned individually. The People map shows **community
  clusters with headcounts** ("Aurora · 34 neighbors") — you learn where
  people are without learning where anyone lives.
- **Groups** pin the community's own centre, not its members.
- **Your own profile map** shows *your* world — your spot (📍, ~1.1 km
  blunted, stored in an own-row-only table and visible to nobody else), your
  communities, your ideas, the ideas you starred, and events you host or
  joined. You can set, move, or forget your spot at any time.

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


## Playbooks, milestones, and the installed app

### Playbooks (`/playbooks`)

Proven starting points for people who open the wizard and freeze. Each card
carries a first concrete step and an explicit *what to ask for* list, because
a vague ask is the most common reason an idea never gathers anyone. "Start
from this" opens the wizard at step 1, prefilled — and every word stays
editable, so a playbook is a running start, not a template to fill in. As real
projects reach completion, their histories become the next playbooks.

### Milestones and the annual recap

A single banner appears on the feed when the *neighborhood* crosses a
threshold — 10/25/50/100/250/500 neighbors, or 1/5/10/25/50 things built.
`/recap?year=` gives the same year in full: neighbors, ideas, things
finished, acts of help confirmed, times met in person, things given, and the
categories the year went into. Both are derived on read.

Rule, not preference: milestones celebrate the **place**. No individual is
named, ranked, or thanked more than another, and there is no leaderboard —
the same rule that governs badges and reputation. A quiet year shows an
honest empty state rather than inflated numbers.

### Installed app and push

Peoplearound is used standing in a doorway or walking past the lot in
question, so it installs: manifest, maskable icons, shortcuts (Start an idea ·
Around me · Messages), and an `/offline` fallback page. The service worker is
deliberately network-first and caches **no app HTML** — nearly every page is
permission-scoped, and a stale cached page could show someone content they no
longer have access to.

The install invitation is one quiet line at the bottom of the screen, shown
only when the browser says the app is installable, and never shown again once
dismissed. An app that nags to be installed has not earned it.

Push is opt-in from Settings and never requested on page load — an unprompted
permission dialog gets denied forever and costs the channel permanently. It
carries only the notifications that already exist (someone joined, someone
confirmed your help, something is planned nearby), on a ten-minute cron. That
lag is the point: a neighborhood is not an emergency. Anything you already
read in-app never reaches your phone.


## Small help (`/asks`)

> "Move a sofa into the living room." Twenty minutes and a second pair of
> hands — no team, no history, no arc.

Not every need is an idea, and the project wizard would be absurd here. Small
help gets its own board and its own one-screen composer: what you need, an
estimated time, and optionally when, where, and a photo. Nothing else.

**The time estimate is the feature.** "20 min" is a decision a neighbor can
make standing in their kitchen; "help me move" is a commitment they have to
think about, and thinking about it is where the yes dies. The composer offers
six honest sizes (10 min → half a day) rather than a free-text field, because
a number someone can picture is what gets answered.

Design rules:

- **Asking costs nothing and is never justified.** No reason field, no
  reciprocity counter, no money anywhere. The page says it out loud: asking is
  not a favor you owe back.
- **Either side can step back.** The helper's "I can't after all" is a first-
  class button, not a message you have to compose to a stranger. A helper with
  no exit ghosts instead.
- **Asks expire socially, not technically.** Done removes the row — a small
  ask has no history worth keeping, and nobody needs a permanent record of the
  day they couldn't lift a sofa alone.
- **It rides at the top of the feed.** An ask for Saturday is worthless on
  Sunday, so open asks appear on the home feed rather than on a page you have
  to remember to visit.
- Location is approximate on the same terms as offers — a corner or a block,
  rounded to ~110 m, never a doorstep.


### The wizard opens with intent, not content

/projects/new begins with "What are we talking about?" — three cards: meet
people over an activity, an idea for the community, or a personal project.
The choice doesn't fork the data model; it tunes the register of everything
after it: the talk-it-out placeholder, the example rail, the prefilled
category, the basics heading, and the context the AI shaper writes in. A
walking-buddy post and a community-garden post shouldn't sound alike.
Playbooks skip the question — a playbook is a community idea by definition.

### The wizard wears the colour you picked

Once you choose a type on step 1 (sky / emerald / violet), that colour
follows you: both step trackers, the quick-pick selection ring, every
primary button (Shape my idea, Continue, Share it), the category chips, and
the "Where are you at?" / "Who can help" radio cards all switch to it. Before
you've picked — step 1 itself — the wizard stays a neutral dark grey rather
than defaulting to emerald, since emerald is the *community* intent's colour,
not the brand's. One `accent` object, derived from `activeIntent`, drives all
of it — see IdeaForm.tsx.

### The basics has no title field

The post is titled by its own first sentence — split at a full stop, a line
break, or a dash aside — so nobody is asked to name a thing they just
described. The assistant's title wins when it produced one; the summary
sentence is the last resort. What The basics does show first is that summary,
"I'd like to meet people to play games.", in the intent's colour with a pencil
back to step 2: state the decision, offer the way to change it, then ask only
for what is still unknown.

### The rail spells the product

Top to bottom, the first letters spell P·E·O·P·L·E:

**P**eople around · **E**vents · **O**ffers · **P**rojects · **L**ocal
Faves · **E**xplore

People around carries everything social: neighbors, groups, community
management (absorbed from the old "My Communities" rail — a community IS
people), and Small help. Projects is "My ideas" renamed. Explore is the home
feed, last so the word works; the logo above is the second, always-visible
way home. Old URLs (`/neighborhood`, `/asks`, plus earlier `/groups`,
`/playbooks`) all redirect into their new sections, and
`/asks?compose=1` still opens the composer at `/people?compose=1#asks`.

Styling follows Nextdoor's grammar, which the app adopted deliberately:
hover is a soft grey pill, and the page you are on is simply **bolder and
darker** — no colour fill. A coloured active state made the rail compete
with the content beside it; weight alone is enough to say "you are here."

### The tagline lives under the wordmark

*"Let's do something together."* sits directly beneath the logo in the
sidebar, the mobile header, and the landing footer — under the wordmark, not
inside it, so the logo stays a logo and the promise stays readable at any
size. Set in the muted ink used for secondary text, italic, never competing
with the rail labels beside it. Wording and rationale live in
[MARKETING.md](MARKETING.md).

### Rail numbers are yours, not the room's

Each rail carries one number, and every one is about **you**: ideas your
neighbors starred, events you said you're coming to, things you've offered,
times you've helped, neighbors in your community, ideas you started plus
teams you joined, communities you belong to. "412 people around" would be a
vanity metric; "3 times you helped" is something you recognise.

Zero renders as nothing at all. An empty rail should read as an invitation,
not a scoreboard you're losing. The old block of stats under My Communities
is gone — it repeated the community name already on the page and buried two
counts where nobody looked.

## Navigation: eight rails, not eleven

The left rail: eight places you can browse — Home · Local Faves · Events ·
Offers · Small help · People around · My ideas · My Communities — then the
two things you can *start*: **Start something with people** (emerald) and
**Ask for small help** (amber), then the utilities. Both are solid, both
left-align their lucide icon and label with the rails above — hierarchy comes
from hue, not from one being outlined, so asking for a hand never reads as
the lesser option. The buttons sit
*between* places and utilities, not on top: the rails carry your numbers, so
orientation comes first, and the sidebar fits one screen either way — top
placement bought no visibility, it only pushed the map of your world down.
(Gmail's Compose-on-top works because Gmail is opened *to compose*;
Peoplearound is opened to see what's around, then act.)

"Share something to do" rather than "Share an idea": the product's contract
is that every surface asks what you want to **do**, never who you want to
meet (CONCEPT.md § Non-goals). "An idea" also sounds like it has to be big,
and most of what a neighborhood needs isn't.

Two items were folded away rather than kept:

- **Groups → People around** (`/people#groups`). A group *is* people. A
  separate rail item made the reader hold a distinction the product hadn't
  earned yet — especially while Groups is still a coming-soon placeholder.
- **Playbooks → My ideas** (`/ideas#playbooks`). A playbook is only useful at
  the moment you're deciding what to start, which is precisely the page you're
  on when you have no ideas yet. The empty state now points down to them.

Both old routes redirect, so existing links and bookmarks still land.

The ask button is deliberately *secondary*. An idea is what this place is
for, so it keeps the filled button — but someone who just needs a hand
shouldn't have to go looking for the door, so the ask is one outlined click
that opens the composer already expanded (`/asks?compose=1`).


### Every map frames your neighborhood

The right-hand map fits its viewport to pins **within 40 km of you**, not to
every pin it was handed. One neighbor in another city used to drag the view
out to a whole continent — and a map of a continent tells you nothing about
what's around you. Distant pins still render and are reachable by panning;
they just don't get a vote on the framing. With nothing nearby yet, the map
shows home at street-ish zoom rather than the landmass containing the one
faraway pin.

`MapShell` resolves the centre once for every page that uses it, rather than
each page passing its own — eight call sites would guarantee one eventually
forgets. The exception is a project's own page, which frames that project.
**My ideas** carries the map too: the ideas you started and the teams you
joined, wherever they are.

**Community pills.** You can belong to more than one community — your block,
plus the cycling group two neighborhoods over — and a map that silently
averages them centres on a spot where nothing is happening. So when there's
more than one, pills appear over the map (primary first) and one tap moves
the view. The user picks; the software doesn't guess.

### Pin pickers open where you live

Every "drop a rough pin" map (small help, offers, the idea wizard, your
profile spot) opens on your saved point if you have one, otherwise your
neighborhood's centre at street zoom — never the whole planet. A world map is
a map of nowhere: you can't drop a useful pin from orbit, and the picker
reads as broken before you've touched it. `myMapCenter()` resolves the centre
server-side; when neither is known the map falls back to the world view.
