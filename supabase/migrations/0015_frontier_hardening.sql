-- Peoplearound — 0015 frontier hardening
-- Locks down the auto-register-location pipeline against bots and spam:
--   • register_frontier_location is no longer callable by anon/authenticated —
--     only the server (service_role) may call it, so the API route's checks
--     cannot be bypassed via PostgREST.
--   • A request log + hard caps enforced IN the database (the only layer a
--     bot cannot route around): max 3 new places per IP hash per 24 h, max
--     25 new places globally per 24 h. The global cap also bounds alert
--     emails and keeps us far inside Nominatim/Resend free-tier limits.
-- locate_teaser stays anon: read-only, aggregates only. Idempotent.

create table if not exists public.frontier_request_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  registered boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.frontier_request_log enable row level security;
-- No policies at all: only security-definer functions touch this table.

create index if not exists frontier_log_ip_created_idx
  on public.frontier_request_log (ip_hash, created_at desc);
create index if not exists frontier_log_created_idx
  on public.frontier_request_log (created_at desc);

-- Replace the 0014 function (different signature: + p_ip_hash).
drop function if exists public.register_frontier_location(double precision, double precision, text, text);

create or replace function public.register_frontier_location(
  p_lat double precision,
  p_lng double precision,
  p_name text,
  p_city text default null,
  p_ip_hash text default null
)
returns table (id uuid, name text, created boolean, rate_limited boolean)
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

  -- Already covered? Return the match — costs nothing, never rate-limited.
  select t.id, t.name into existing
    from public.locate_teaser(p_lat, p_lng) t
   limit 1;
  if existing.id is not null then
    return query select existing.id, existing.name, false, false;
    return;
  end if;

  -- Hard caps, enforced where bots can't reach around them.
  if p_ip_hash is not null and (
       select count(*) from public.frontier_request_log l
        where l.ip_hash = p_ip_hash
          and l.registered
          and l.created_at > now() - interval '24 hours'
     ) >= 3 then
    return query select null::uuid, null::text, false, true;
    return;
  end if;
  if (
       select count(*) from public.frontier_request_log l
        where l.registered
          and l.created_at > now() - interval '24 hours'
     ) >= 25 then
    return query select null::uuid, null::text, false, true;
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
        select n.id, n.name, false, false from public.neighborhoods n
        where n.name = clean_name;
      return;
    end;
  end;

  insert into public.frontier_request_log (ip_hash, registered)
  values (coalesce(p_ip_hash, 'unknown'), true);

  return query
    select n.id, n.name, true, false from public.neighborhoods n
    where n.id = new_id;
end;
$$;

-- Server-only: the API route calls this with the service-role key.
revoke all on function public.register_frontier_location(double precision, double precision, text, text, text) from public;
revoke all on function public.register_frontier_location(double precision, double precision, text, text, text) from anon;
revoke all on function public.register_frontier_location(double precision, double precision, text, text, text) from authenticated;
grant execute on function public.register_frontier_location(double precision, double precision, text, text, text) to service_role;
