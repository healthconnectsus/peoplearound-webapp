-- External listings have no founder, membership, RSVP, or contribution credit.
-- All writes and queue functions are service-role only; readers see their cities.
begin;

create table if not exists public.event_cities (
  id uuid primary key default gen_random_uuid(),
  city_key text not null unique,
  name text not null,
  search_location text not null,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  enabled boolean not null default true,
  next_run_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  sources_checked_at timestamptz,
  last_status text not null default 'pending',
  last_error text,
  last_import_count integer not null default 0
);

create table if not exists public.city_event_sources (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.event_cities(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  title text not null,
  discovered_at timestamptz not null default now(),
  unique(city_id, url)
);

create table if not exists public.city_events (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.event_cities(id) on delete cascade,
  provider text not null check (provider in ('ticketmaster', 'serpapi')),
  external_id text not null,
  title text not null check (char_length(title) between 1 and 250),
  event_date date not null,
  starts_at timestamptz,
  date_label text not null,
  venue text not null default '',
  source_url text not null check (source_url ~ '^https://'),
  source_name text not null,
  status text not null default 'scheduled',
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique(city_id, provider, external_id)
);
create index if not exists city_events_upcoming on public.city_events(city_id, event_date);
create index if not exists event_cities_due on public.event_cities(next_run_at);

create table if not exists public.event_search_usage (
  period text primary key,
  used integer not null default 0
);

alter table public.event_cities enable row level security;
alter table public.city_event_sources enable row level security;
alter table public.city_events enable row level security;
alter table public.event_search_usage enable row level security;
revoke all on public.event_cities, public.city_event_sources, public.city_events,
  public.event_search_usage from anon, authenticated;
grant select on public.city_events to authenticated;
grant all on public.event_cities, public.city_event_sources, public.city_events,
  public.event_search_usage to service_role;

create or replace function public.event_city_key(p_city text)
returns text language sql immutable set search_path = public as $$
  select lower(regexp_replace(trim(p_city), '\s+', ' ', 'g'));
$$;

create or replace function public.can_read_city_events(p_city_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.event_cities c
    join public.neighborhoods n on public.event_city_key(n.city) = c.city_key
    where c.id = p_city_id and c.enabled and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.neighborhood_id = n.id)
      or exists (select 1 from public.community_members m where m.user_id = auth.uid() and m.community_id = n.id)
    )
  );
$$;
revoke all on function public.can_read_city_events(uuid) from public, anon;
grant execute on function public.can_read_city_events(uuid) to authenticated;
drop policy if exists "neighbors read city listings" on public.city_events;
create policy "neighbors read city listings" on public.city_events for select to authenticated
  using (public.can_read_city_events(city_id) and expires_at > now()
    and event_date >= (now() at time zone 'UTC')::date - 1
    and status <> 'cancelled');

-- Register once per existing city label, even across multiple neighborhoods.
-- Database triggers make this durable across signup redirects/timeouts and
-- both automatic frontier registration and manual community selection.
create or replace function public.register_event_city(p_hood uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_cities(city_key, name, search_location, lat, lng)
  select public.event_city_key(n.city), trim(n.city), trim(n.city), n.center_lat, n.center_lng
    from public.neighborhoods n where n.id = p_hood and nullif(trim(n.city), '') is not null
  on conflict(city_key) do update set
    lat = coalesce(event_cities.lat, excluded.lat), lng = coalesce(event_cities.lng, excluded.lng);
end;
$$;
revoke all on function public.register_event_city(uuid) from public, anon, authenticated;
grant execute on function public.register_event_city(uuid) to service_role;

create or replace function public.register_event_city_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'neighborhoods' then
    perform public.register_event_city(new.id);
  elsif tg_table_name = 'profiles' then
    perform public.register_event_city(new.neighborhood_id);
  else
    perform public.register_event_city(new.community_id);
  end if;
  return new;
end;
$$;
revoke all on function public.register_event_city_trigger() from public, anon, authenticated;
drop trigger if exists neighborhood_event_city on public.neighborhoods;
create trigger neighborhood_event_city after insert or update of city, center_lat, center_lng
  on public.neighborhoods for each row execute function public.register_event_city_trigger();
drop trigger if exists profile_event_city on public.profiles;
create trigger profile_event_city after insert or update of neighborhood_id
  on public.profiles for each row execute function public.register_event_city_trigger();
drop trigger if exists member_event_city on public.community_members;
create trigger member_event_city after insert on public.community_members
  for each row execute function public.register_event_city_trigger();
select public.register_event_city(id) from public.neighborhoods where city is not null;

-- A worker processes one city per invocation. Lease protects concurrent cron
-- and admin clicks; expired leases recover from killed serverless invocations.
create or replace function public.claim_event_city(p_city_id uuid default null)
returns setof public.event_cities language sql security definer set search_path = public as $$
  update public.event_cities c set lease_token = gen_random_uuid(),
    lease_until = now() + interval '10 minutes', last_attempt_at = now(), last_status = 'running'
  where c.id = (
    select q.id from public.event_cities q
    where q.enabled and (q.lease_until is null or q.lease_until < now())
      and exists (select 1 from public.neighborhoods n where public.event_city_key(n.city) = q.city_key)
      and ((p_city_id is null and q.next_run_at <= now()) or q.id = p_city_id)
    order by q.next_run_at, q.id for update skip locked limit 1
  ) returning c.*;
$$;
revoke all on function public.claim_event_city(uuid) from public, anon, authenticated;
grant execute on function public.claim_event_city(uuid) to service_role;

-- Shared budget, including manual imports; reserve before making any request.
-- Defaults leave room within SerpApi's 250/month, 50/hour free plan.
create or replace function public.consume_event_search(p_month_limit integer, p_hour_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  m text := 'month:' || to_char(now() at time zone 'UTC', 'YYYY-MM');
  h text := 'hour:' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24');
  mu integer; hu integer;
begin
  perform pg_advisory_xact_lock(450045);
  insert into public.event_search_usage(period) values (m), (h) on conflict do nothing;
  select used into mu from public.event_search_usage where period = m;
  select used into hu from public.event_search_usage where period = h;
  if mu >= greatest(0, p_month_limit) or hu >= greatest(0, p_hour_limit) then return false; end if;
  update public.event_search_usage set used = used + 1 where period in (m, h);
  delete from public.event_search_usage where period like 'hour:%'
    and period < 'hour:' || to_char((now() - interval '7 days') at time zone 'UTC', 'YYYY-MM-DD-HH24');
  return true;
end;
$$;
revoke all on function public.consume_event_search(integer, integer) from public, anon, authenticated;
grant execute on function public.consume_event_search(integer, integer) to service_role;
commit;
