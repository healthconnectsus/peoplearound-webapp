-- Peoplearound — 0078 calling it off, out loud
--
-- Until now the only way to stop an event was to delete it. The row vanished,
-- and so did any word to the fifteen people who had said they were coming:
-- they found out by turning up. Deleting is right for a mistake typed in five
-- minutes ago; it is wrong for a thing that rain cancelled.
--
-- So an event can be cancelled instead: it keeps its page, says plainly that
-- it is off and why, and everyone coming or down for a job is told at once.
-- The poster's QR keeps working and lands on "this has been cancelled", which
-- is exactly what someone reading a flyer on a lamppost needs to learn.
--
-- A cancelled event stops behaving like a plan: no reminder goes out, it
-- leaves the feed, and nobody can newly say they're coming. Nothing is
-- deleted — the record of what was planned stays.
--
-- Idempotent.

alter table public.events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_reason text;

/**
 * Call it off and tell everyone. Stewards only, checked here.
 *
 * Returns how many people were told, which the page reports back, because
 * "cancelled" and "fifteen people now know" are different facts and the
 * organizer needs the second one.
 */
create or replace function public.cancel_event(p_event uuid, p_reason text)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_project uuid;
  v_title text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_told integer := 0;
  r record;
begin
  select e.project_id, e.title into v_project, v_title
    from public.events e where e.id = p_event;
  if v_project is null then
    raise exception 'no such event';
  end if;
  if not public.can_steward(v_project, auth.uid()) then
    raise exception 'only the people running this event can cancel it'
      using errcode = '42501';
  end if;

  update public.events
     set cancelled_at = now(),
         cancelled_reason = left(v_reason, 280),
         updated_at = now()
   where id = p_event
     and cancelled_at is null;

  if not found then
    return 0;  -- already cancelled; nobody is told twice
  end if;

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
      left('Cancelled: ' || v_title || coalesce(' — ' || v_reason, ''), 300),
      '/events/' || p_event
    );
    v_told := v_told + 1;
  end loop;

  return v_told;
end;
$$;

revoke all on function public.cancel_event(uuid, text) from public, anon;
grant execute on function public.cancel_event(uuid, text) to authenticated;

/** Changed your mind — back on, with nobody told twice. */
create or replace function public.uncancel_event(p_event uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  select e.project_id into v_project from public.events e where e.id = p_event;
  if v_project is null then
    raise exception 'no such event';
  end if;
  if not public.can_steward(v_project, auth.uid()) then
    raise exception 'only the people running this event can do that'
      using errcode = '42501';
  end if;

  update public.events
     set cancelled_at = null, cancelled_reason = null, updated_at = now()
   where id = p_event;

  return true;
end;
$$;

revoke all on function public.uncancel_event(uuid) from public, anon;
grant execute on function public.uncancel_event(uuid) to authenticated;


-- A cancelled event is not a plan: it gets no reminder. (Restated from 0077
-- with that one condition added.)
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
     where e.cancelled_at is null
       and e.starts_at between now() + interval '12 hours'
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


-- Both readers carry the cancellation, so every page can say so.
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
        'project_id', e.project_id,
        'cancelled_at', e.cancelled_at, 'cancelled_reason', e.cancelled_reason)
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
    'notes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id, 'body', m.body, 'created_at', m.created_at,
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
    'cancelled_at', e.cancelled_at,
    'cancelled_reason', e.cancelled_reason,
    'going', (select count(*) from public.rsvps r where r.event_id = e.id),
    'jobs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'title', r.title, 'detail', r.detail, 'needed', r.needed,
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


-- A cancelled event leaves the feed too. feed_material (0060) is restated
-- from its live definition with one condition added, so a project card stops
-- advertising a thing that is not happening.
CREATE OR REPLACE FUNCTION public.feed_material(p_since timestamp with time zone, p_project_ids uuid[] DEFAULT NULL::uuid[], p_limit integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with scope as (
    select p.*
      from public.projects p
     where p.state <> 'archived'::project_state
       and (p_project_ids is null or p.id = any (p_project_ids))
     order by p.created_at desc
     limit least(greatest(coalesce(p_limit, 200), 1), 1000)
  )
  select jsonb_build_object(
    'projects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id, 'owner_id', s.owner_id, 'title', s.title,
          'description', s.description, 'category', s.category,
          'state', s.state, 'help', s.help, 'reach', s.reach,
          'photo_url', s.photo_url, 'when_text', s.when_text,
          'lat', s.lat, 'lng', s.lng,
          'neighborhood_id', s.neighborhood_id,
          'created_at', s.created_at, 'updated_at', s.updated_at,
          'owner', (
            select jsonb_build_object(
              'display_name', o.display_name, 'avatar_url', o.avatar_url)
              from public.profiles o where o.id = s.owner_id
          ),
          'neighborhood', (
            select jsonb_build_object('name', n.name, 'city', n.city)
              from public.neighborhoods n where n.id = s.neighborhood_id
          )
        )
        order by s.created_at desc
      ) from scope s
    ), '[]'::jsonb),

    'stars', coalesce((
      select jsonb_agg(jsonb_build_object(
               'project_id', st.project_id,
               'created_at', st.created_at,
               'user_id', st.user_id))
        from public.stars st
       where st.project_id in (select id from scope)
    ), '[]'::jsonb),

    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'project_id', m.project_id,
               'status', m.status,
               'created_at', m.created_at,
               'profile', (select jsonb_build_object('display_name', pr.display_name)
                             from public.profiles pr where pr.id = m.user_id)))
        from public.memberships m
       where m.status = 'accepted'
         and m.project_id in (select id from scope)
    ), '[]'::jsonb),

    -- Ordered and capped exactly as the query it replaces: soonest first,
    -- thirty across the whole feed rather than thirty per project.
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.starts_at)
        from (
          select
            ev.id, ev.project_id, ev.title, ev.starts_at, ev.place,
            ev.created_at,
            coalesce((
              select jsonb_agg(jsonb_build_object('user_id', r.user_id))
                from public.rsvps r where r.event_id = ev.id
            ), '[]'::jsonb) as rsvps,
            (select jsonb_build_object('title', pj.title)
               from public.projects pj where pj.id = ev.project_id) as project
          from public.events ev
         where ev.project_id in (select id from scope)
           and ev.cancelled_at is null
         order by ev.starts_at
         limit 30
        ) e
    ), '[]'::jsonb),

    'confirmed', coalesce((
      select jsonb_agg(jsonb_build_object(
               'project_id', c.project_id,
               'confirmed_at', c.confirmed_at,
               'contributor', (select jsonb_build_object('display_name', cp.display_name)
                                 from public.profiles cp where cp.id = c.contributor_id)))
        from public.contributions c
       where c.status = 'confirmed'
         and c.confirmed_at >= p_since
         and c.project_id in (select id from scope)
    ), '[]'::jsonb)
  );
$function$
;
