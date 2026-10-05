-- Peoplearound — 0075 an event's own page, in one read
--
-- Events have never had a page of their own: they are rendered inside the
-- project that owns them, which is fine for a line in a list and useless for
-- the person running one. /events/<id> is that page — what it is, who is
-- coming, and (for a steward) the controls to publish, correct or print it.
--
-- One document, like the pages before it (0057, 0066, 0069): the event, its
-- project, whether you may run it, who is coming, and whether you are.
--
-- SECURITY INVOKER, so the same row-level security applies as to the queries
-- it replaces — events and rsvps are readable by any signed-in neighbor, and
-- can_steward() decides who may change anything.
--
-- Idempotent.

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
        'id', e.id,
        'title', e.title,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'place', e.place,
        'description', e.description,
        'photo_url', e.photo_url,
        'share_code', e.share_code,
        'project_id', e.project_id)
        from public.events e where e.id = p_id
    ),

    'project', (
      select jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'category', p.category,
        'state', p.state,
        'owner_id', p.owner_id,
        'neighborhood', (
          select jsonb_build_object('name', n.name, 'city', n.city)
            from public.neighborhoods n where n.id = p.neighborhood_id
        ))
        from public.events e
        join public.projects p on p.id = e.project_id
       where e.id = p_id
    ),

    -- Founder or co-organizer: the two people who may run this.
    'can_steward', coalesce((
      select public.can_steward(e.project_id, auth.uid())
        from public.events e where e.id = p_id
    ), false),

    -- Who is coming, in the order they said so.
    'going', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', r.user_id,
          'created_at', r.created_at,
          'display_name', pr.display_name,
          'avatar_url', pr.avatar_url)
        order by r.created_at)
        from public.rsvps r
        left join public.profiles pr on pr.id = r.user_id
       where r.event_id = p_id
    ), '[]'::jsonb),

    'mine', exists (
      select 1 from public.rsvps r
       where r.event_id = p_id and r.user_id = auth.uid()
    )
  );
$$;

revoke all on function public.event_page(uuid) from public, anon;
grant execute on function public.event_page(uuid) to authenticated;
