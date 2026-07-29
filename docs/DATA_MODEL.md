# Peoplearound — Data Model

*Indicative schema, not final · Draft v2 (project pivot)*

This expands the core data model sketch in [PRD §4.3](PRD.md#43-core-data-model-sketch). The invariants in [ARCHITECTURE.md](ARCHITECTURE.md#critical-architectural-rules) constrain everything here.

**Implementation status:** `profiles`, `projects`, `stars`, `memberships`, `contributions`, `attestations`, `events`, `rsvps`, and `neighborhoods` are **live** in the webapp (see [`supabase/migrations/`](../supabase/migrations/)). `offers` and `reputation` are still planned.

## Entity relationships

```
neighborhoods ──< profiles ──< projects ──< stars
                                 │
                                 ├──< memberships          ← the join flow (live)
                                 ├──< contributions ──< attestations   ← the trust core (live)
                                 ├──< events ──< rsvps                 ← physical coordination (live)
                                 └──< offers (optional link)
reputation (derived from contributions + attestations)
```

## Tables — live today

### profiles

One row per auth user, auto-created by a trigger on `auth.users`. (The PRD's `users` table.)

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK, FK → auth.users) | |
| display_name | text | Defaults from email / sign-up metadata |
| created_at | timestamptz | |

> `neighborhood_id` (FK → neighborhoods, nullable) is **live** — picked on `/neighborhood` (list or geolocation); everything the user sees is scoped by it.

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
| created_at / updated_at | timestamptz | `updated_at` maintained by trigger |

> `neighborhood_id` (FK → neighborhoods) is **live**, stamped from the founder's profile by a before-insert trigger. Planned: `location` (a point within the neighborhood).

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

The hard boundary for all reads and writes.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | Unique, 1–80 chars |
| city | text, nullable | Set by operators; groups neighborhoods so `reach = 'city'` projects can cross neighborhood lines |
| boundary | geography(polygon, 4326), nullable | Drawn by operators; enables 📍 location detection via `find_neighborhood(lat,lng)` |
| created_at | timestamptz | |

> **RLS:** readable by any signed-in user; **no client write path at all** — neighborhoods are created by operators (manual ops, per the roadmap). `profiles.neighborhood_id` and `projects.neighborhood_id` point here; a trigger stamps new projects with the founder's neighborhood.

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
| Reach is opt-in, not a bypass | `reach='city'` needs matching `neighborhoods.city`; `reach='global'` visible to all; default stays `neighborhood` | ✅ Live |
| Reputation read-only | Derived/computed; no client write path | Planned |

> This schema iterates as the human loop is proven. The live tables are deliberately minimal; the trust layer lands on top of them.
