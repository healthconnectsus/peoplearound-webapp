-- Peoplearound — 0006 events + rsvps
-- Physical coordination attached to a project: the founder creates an event
-- (title, time, place); anyone signed in can RSVP with a single lightweight
-- "joining" signal. An RSVP is coordination, never a performance metric:
-- the only status is 'joining', absence is simply the absence of a row, and
-- no "no-show" data is ever stored or derivable. Idempotent.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rsvp_status') then
    -- Deliberately a single value: presence is rewardable, absence is
    -- never recorded, so it can never be punished.
    create type public.rsvp_status as enum ('joining');
  end if;
end
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  starts_at timestamptz not null,
  place text not null default '' check (char_length(place) <= 200),
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null default 'joining',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id) -- one signal per neighbor per event
);

alter table public.events enable row level security;
alter table public.rsvps enable row level security;

create index if not exists events_project_id_idx on public.events (project_id);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists rsvps_event_id_idx on public.rsvps (event_id);

-- ------------------------------------------------------------------
-- events policies — the founder coordinates; everyone can see.
-- ------------------------------------------------------------------

drop policy if exists "events readable by authenticated" on public.events;
create policy "events readable by authenticated"
  on public.events for select to authenticated using (true);

drop policy if exists "founder creates events" on public.events;
create policy "founder creates events"
  on public.events for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "founder updates events" on public.events;
create policy "founder updates events"
  on public.events for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "founder deletes events" on public.events;
create policy "founder deletes events"
  on public.events for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------
-- rsvps policies — your signal is yours alone.
-- ------------------------------------------------------------------

drop policy if exists "rsvps readable by authenticated" on public.rsvps;
create policy "rsvps readable by authenticated"
  on public.rsvps for select to authenticated using (true);

drop policy if exists "users rsvp as themselves" on public.rsvps;
create policy "users rsvp as themselves"
  on public.rsvps for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users withdraw own rsvp" on public.rsvps;
create policy "users withdraw own rsvp"
  on public.rsvps for delete to authenticated
  using (auth.uid() = user_id);
