-- Peoplearound — 0013 public locate teaser
-- Lets the logged-out landing page turn browser geolocation into a warm,
-- local hook: "You're near Oak Street — 34 neighbors, 12 ideas being built."
-- Anonymous-callable but safe: it returns only a neighborhood name and two
-- aggregate counts — never people, projects, or precise locations.
-- Matching: a drawn boundary wins; otherwise the nearest neighborhood whose
-- pinned projects are within 15 km. No match → empty result. Idempotent.

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
  -- Reject junk coordinates outright.
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
