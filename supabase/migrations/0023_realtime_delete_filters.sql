-- Peoplearound — 0023 realtime delete filters
-- LiveRefresh now subscribes with server-side filters like
-- "contributions:project_id=eq.<id>" (see docs/SCALING.md). Postgres only
-- includes the *primary key* in the replication row for DELETEs, so a
-- filter on a non-PK column can never match a delete — meaning removing a
-- contribution, event, or update would not refresh other viewers' pages.
--
-- REPLICA IDENTITY FULL makes deletes carry the old row, so the filter
-- matches. These are low-write tables, so the extra WAL is negligible.
-- (stars and memberships already have project_id in their primary key, and
-- projects filters on id, so they need nothing.)
-- Idempotent.

alter table public.contributions replica identity full;
alter table public.events replica identity full;
alter table public.project_updates replica identity full;
