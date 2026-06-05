# Peoplearound — Data Model

*Indicative schema, not final · Draft v1*

This expands the core data model sketch in [PRD §4.3](PRD.md#43-core-data-model-sketch). It is a starting point for the first-neighborhood pilot, not a frozen migration. The invariants in [ARCHITECTURE.md](ARCHITECTURE.md#critical-architectural-rules) constrain everything here.

## Entity relationships

```
neighborhoods ──< users ──< goals ──< stars
                              │
                              ├──< contributions ──< attestations
                              ├──< events ──< rsvps
                              └──< offers (optional link)
reputation (derived from contributions + attestations)
```

## Tables

### users

The person. Identity is tied to a verified neighborhood.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| auth_id | uuid | Link to Supabase Auth |
| display_name | text | |
| neighborhood_id | uuid (FK → neighborhoods) | The user's verified scope |
| created_at | timestamptz | |

### neighborhoods

The hard boundary for all reads and writes.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| boundary | geography (PostGIS) | Polygon for radius/containment queries |
| created_at | timestamptz | |

### goals

The central object — a living page with state and history.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| owner_id | uuid (FK → users) | |
| neighborhood_id | uuid (FK → neighborhoods) | |
| title | text | |
| description | text | |
| category | text | Single category at MVP |
| location | geography (PostGIS) | |
| state | enum | `idea` · `active` · `completed` · `archived` — **never `failed`** |
| created_at / updated_at | timestamptz | |

### stars

The low-commitment "I'd be glad this existed" signal.

| Column | Type | Notes |
|---|---|---|
| goal_id | uuid (FK → goals) | |
| user_id | uuid (FK → users) | |
| created_at | timestamptz | |

> **Constraint:** `UNIQUE (goal_id, user_id)` — one star per neighbor per goal.

### contributions

The trust core. Status transitions are server-enforced (see [Architecture](ARCHITECTURE.md#contribution--attestation-flow)).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| goal_id | uuid (FK → goals) | |
| contributor_id | uuid (FK → users) | |
| type | enum | `knowledge` · `resource` · `skill` · `time` · `presence` |
| description | text | |
| status | enum | `logged` · `accepted` · `confirmed` |
| left_at | timestamptz (nullable) | Set when contributor leaves; prior `confirmed` work retained |
| created_at | timestamptz | |

> **Rule:** the owner who accepts cannot be the `contributor_id`. No self-crediting.

### attestations

Third-party confirmation that a contribution really happened.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| contribution_id | uuid (FK → contributions) | |
| attester_id | uuid (FK → users) | |
| created_at | timestamptz | |

> **Constraint:** `attester_id <> contributions.contributor_id` — you cannot attest your own work. At least one attestation is required to reach `confirmed`.

### events

Physical coordination attached to a goal.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| goal_id | uuid (FK → goals) | |
| title | text | |
| starts_at | timestamptz | |
| place | text / geography | |
| created_at | timestamptz | |

### rsvps

Lightweight coordination signal — **never** a performance metric. No "no-show" count is ever stored or derived.

| Column | Type | Notes |
|---|---|---|
| event_id | uuid (FK → events) | |
| user_id | uuid (FK → users) | |
| status | enum | `joining` (absence is simply the absence of a row — never penalized) |
| created_at | timestamptz | |

### offers

Give / lend / offer — the non-monetary replacement for a marketplace.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| type | enum | `give` · `lend` · `offer` |
| description | text | |
| goal_id | uuid (FK → goals, nullable) | When linked, converts into a contribution on that goal |
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

| Invariant | Where enforced |
|---|---|
| No self-crediting | DB constraint (`attester_id <> contributor_id`) + RLS + Edge Function |
| Neighborhood scoping | RLS on every table keyed to `neighborhood_id` |
| Status transitions | Edge Functions only (client cannot write `accepted`/`confirmed`) |
| Reputation read-only | Derived/computed; no client write path |
| No `failed` state | `goals.state` enum excludes it entirely |

> This schema is a sketch for the pilot. Expect iteration once the human loop is proven by hand in the first neighborhood.
