-- Peoplearound — 0031 private user location
-- "Where am I?" on your own profile map.
--
-- This deliberately does NOT live on `profiles`: that row is readable by
-- every signed-in neighbor, and per-column RLS isn't a thing. A separate
-- table with own-row-only policies means your location is visible to you and
-- to nobody else — not other users, not the feed, not the People map (which
-- shows community clusters instead; see docs/UX_SPEC.md).
--
-- Stored blunted to 2 decimal places (~1.1 km) by trigger: enough to centre
-- your map, never enough to point at a house.
-- Idempotent.

create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.user_locations enable row level security;

drop policy if exists "read own location" on public.user_locations;
create policy "read own location"
  on public.user_locations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "write own location" on public.user_locations;
create policy "write own location"
  on public.user_locations for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own location" on public.user_locations;
create policy "update own location"
  on public.user_locations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "forget own location" on public.user_locations;
create policy "forget own location"
  on public.user_locations for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.blunt_user_location()
returns trigger language plpgsql as $$
begin
  new.lat := round(new.lat::numeric, 2);
  new.lng := round(new.lng::numeric, 2);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_locations_blunt on public.user_locations;
create trigger user_locations_blunt
  before insert or update on public.user_locations
  for each row execute function public.blunt_user_location();
