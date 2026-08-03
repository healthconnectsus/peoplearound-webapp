-- Peoplearound — 0014 frontier locations
-- When a visitor shows up somewhere Peoplearound doesn't cover yet, the app
-- now puts that place on the map automatically (and ops gets an email from
-- the web layer). This migration provides the database half:
--   • center_lat/center_lng on neighborhoods — so a place added this way is
--     matchable for the NEXT visitor (no boundary polygon needed, no dupes)
--   • locate_teaser v2 — matches by boundary, then neighborhood center,
--     then nearest pinned project (all within 15 km)
--   • register_frontier_location() — dedup + insert, anon-callable, safe
-- Idempotent.

alter table public.neighborhoods
  add column if not exists center_lat double precision
    check (center_lat is null or (center_lat between -90 and 90));
alter table public.neighborhoods
  add column if not exists center_lng double precision
    check (center_lng is null or (center_lng between -180 and 180));

-- Backfill centers for existing neighborhoods from their projects' pins.
update public.neighborhoods n
   set center_lat = sub.avg_lat, center_lng = sub.avg_lng
  from (
    select neighborhood_id, avg(lat) as avg_lat, avg(lng) as avg_lng
      from public.projects
     where lat is not null and lng is not null
     group by neighborhood_id
  ) sub
 where sub.neighborhood_id = n.id
   and n.center_lat is null;

-- ------------------------------------------------------------------
-- locate_teaser v2: boundary → center distance → project proximity.
-- ------------------------------------------------------------------
create or replace function public.locate_teaser(lat double precision, lng double precision)
returns table (id uuid, name text, neighbors int, ideas int)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  hood uuid;
  pt geography := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
begin
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    return;
  end if;

  select n.id into hood
    from public.neighborhoods n
   where n.boundary is not null
     and ST_Covers(n.boundary, pt)
   order by n.created_at
   limit 1;

  if hood is null then
    select n.id into hood
      from public.neighborhoods n
     where n.center_lat is not null and n.center_lng is not null
       and ST_Distance(pt, ST_SetSRID(ST_MakePoint(n.center_lng, n.center_lat), 4326)::geography) < 15000
     order by ST_Distance(pt, ST_SetSRID(ST_MakePoint(n.center_lng, n.center_lat), 4326)::geography)
     limit 1;
  end if;

  if hood is null then
    select p.neighborhood_id into hood
      from public.projects p
     where p.lat is not null and p.lng is not null
       and p.neighborhood_id is not null
     group by p.neighborhood_id
    having min(ST_Distance(pt, ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography)) < 15000
     order by min(ST_Distance(pt, ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography))
     limit 1;
  end if;

  if hood is null then
    return;
  end if;

  return query
    select n.id, n.name,
      (select count(*)::int from public.profiles pr where pr.neighborhood_id = n.id),
      (select count(*)::int from public.projects p2
        where p2.neighborhood_id = n.id and p2.state <> 'archived')
    from public.neighborhoods n
    where n.id = hood;
end;
$$;

revoke all on function public.locate_teaser(double precision, double precision) from public;
grant execute on function public.locate_teaser(double precision, double precision) to anon, authenticated;

-- ------------------------------------------------------------------
-- register_frontier_location: add a place we don't cover yet.
-- Dedup first (same matching as locate_teaser); on a name collision the
-- city is appended, and if it still collides the existing row is returned.
-- Returns created = true only when a brand-new neighborhood row was made —
-- the web layer uses that flag to send exactly one ops alert per new place.
-- ------------------------------------------------------------------
create or replace function public.register_frontier_location(
  p_lat double precision,
  p_lng double precision,
  p_name text,
  p_city text default null
)
returns table (id uuid, name text, created boolean)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  clean_name text := left(btrim(coalesce(p_name, '')), 80);
  clean_city text := nullif(left(btrim(coalesce(p_city, '')), 80), '');
  existing record;
  new_id uuid;
begin
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180
     or clean_name = '' then
    return;
  end if;

  -- Already covered? Return the match instead of creating a duplicate.
  select t.id, t.name into existing
    from public.locate_teaser(p_lat, p_lng) t
   limit 1;
  if existing.id is not null then
    return query select existing.id, existing.name, false;
    return;
  end if;

  begin
    insert into public.neighborhoods (name, city, kind, center_lat, center_lng)
    values (clean_name, clean_city, 'neighborhood', p_lat, p_lng)
    returning neighborhoods.id into new_id;
  exception when unique_violation then
    begin
      insert into public.neighborhoods (name, city, kind, center_lat, center_lng)
      values (clean_name || coalesce(' (' || clean_city || ')', ' (new)'),
              clean_city, 'neighborhood', p_lat, p_lng)
      returning neighborhoods.id into new_id;
    exception when unique_violation then
      return query
        select n.id, n.name, false from public.neighborhoods n
        where n.name = clean_name;
      return;
    end;
  end;

  return query
    select n.id, n.name, true from public.neighborhoods n where n.id = new_id;
end;
$$;

revoke all on function public.register_frontier_location(double precision, double precision, text, text) from public;
grant execute on function public.register_frontier_location(double precision, double precision, text, text) to anon, authenticated;
