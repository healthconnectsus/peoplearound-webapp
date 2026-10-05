-- Peoplearound — 0076 jobs that need doing, and who said they'd do them
--
-- An RSVP says "I'll be there". Running anything real needs the other
-- question answered: who is bringing the tables, who is on the grill, who
-- stays behind to sweep. Today an organizer keeps that in their head, or in
-- a WhatsApp thread where it is lost by Thursday.
--
-- So an event can list jobs — a title, how many people it takes, and a line
-- of detail — and any signed-in neighbor can take one. Not just teammates:
-- the whole point is to pull in the person who saw the poster.
--
-- Three rules worth stating, because they are enforced here rather than
-- hoped for in the interface:
--
--   • A job cannot be oversubscribed. The trigger below refuses the signup
--     that would exceed what the organizer asked for, so two people tapping
--     the last slot at the same moment cannot both get it.
--   • Only a steward writes jobs; only you write your own signup; either of
--     you can undo it. (A volunteer who vanishes is an organizer's problem
--     to tidy, so a steward may remove a signup too.)
--   • Attendance is the organizer's note of who actually came. It is not a
--     contribution and never becomes one on its own: this app's whole trust
--     model is that people log their own help and someone else confirms it,
--     and a tick box here would be a back door around that. What it does is
--     tell the organizer, honestly, that twelve of the fifteen turned up.
--
-- Idempotent.

create table if not exists public.event_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  detail text,
  needed integer not null default 1,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint event_roles_title_present check (length(btrim(title)) > 0),
  constraint event_roles_needed_sane check (needed between 1 and 200)
);

create index if not exists event_roles_event_idx
  on public.event_roles (event_id, position, created_at);

create table if not exists public.event_role_signups (
  role_id uuid not null references public.event_roles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, user_id)
);

create index if not exists event_role_signups_user_idx
  on public.event_role_signups (user_id);

create table if not exists public.event_attendance (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  marked_at timestamptz not null default now(),
  marked_by uuid references public.profiles (id) on delete set null,
  primary key (event_id, user_id)
);

alter table public.event_roles enable row level security;
alter table public.event_role_signups enable row level security;
alter table public.event_attendance enable row level security;

-- Which project owns the event a job belongs to — the thing every policy
-- below has to ask before it can answer "may you?".
create or replace function public.event_project(p_event uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.project_id from public.events e where e.id = p_event;
$$;

revoke all on function public.event_project(uuid) from public, anon;
grant execute on function public.event_project(uuid) to authenticated;

-- Jobs are readable by any signed-in neighbor, exactly like the events they
-- hang off, and writable only by whoever runs the project.
drop policy if exists "roles readable by authenticated" on public.event_roles;
create policy "roles readable by authenticated"
  on public.event_roles for select
  to authenticated
  using (true);

drop policy if exists "stewards write roles" on public.event_roles;
create policy "stewards write roles"
  on public.event_roles for all
  to authenticated
  using (public.can_steward(public.event_project(event_id), auth.uid()))
  with check (public.can_steward(public.event_project(event_id), auth.uid()));

drop policy if exists "signups readable by authenticated" on public.event_role_signups;
create policy "signups readable by authenticated"
  on public.event_role_signups for select
  to authenticated
  using (true);

drop policy if exists "you take a job yourself" on public.event_role_signups;
create policy "you take a job yourself"
  on public.event_role_signups for insert
  to authenticated
  with check (user_id = auth.uid());

-- You can step back; so can the organizer, who has a list to keep honest.
drop policy if exists "you or the steward can undo it" on public.event_role_signups;
create policy "you or the steward can undo it"
  on public.event_role_signups for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.event_roles r
       where r.id = role_id
         and public.can_steward(public.event_project(r.event_id), auth.uid())
    )
  );

-- Attendance: the organizer writes it; they and the person it is about can
-- read it. Nobody else needs to know who turned up.
drop policy if exists "attendance visible to steward and the person" on public.event_attendance;
create policy "attendance visible to steward and the person"
  on public.event_attendance for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_steward(public.event_project(event_id), auth.uid())
  );

drop policy if exists "stewards keep attendance" on public.event_attendance;
create policy "stewards keep attendance"
  on public.event_attendance for all
  to authenticated
  using (public.can_steward(public.event_project(event_id), auth.uid()))
  with check (public.can_steward(public.event_project(event_id), auth.uid()));

