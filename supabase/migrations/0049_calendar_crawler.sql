begin;
alter table public.city_event_sources add column if not exists enabled boolean not null default false,
 add column if not exists format text not null default 'jsonld' check(format in ('jsonld','ics')),
 add column if not exists interval_hours integer not null default 48 check(interval_hours in (24,48)),
 add column if not exists next_crawl_at timestamptz not null default now(),
 add column if not exists lease_token uuid,
 add column if not exists lease_until timestamptz,
 add column if not exists last_crawled_at timestamptz,
 add column if not exists last_error text,
 add column if not exists last_count integer not null default 0;
alter table public.city_events drop constraint if exists city_events_provider_check;
alter table public.city_events add constraint city_events_provider_check check(provider in ('ticketmaster','serpapi','calendar'));
create or replace function public.claim_event_source()
returns setof public.city_event_sources language sql security definer set search_path=public as $$
update public.city_event_sources s set lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
where s.id=(select q.id from public.city_event_sources q join public.event_cities c on c.id=q.city_id
where q.enabled and c.enabled and q.next_crawl_at<=now() and (q.lease_until is null or q.lease_until<now())
order by q.next_crawl_at for update of q skip locked limit 1) returning s.*;
$$;
revoke all on function public.claim_event_source() from public,anon,authenticated;
grant execute on function public.claim_event_source() to service_role;
commit;
