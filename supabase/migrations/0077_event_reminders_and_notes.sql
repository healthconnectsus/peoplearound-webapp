-- Peoplearound — 0077 the day before, and the thing you forgot to say
--
-- Two gaps between planning an event and it actually happening:
--
--   • People say they're coming a fortnight out and then forget. A reminder
--     the day before is the single cheapest thing that improves turnout, and
--     this app already has the machinery: notifications are written in the
--     database and drained to phones by the push job (0025, 0032).
--   • Something always changes. It rains, the gate is locked, bring boots.
--     Today an organizer has nowhere to say that except a group chat the
--     people who signed up through a poster are not in.
--
-- Both write ordinary notifications, so they appear in the bell, go out as a
-- push within ten minutes, and obey everything already built around those.
--
-- The note is capped at one every ten minutes per event and 280 characters:
-- a nudge, not a channel. Nobody signed up to an event expecting a feed.
--
-- Idempotent.

-- Who has already been reminded about what. Written only by the function
-- below, so nothing here needs a policy.
create table if not exists public.event_reminders (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_reminders enable row level security;

-- What an organizer told everyone, kept so the event page can show it and
-- so the ten-minute cooling-off period has something to measure.
create table if not exists public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint event_messages_body_sane check (char_length(body) between 1 and 280)
);

create index if not exists event_messages_event_idx
  on public.event_messages (event_id, created_at desc);

alter table public.event_messages enable row level security;

-- Readable by any signed-in neighbor, like the event itself. Written only
-- through message_event_people(), which checks who is asking.
drop policy if exists "event notes readable by authenticated" on public.event_messages;
create policy "event notes readable by authenticated"
  on public.event_messages for select
  to authenticated
  using (true);


/**
 * The day-before reminder, for everyone coming or down for a job.
 *
 * Run by the cron at /api/event-reminders. The window is 12 to 36 hours
 * because event times are stored as the wall clock a founder typed (there is
 * no timezone on a neighborhood event), so "tomorrow" cannot be sharper than
 * that — and a reminder that arrives a few hours early still works.
 *
 * Each person is reminded once per event, which is what event_reminders
 * records; running the job twice sends nothing twice.
 */
create or replace function public.send_event_reminders()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_sent integer := 0;
  r record;
begin
  for r in
    select e.id as event_id,
           e.title,
           e.place,
           to_char(e.starts_at at time zone 'UTC', 'FMHH12:MI AM') as clock,
           x.user_id
      from public.events e
      join lateral (
        select rs.user_id from public.rsvps rs where rs.event_id = e.id
        union
        select s.user_id
          from public.event_role_signups s
          join public.event_roles ro on ro.id = s.role_id
         where ro.event_id = e.id
      ) x on true
     where e.starts_at between now() + interval '12 hours'
                           and now() + interval '36 hours'
       and not exists (
         select 1 from public.event_reminders m
          where m.event_id = e.id and m.user_id = x.user_id
       )
  loop
    insert into public.notifications (user_id, kind, body, href)
    values (
      r.user_id,
      'event',
      left(
        'Tomorrow at ' || r.clock || ': ' || r.title
          || coalesce(' · ' || nullif(btrim(r.place), ''), ''),
        300),
      '/events/' || r.event_id
    );
    insert into public.event_reminders (event_id, user_id)
    values (r.event_id, r.user_id)
    on conflict do nothing;
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.send_event_reminders() from public, anon, authenticated;
grant execute on function public.send_event_reminders() to service_role;


/**
 * "Bring boots, it's muddy" — from whoever runs the event to everyone in it.
 *
 * Reaches the people who said they're coming and the people who took a job,
 * which is exactly the set that needs to know and nobody else. The sender is
 * left out of their own announcement.
 */
create or replace function public.message_event_people(p_event uuid, p_body text)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_project uuid;
  v_title text;
  v_body text := btrim(p_body);
  v_told integer := 0;
  r record;
begin
  select e.project_id, e.title into v_project, v_title
    from public.events e where e.id = p_event;
  if v_project is null then
    raise exception 'no such event';
  end if;
  if not public.can_steward(v_project, auth.uid()) then
    raise exception 'only the people running this event can send that'
      using errcode = '42501';
  end if;
  if length(v_body) = 0 then
    raise exception 'nothing to send' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.event_messages m
     where m.event_id = p_event and m.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'a note just went out — give it ten minutes'
      using errcode = '55000';
  end if;

  insert into public.event_messages (event_id, author_id, body)
  values (p_event, auth.uid(), left(v_body, 280));

  for r in
    select distinct t.user_id from (
      select rs.user_id from public.rsvps rs where rs.event_id = p_event
      union
      select s.user_id
        from public.event_role_signups s
        join public.event_roles ro on ro.id = s.role_id
       where ro.event_id = p_event
    ) t
     where t.user_id <> auth.uid()
  loop
    insert into public.notifications (user_id, kind, body, href)
    values (
      r.user_id,
      'event',
      left(v_title || ': ' || v_body, 300),
      '/events/' || p_event
    );
    v_told := v_told + 1;
  end loop;

  return v_told;
end;
$$;

revoke all on function public.message_event_people(uuid, text) from public, anon;
grant execute on function public.message_event_people(uuid, text) to authenticated;


-- The event page (0075, 0076) learns about the notes. Restated in full, as
-- every revision of these readers is — a migration is a record of what the
-- function became, not a diff to apply in your head.
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
    'roles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id, 'title', r.title, 'detail', r.detail, 'needed', r.needed,
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
    'attended', coalesce((
      select jsonb_agg(a.user_id)
        from public.event_attendance a where a.event_id = p_id
    ), '[]'::jsonb),

    -- The last few notes the organizer sent, newest first.
    'notes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'body', m.body,
          'created_at', m.created_at,
          'author', (select pr.display_name from public.profiles pr
                      where pr.id = m.author_id))
        order by m.created_at desc)
        from (
          select m2.id, m2.body, m2.created_at, m2.author_id
            from public.event_messages m2
           where m2.event_id = p_id
           order by m2.created_at desc
           limit 5
        ) m
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.event_page(uuid) from public, anon;
grant execute on function public.event_page(uuid) to authenticated;