-- A job takes as many people as it takes. Checked here, where two
-- simultaneous taps on the last slot cannot both win.
create or replace function public.event_role_has_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needed integer;
  v_taken integer;
begin
  select needed into v_needed from public.event_roles where id = new.role_id for update;
  if v_needed is null then
    raise exception 'that job no longer exists';
  end if;
  select count(*) into v_taken from public.event_role_signups where role_id = new.role_id;
  if v_taken >= v_needed then
    raise exception 'that job is already full' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists event_role_signups_capacity on public.event_role_signups;
create trigger event_role_signups_capacity
  before insert on public.event_role_signups
  for each row execute function public.event_role_has_room();


-- ---------------------------------------------------------------------
-- The two readers learn about jobs.
-- ---------------------------------------------------------------------

-- The event's own page (0075), now with the jobs, who took them, and who the
-- organizer has ticked off as having turned up. Still SECURITY INVOKER: the
-- attendance policy above is what keeps that list to the steward and the
-- person it is about.
create or replace function public.event_page(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'event', (
      select jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at,
        'ends_at', e.ends_at, 'place', e.place, 'description', e.description,
        'photo_url', e.photo_url, 'share_code', e.share_code,
        'project_id', e.project_id)
        from public.events e where e.id = p_id
    ),
    'project', (
      select jsonb_build_object(
        'id', p.id, 'title', p.title, 'category', p.category, 'state', p.state,
        'owner_id', p.owner_id,
        'neighborhood', (
          select jsonb_build_object('name', n.name, 'city', n.city)
            from public.neighborhoods n where n.id = p.neighborhood_id))
        from public.events e
        join public.projects p on p.id = e.project_id
       where e.id = p_id
    ),
    'can_steward', coalesce((
      select public.can_steward(e.project_id, auth.uid())
        from public.events e where e.id = p_id
    ), false),
    'going', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', r.user_id, 'created_at', r.created_at,
          'display_name', pr.display_name, 'avatar_url', pr.avatar_url)
        order by r.created_at)
        from public.rsvps r
        left join public.profiles pr on pr.id = r.user_id
       where r.event_id = p_id
    ), '[]'::jsonb),
    'mine', exists (
      select 1 from public.rsvps r
       where r.event_id = p_id and r.user_id = auth.uid()
    ),

    -- What needs doing, in the order the organizer wrote it.
    'roles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'detail', r.detail,
          'needed', r.needed,
          'takers', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'user_id', s.user_id,
                'display_name', pr.display_name,
                'avatar_url', pr.avatar_url)
              order by s.created_at)
              from public.event_role_signups s
              left join public.profiles pr on pr.id = s.user_id
             where s.role_id = r.id
          ), '[]'::jsonb),
          'mine', exists (
            select 1 from public.event_role_signups s
             where s.role_id = r.id and s.user_id = auth.uid()))
        order by r.position, r.created_at)
        from public.event_roles r
       where r.event_id = p_id
    ), '[]'::jsonb),

    -- Who the organizer has ticked off. Empty for everyone else, by policy.
    'attended', coalesce((
      select jsonb_agg(a.user_id)
        from public.event_attendance a where a.event_id = p_id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.event_page(uuid) from public, anon;
grant execute on function public.event_page(uuid) to authenticated;


-- The public page (0074), now able to say that help is wanted. Counts only:
-- how many a job takes and how many have taken it, never who.
create or replace function public.public_event(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'place', e.place,
    'description', e.description,
    'photo_url', e.photo_url,
    'going', (select count(*) from public.rsvps r where r.event_id = e.id),
    'jobs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'title', r.title,
          'detail', r.detail,
          'needed', r.needed,
          'taken', (select count(*) from public.event_role_signups s
                     where s.role_id = r.id))
        order by r.position, r.created_at)
        from public.event_roles r where r.event_id = e.id
    ), '[]'::jsonb),
    'project', jsonb_build_object('title', p.title, 'category', p.category),
    'community', (
      select jsonb_build_object('name', n.name, 'city', n.city)
        from public.neighborhoods n where n.id = p.neighborhood_id
    )
  )
    from public.events e
    join public.projects p on p.id = e.project_id
   where e.share_code = p_code
     and p.state <> 'archived'::project_state;
$$;

revoke all on function public.public_event(text) from public;
grant execute on function public.public_event(text) to anon, authenticated;
