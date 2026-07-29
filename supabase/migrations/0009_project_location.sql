-- Peoplearound — 0009 project location
-- An optional map pin per project ("where is it happening?"), set in the
-- share-an-idea wizard. Plain lat/lng doubles are enough for pins; PostGIS
-- geography stays reserved for neighborhood boundaries. Idempotent.

alter table public.projects
  add column if not exists lat double precision check (lat is null or (lat between -90 and 90));
alter table public.projects
  add column if not exists lng double precision check (lng is null or (lng between -180 and 180));
