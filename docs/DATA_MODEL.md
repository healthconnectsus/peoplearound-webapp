# Peoplearound — Data Model

*Indicative schema, not final · Draft v2 (project pivot)*

This expands the core data model sketch in [PRD §4.3](PRD.md#43-core-data-model-sketch). The invariants in [ARCHITECTURE.md](ARCHITECTURE.md#critical-architectural-rules) constrain everything here.

**Implementation status:** `profiles`, `projects`, `stars`, and `memberships` are **live** in the webapp (see [`supabase/migrations/`](../supabase/migrations/)). `neighborhoods`, `contributions`, `attestations`, `events`, `rsvps`, `offers`, and `reputation` are the planned trust layer.

## Entity relationships

```
neighborhoods ──< profiles ──< projects ──< stars
                                 │
                                 ├──< memberships          ← the join flow (live)
                                 ├──< contributions ──< attestations
                                 ├──< events ──< rsvps
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

> `neighborhood_id` joins this table when neighborhoods ship.

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
| created_at / updated_at | timestamptz | `updated_at` maintained by trigger |

> Planned columns: `neighborhood_id`, `location` (PostGIS) once neighborhoods ship.

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

## Tables — planned (trust layer)

### neighborhoods

The hard boundary for all reads and writes.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| boundary | geography (PostGIS) | Polygon for radius/containment queries |
| created_at | timestamptz | |

### contributions

The trust core. Status transitions are server-enforced (see [Architecture](ARCHITECTURE.md#contribution--attestation-flow)).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| contributor_id | uuid (FK → profiles) | |
| type | enum | `knowledge` · `resource` · `skill` · `time` · `presence` |
| description | text | |
| status | enum | `logged` · `accepted` · `confirmed` |
| left_at | timestamptz (nullable) | Set when contributor leaves; prior `confirmed` work retained |
| created_at | timestamptz | |

> **Rule:** the founder who accepts cannot be the `contributor_id`. No self-crediting.

### attestations

Third-party confirmation that a contribution really happened.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| contribution_id | uuid (FK → contributions) | |
| attester_id | uuid (FK → profiles) | |
| created_at | timestamptz | |

> **Constraint:** `attester_id <> contributions.contributor_id` — you cannot attest your own work. At least one attestation is required to reach `confirmed`.

### events

Physical coordination attached to a project.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| title | text | |
| starts_at | timestamptz | |
| place | text / geography | |
| created_at | timestamptz | |

### rsvps

Lightweight coordination signal — **never** a performance metric. No "no-show" count is ever stored or derived.

| Column | Type | Notes |
|---|---|---|
| event_id | uuid (FK → events) | |
| user_id | uuid (FK → profiles) | |
| status | enum | `joining` (absence is simply the absence of a row — never penalized) |
| created_at | timestamptz | |

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
| No self-crediting | DB constraint (`attester_id <> contributor_id`) + RLS + server logic | Planned |
| Neighborhood scoping | RLS on every table keyed to `neighborhood_id` | Planned |
| Contribution status transitions server-only | Server-side logic (client cannot write `accepted`/`confirmed`) | Planned |
| Reputation read-only | Derived/computed; no client write path | Planned |

> This schema iterates as the human loop is proven. The live tables are deliberately minimal; the trust layer lands on top of them.
