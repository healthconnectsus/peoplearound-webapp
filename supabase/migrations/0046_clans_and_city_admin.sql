begin;

-- Demonstration residents are deliberately separate from auth/profiles.
-- They cannot sign in, receive messages, inflate member counts or earn credit.
create table if not exists public.demo_residents (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.event_cities(id) on delete cascade,
  slot integer not null check (slot between 1 and 20),
  display_name text not null check (display_name like 'Demo — %'),
  bio text not null default 'Example resident for exploring Peoplearound. Not a real person.',
  unique(city_id, slot)
);
alter table public.demo_residents enable row level security;
revoke all on public.demo_residents from anon, authenticated;
grant select on public.demo_residents to authenticated;
grant all on public.demo_residents to service_role;
drop policy if exists "demo residents in your cities" on public.demo_residents;
create policy "demo residents in your cities" on public.demo_residents for select to authenticated
using (public.can_read_city_events(city_id));

create or replace function public.seed_demo_residents(p_city uuid, p_count integer default 4)
returns void language sql security definer set search_path = public as $$
  insert into public.demo_residents(city_id,slot,display_name)
  select p_city, n, 'Demo — ' || (array['Avery','Jordan','Taylor','Morgan','Riley','Casey','Jamie','Skyler','Robin','Cameron'])[1+((n-1)%10)] || ' ' || n
  from generate_series(1,least(20,greatest(0,p_count))) n
  on conflict(city_id,slot) do nothing;
$$;
revoke all on function public.seed_demo_residents(uuid,integer) from public, anon, authenticated;
grant execute on function public.seed_demo_residents(uuid,integer) to service_role;
create or replace function public.seed_new_city_demos()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.seed_demo_residents(new.id,4); return new; end;
$$;
revoke all on function public.seed_new_city_demos() from public, anon, authenticated;
drop trigger if exists event_city_demo_seed on public.event_cities;
create trigger event_city_demo_seed after insert on public.event_cities
for each row execute function public.seed_new_city_demos();

-- Attribution for future events. Do not claim the project's owner created
-- an old event: it may actually have been posted by a co-organizer.
alter table public.events add column if not exists created_by uuid references public.profiles(id) on delete set null;
create or replace function public.stamp_event_creator()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.created_by := auth.uid();
  else new.created_by := old.created_by; end if;
  return new;
end;
$$;
drop trigger if exists events_creator on public.events;
create trigger events_creator before insert or update on public.events
for each row execute function public.stamp_event_creator();

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null default 'My clan' check (char_length(name) between 1 and 80),
  invite_code text not null unique default replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz not null default now()
);
create table if not exists public.clan_members (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(clan_id,user_id)
);
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
revoke all on public.clans,public.clan_members from anon,authenticated;
grant select on public.clans,public.clan_members to authenticated;
grant update(name) on public.clans to authenticated;
grant delete on public.clan_members to authenticated;
grant all on public.clans,public.clan_members to service_role;
create or replace function public.in_clan(p_clan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.clan_members where clan_id=p_clan and user_id=auth.uid());
$$;
revoke all on function public.in_clan(uuid) from public,anon;
grant execute on function public.in_clan(uuid) to authenticated;
drop policy if exists "members read clan" on public.clans;
drop policy if exists "owners name clan" on public.clans;
drop policy if exists "members read clan members" on public.clan_members;
drop policy if exists "members may leave" on public.clan_members;
create policy "members read clan" on public.clans for select to authenticated using (public.in_clan(id));
create policy "owners name clan" on public.clans for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "members read clan members" on public.clan_members for select to authenticated using(public.in_clan(clan_id));
create policy "members may leave" on public.clan_members for delete to authenticated using(user_id=auth.uid() and not exists(select 1 from public.clans where id=clan_id and owner_id=auth.uid()));

create or replace function public.create_personal_clan()
returns trigger language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  insert into public.clans(owner_id,name) values(new.id,left(coalesce(nullif(new.display_name,''),'My') || '''s clan',80))
  on conflict(owner_id) do update set owner_id=excluded.owner_id returning id into c;
  insert into public.clan_members(clan_id,user_id) values(c,new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.create_personal_clan() from public,anon,authenticated;
drop trigger if exists profile_personal_clan on public.profiles;
create trigger profile_personal_clan after insert on public.profiles for each row execute function public.create_personal_clan();
insert into public.clans(owner_id,name) select id,left(coalesce(nullif(display_name,''),'My') || '''s clan',80) from public.profiles on conflict(owner_id) do nothing;
insert into public.clan_members(clan_id,user_id) select id,owner_id from public.clans on conflict do nothing;

create or replace function public.join_clan(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to join a clan'; end if;
  select id into c from public.clans where invite_code=lower(trim(p_code));
  if c is null then raise exception 'Invite code not found'; end if;
  insert into public.clan_members(clan_id,user_id) values(c,auth.uid()) on conflict do nothing;
  return c;
end;
$$;
revoke all on function public.join_clan(text) from public,anon;
grant execute on function public.join_clan(text) to authenticated;

-- Welcome mail is queued only by NEW onboarding changes, never by a backfill.
create table if not exists public.welcome_mail_jobs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  due_at timestamptz not null default now()+interval '30 minutes',
  lease_until timestamptz,
  status text not null default 'pending',
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text
);
alter table public.welcome_mail_jobs add column if not exists payload jsonb;
alter table public.welcome_mail_jobs enable row level security;
revoke all on public.welcome_mail_jobs from anon,authenticated;
grant all on public.welcome_mail_jobs to service_role;
create or replace function public.queue_welcome_mail()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.neighborhood_id is not null then
    if tg_op='INSERT' or old.neighborhood_id is null then
      insert into public.welcome_mail_jobs(user_id) values(new.id) on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_welcome_mail() from public,anon,authenticated;
drop trigger if exists profile_welcome_mail on public.profiles;
create trigger profile_welcome_mail after insert or update of neighborhood_id on public.profiles
for each row execute function public.queue_welcome_mail();
create or replace function public.claim_welcome_mail()
returns setof public.welcome_mail_jobs language sql security definer set search_path=public as $$
update public.welcome_mail_jobs j set lease_until=now()+interval '10 minutes', attempts=attempts+1
where j.user_id in (select q.user_id from public.welcome_mail_jobs q where q.status='pending' and q.due_at<=now()
and (q.lease_until is null or q.lease_until<now()) and q.attempts<5 order by q.due_at for update skip locked limit 10) returning j.*;
$$;
revoke all on function public.claim_welcome_mail() from public,anon,authenticated;
grant execute on function public.claim_welcome_mail() to service_role;
commit;
