# Peoplearound — Data Model

*Indicative schema, not final · Draft v2 (project pivot)*

This expands the core data model sketch in [PRD §4.3](PRD.md#43-core-data-model-sketch). The invariants in [ARCHITECTURE.md](ARCHITECTURE.md#critical-architectural-rules) constrain everything here.

**Implementation status:** `profiles`, `projects`, `stars`, `memberships`, `contributions`, `attestations`, `events`, `rsvps`, `neighborhoods` (as **communities**), `community_members`, `frontier_request_log`, `project_updates`, `project_flags`, `project_views`, `user_action_log`, and the messaging tables (`conversations`, `conversation_participants`, `messages`) are **live** in the webapp (see [`supabase/migrations/`](../supabase/migrations/)). `offers` and `reputation` are still planned.

## Entity relationships

```
neighborhoods (communities) ──< community_members >── profiles   ← many-to-many (live)
neighborhoods ──< profiles ──< projects ──< stars
                                 │
                                 ├──< memberships          ← the join flow (live)
                                 ├──< contributions ──< attestations   ← the trust core (live)
                                 ├──< events ──< rsvps                 ← physical coordination (live)
                                 ├──< project_updates                  ← the build log (live)
                                 ├──< project_flags                    ← moderation (live)
                                 ├──< project_views                    ← private analytics (live)
                                 └──< offers (optional link)
reputation (derived from contributions + attestations)

conversations ──< conversation_participants >── profiles         ← messaging (live)
conversations ──< messages
```

## Tables — live today

### profiles

One row per auth user, auto-created by a trigger on `auth.users`. (The PRD's `users` table.)

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK, FK → auth.users) | |
| display_name | text | Defaults from email / sign-up metadata |
| created_at | timestamptz | |

> `neighborhood_id` (FK → neighborhoods, nullable) is **live** — picked on `/neighborhood` (list or geolocation), claimed silently from the landing page's location match (`pa-hood`/`pa-frontier` cookies), and scoping everything the user sees. Migration 0010 added profile fields (bio, pronouns, avatar/cover, …); migration 0016 added `invited_by` (FK → profiles, nullable, `invited_by <> id` enforced) — set once when an account arrives through a personal invite link (`/login?via=<id>`), powering the "brought N neighbors" attribution in [INCENTIVES.md](INCENTIVES.md).

### projects

The central object — a living, joinable page with state, team, and history.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| owner_id | uuid (FK → profiles) | The founder |
| title | text | ≤ 140 chars |
| description | text | ≤ 4000 chars |
| category | text | community · fitness · learning · home · venture · other |
| state | enum `project_state` | `idea` · `active` · `completed` · `archived` — **never `failed`** |
| help | enum `help_kind` | `local` (hands nearby) · `remote` (online help) · `both` |
| reach | enum `project_reach` | `neighborhood` (default) · `city` · `global` — RLS-enforced visibility opt-in |
| photo_url | text, nullable | Cover photo (public `projects` storage bucket, migration 0021); uploads are downscaled client-side |
| created_at / updated_at | timestamptz | `updated_at` maintained by trigger |

> `neighborhood_id` (FK → neighborhoods) is **live**, stamped from the founder's profile by a before-insert trigger. `lat`/`lng` (nullable doubles) are **live** — the optional map pin from the wizard's "where is it happening?" step.

### stars

The low-commitment "I'd be glad this existed" signal.

| Column | Type | Notes |
|---|---|---|
| project_id | uuid (FK → projects) | |
| user_id | uuid (FK → profiles) | |
| created_at | timestamptz | |

> **Constraint:** `PRIMARY KEY (project_id, user_id)` — one star per neighbor per project.
> **RLS:** anyone signed in can read; users can only star/unstar as themselves.

### memberships

The join flow: a neighbor requests, the founder approves. The founder is the implicit first team member and never has a membership row.

| Column | Type | Notes |
|---|---|---|
| project_id | uuid (FK → projects) | |
| user_id | uuid (FK → profiles) | The requester / member |
| status | enum `membership_status` | `pending` · `accepted` |
| created_at | timestamptz | |

> **Constraint:** `PRIMARY KEY (project_id, user_id)` — one membership per neighbor per project.
> **RLS:** a user may only *insert* their own row, and only as `pending`; only the project owner may *update* (accept); *delete* is allowed to the member themself (leave / cancel request) or the owner (decline / remove). A user cannot approve their own request.

### contributions

The trust core. Status transitions are server-enforced (see [Architecture](ARCHITECTURE.md#contribution--attestation-flow)).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| contributor_id | uuid (FK → profiles) | |
| type | enum `contribution_type` | `knowledge` · `resource` · `skill` · `time` · `presence` |
| description | text | 1–1000 chars (DB check) |
| status | enum `contribution_status` | `logged` · `accepted` · `confirmed` — no rejected/failed status |
| created_at | timestamptz | |
| accepted_at | timestamptz (nullable) | Stamped by trigger when the founder accepts |
| confirmed_at | timestamptz (nullable) | Stamped by trigger on confirmation |

> **RLS:** only an *accepted teammate* may insert, only as themself, only as `logged` (the founder has no membership row, so founders cannot self-credit). Only the founder may update, only `logged → accepted`, never for their own work. Delete (withdraw/decline) is allowed to the contributor or founder only while still `logged` — accepted and confirmed history is permanent.
> **Confirmation** happens exclusively in the `reconcile_contributions()` security-definer function: `accepted` + ≥1 attestation → `confirmed`, or `logged` older than 7 days + ≥1 attestation → `confirmed` (credit routes around an unresponsive founder). Clients cannot write `confirmed`.
> **Leaving:** the membership row is deleted, but contribution rows are retained — prior confirmed work survives with no penalty.

### attestations

Third-party confirmation that a contribution really happened.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| contribution_id | uuid (FK → contributions) | |
| attester_id | uuid (FK → profiles) | |
| created_at | timestamptz | |

> **Constraint:** `UNIQUE (contribution_id, attester_id)` — one attestation per witness.
> **RLS:** insert only as yourself; never for your own contribution; never as the founder (their acceptance is a separate signal); only if you are an accepted teammate or stargazer of the project. No update or delete — an attestation, once given, stands.

### events

Physical coordination attached to a project.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| title | text | 1–140 chars (DB check) |
| starts_at | timestamptz | Stored as the naive neighborhood-local time the founder typed; real timezone handling arrives with neighborhoods |
| place | text | ≤ 200 chars; becomes geography with PostGIS |
| updated_at | timestamptz | Touched by a trigger whenever an RSVP is added/removed, so realtime viewers see counts change (migration 0024) |
| created_at | timestamptz | |

> **RLS:** readable by any signed-in user; insert/update/delete by the project founder only.

### rsvps

Lightweight coordination signal — **never** a performance metric. No "no-show" count is ever stored or derived.

| Column | Type | Notes |
|---|---|---|
| event_id | uuid (FK → events) | |
| user_id | uuid (FK → profiles) | |
| status | enum `rsvp_status` | `joining` is the *only* value — absence is simply the absence of a row, so no-show data cannot exist |
| created_at | timestamptz | |

> **Constraint:** `PRIMARY KEY (event_id, user_id)` — one signal per neighbor per event.
> **RLS:** insert and delete own rows only; withdrawing an RSVP deletes the row, leaving no trace.

### neighborhoods

The hard boundary for all reads and writes. Since migration 0011 this table
doubles as **communities** (`kind` distinguishes geographic neighborhoods
from cultural/hobby/interest groups; `community_members` records who joined
which).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | Unique, 1–80 chars |
| city | text, nullable | Set by operators; groups neighborhoods so `reach = 'city'` projects can cross neighborhood lines |
| kind | text | `neighborhood` (default) · `cultural` · `hobby` · `identity` · `geographic` · `interest` · `other` |
| boundary | geography(polygon, 4326), nullable | Drawn by operators; enables 📍 location detection via `find_neighborhood(lat,lng)` |
| center_lat / center_lng | double precision, nullable | Set when a frontier location self-registers (or backfilled from project pins); lets `locate_teaser` match new places without a boundary polygon |
| description | text, nullable | Community self-description (migration 0011) |
| created_at | timestamptz | |

> **RLS:** readable by any signed-in user. Writes: operators (SQL), `register_frontier_location()` (service-role only, on behalf of a signed-up user from uncovered territory — see [ARCHITECTURE](ARCHITECTURE.md#frontier-locations-live)), and — since migration 0011 — **any signed-in user may create a community** (the `/neighborhood` page's create flow). No client update/delete. `profiles.neighborhood_id` remains the user's **primary** community and drives the home feed; a trigger stamps new projects with the founder's primary neighborhood.

### community_members

A user belongs to **many** communities (different neighborhoods plus
cultural / hobby / identity / geographic / interest groups); this is the
many-to-many. The primary one stays on `profiles.neighborhood_id`.

| Column | Type | Notes |
|---|---|---|
| community_id | uuid (FK → neighborhoods) | |
| user_id | uuid (FK → profiles) | |
| created_at | timestamptz | Join order — the first 10 per community are its Founding Neighbors ([INCENTIVES.md](INCENTIVES.md)) |

> **Constraint:** `PRIMARY KEY (community_id, user_id)`.
> **RLS:** readable by any signed-in user; join/leave own rows only. Backfilled so every profile is a member of its primary neighborhood.

### conversations · conversation_participants · messages

Direct messaging (the `/chats` page). Live-updating via Supabase Realtime
(`messages` is in the realtime publication).

| Table | Columns | Notes |
|---|---|---|
| conversations | id, created_at | A chat thread |
| conversation_participants | conversation_id, user_id, last_read_at, created_at | PK (conversation_id, user_id); `last_read_at` powers unread counts |
| messages | id, conversation_id, sender_id, body (1–4000 chars), created_at | Indexed by (conversation_id, created_at) |

> **RLS:** everything is participant-scoped through `is_participant(cid)` — a security-definer helper that checks membership without recursive RLS. Only participants can read a conversation, its participant list, or its messages; you can only send as yourself and only into conversations you're in; you can only update your own `last_read_at`. Starting a chat inserts yourself first, then the other person (allowed because by then you are a participant).

### frontier_request_log

Rate-limit ledger for self-registered locations. No client access at all
(RLS enabled, zero policies — only security-definer functions touch it).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| ip_hash | text | Salted SHA-256 of the requester's IP — never the raw IP |
| registered | boolean | true only when a new neighborhood row was created |
| created_at | timestamptz | |

> **Caps enforced in `register_frontier_location()`:** ≤3 new places per `ip_hash` per 24 h, ≤25 globally per 24 h — which also bounds ops alert emails.

### project_updates

The build log: short progress notes from the founder or an accepted
teammate. Each lands in the project's history timeline as a 📣 beat.
Deliberately *not* comments — only the team can post (see
[FEATURE_IDEAS](FEATURE_IDEAS.md) rejected list).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| author_id | uuid (FK → profiles) | |
| body | text | 1–2000 chars |
| photo_url | text, nullable | Optional photo (projects bucket) |
| created_at | timestamptz | |

> **RLS:** readable by anyone who can see the project; insert only as
> yourself *and* only as founder or accepted teammate; delete by the author
> or the founder. Capped at 20/user/day. `REPLICA IDENTITY FULL` so filtered
> realtime catches deletions.

### project_flags

Community moderation. Any neighbor may flag a project once; at 3 distinct
flaggers the server emails ops for human review. **Nothing is auto-hidden.**

| Column | Type | Notes |
|---|---|---|
| project_id | uuid (FK → projects) | |
| user_id | uuid (FK → profiles) | |
| reason | text | `spam` · `harassment` · `unsafe` · `not_local` · `other` |
| note | text, nullable | ≤ 500 chars |
| created_at | timestamptz | |

> **Constraint:** `PRIMARY KEY (project_id, user_id)` — one flag per neighbor.
> **RLS:** you can read only *your own* flag (counts are never client-visible,
> so no one can see a project "under fire"); insert only as yourself and never
> on your own project; delete your own. Capped at 10 flags/user/day.
> `flag_review()` (service-role only) powers the ops email.

### project_views

Private analytics. Counts *unique viewers per day* per project.

| Column | Type | Notes |
|---|---|---|
| project_id | uuid (FK → projects) | |
| viewer_id | uuid (FK → profiles) | |
| viewed_on | date | |

> **Constraint:** `PRIMARY KEY (project_id, viewer_id, viewed_on)` — a refresh
> is not a view.
> **RLS:** *no policies at all.* Rows are written by `record_project_view()`
> (skips the owner's own visits) and read only as aggregates by
> `idea_view_counts()` / `idea_view_daily()`, both owner-scoped. Who viewed
> what never leaves the database.

### user_action_log

Rate-limit ledger behind the per-user abuse caps (migration 0017).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | |
| action | text | `project` · `community` · `conversation` · `message` · `flag` · `project_update` · `shape_idea` |
| created_at | timestamptz | |

> **RLS:** no policies — only `assert_rate()` and `consume_ai_credit()`
> (security definer) touch it. Caps: projects 10/day · communities 3/day ·
> conversations 20/day · messages 200/hour · flags 10/day · updates 20/day ·
> AI shaping 20/day.

## Tables — planned

### offers

Give / lend / offer — the non-monetary replacement for a marketplace.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | |
| type | enum | `give` · `lend` · `offer` |
| description | text | |
| project_id | uuid (FK → projects, nullable) | When linked, converts into a contribution on that project |
| created_at | timestamptz | |

### reputation (derived)

**Not directly writable.** Computed from `confirmed` contributions and their attestations.

| Field | Notes |
|---|---|
| user_id | |
| context | e.g. "community projects in this neighborhood" |
| impact_score | Impact-weighted, private; never a public ranking |
| badges | Maps to attested milestones only — never activity volume |

## Enforcement summary

| Invariant | Where enforced | Status |
|---|---|---|
| One star per neighbor per project | PK constraint + RLS | ✅ Live |
| Join requests start `pending`; only the founder accepts | RLS policies on `memberships` | ✅ Live |
| Members can always leave, no penalty | RLS delete policy (own row) | ✅ Live |
| No `failed` state | `project_state` enum excludes it entirely | ✅ Live |
| No self-crediting | RLS: insert own rows only, always `logged`; founder-only accept, never own; attester ≠ contributor ≠ founder | ✅ Live |
| Contribution status transitions server-only | RLS allows only `logged → accepted` by founder; `confirmed` only via `reconcile_contributions()` (security definer) | ✅ Live |
| One attestation per witness | `UNIQUE (contribution_id, attester_id)` | ✅ Live |
| Accepted/confirmed history is permanent | RLS delete policy covers `logged` rows only | ✅ Live |
| Events founder-managed; RSVPs self-only | RLS on `events` (owner writes) and `rsvps` (own rows) | ✅ Live |
| No no-show data can exist | `rsvp_status` enum has the single value `joining`; withdrawal deletes the row | ✅ Live |
| Neighborhood scoping | `projects` select policy checks viewer's `neighborhood_id`; child tables require a visible project; trigger stamps projects | ✅ Live |
| View data never identifies viewers | `project_views` has zero RLS policies; only owner-scoped aggregate functions read it | ✅ Live |
| Flag counts invisible to users | `project_flags` select policy returns own row only; counts via service-role `flag_review()` | ✅ Live |
| Per-user write caps | DB triggers → `assert_rate()` on projects, communities, conversations, messages, flags, updates | ✅ Live |
| Reach is opt-in, not a bypass | `reach='city'` needs matching `neighborhoods.city`; `reach='global'` visible to all; default stays `neighborhood` | ✅ Live |
| New locations need a signed-up human | Anonymous visitors get name preview only; `register_frontier_location` is service-role-only + DB caps (3/IP/day, 25/day) | ✅ Live |
| No self-invites; attribution set once | `profiles_no_self_invite` check; `invited_by` only written when null | ✅ Live |
| Reputation read-only | Derived/computed; no client write path | Planned |

> This schema iterates as the human loop is proven. The live tables are deliberately minimal; the trust layer lands on top of them.
