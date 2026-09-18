-- Peoplearound — 0057 everything the page frame needs, in one read
--
-- Every signed-in page draws the same frame: your name and avatar, the
-- numbers beside the sidebar rails, the notification bell, and a map centred
-- on your place. Assembling it took twelve separate API requests per page
-- view — your profile, six counts, the inbox and its unread count, your
-- saved location, your memberships, and those communities' centres.
--
-- None of those is slow. Postgres answers each in a millisecond or two. But
-- each is its own trip through the API gateway, and measured from inside the
-- serverless function roughly one request in twenty-five takes between a
-- third of a second and two seconds instead of thirty milliseconds — the
-- database host is small and leans on swap. A page that makes twenty-five
-- requests meets that slow one most of the time; a page that makes a handful
-- mostly does not. Tail latency is paid per request, so the fix is fewer
-- requests, not faster ones.
--
-- This returns the whole frame as one JSON document.
--
-- SECURITY INVOKER, deliberately: every table is read as the caller, through
-- the same row-level security as the separate queries it replaces, and keyed
-- on auth.uid() rather than a parameter — there is no argument through which
-- to ask about anyone else. The faves count reuses visible_faves_count()
-- (0054) so that number keeps a single definition.
--
-- Idempotent.

create or replace function public.shell_state()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select p.id, p.display_name, p.avatar_url,
           coalesce(p.is_admin, false) as is_admin,
           p.created_at, p.neighborhood_id
      from public.profiles p
     where p.id = auth.uid()
  ),
  mine as (
    -- Every community you belong to; your primary one counts even if the
    -- membership row is missing (accounts older than migration 0011).
    select cm.community_id as id
      from public.community_members cm
     where cm.user_id = auth.uid()
    union
    select me.neighborhood_id from me where me.neighborhood_id is not null
  )
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', me.id,
        'display_name', me.display_name,
        'avatar_url', me.avatar_url,
        'is_admin', me.is_admin,
        'created_at', me.created_at,
        'neighborhood_id', me.neighborhood_id,
        'neighborhood', (
          select jsonb_build_object(
            'name', n.name, 'city', n.city,
            'center_lat', n.center_lat, 'center_lng', n.center_lng)
            from public.neighborhoods n
           where n.id = me.neighborhood_id
        )
      )
      from me
    ),
    'counts', jsonb_build_object(
      'faves', public.visible_faves_count(),
      'events', (select count(*) from public.rsvps r where r.user_id = auth.uid()),
      'offers', (
        select count(*) from public.offers o
         where o.user_id = auth.uid() and o.kind <> 'need'
      ),
      'people', (
        select count(*) from public.profiles p2, me
         where me.neighborhood_id is not null
           and p2.neighborhood_id = me.neighborhood_id
           and p2.id <> me.id
      ),
      'ideas', (
        select count(*) from public.projects pr
         where pr.owner_id = auth.uid() and pr.state <> 'archived'
      ) + (
        select count(*) from public.memberships m
         where m.user_id = auth.uid() and m.status = 'accepted'
      )
    ),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
        from (
          select id, kind, body, href, read_at, created_at
            from public.notifications
           where user_id = auth.uid()
           order by created_at desc
           limit 15
        ) x
    ), '[]'::jsonb),
    'unread', (
      select count(*) from public.notifications
       where user_id = auth.uid() and read_at is null
    ),
    'location', (
      select jsonb_build_object('lat', ul.lat, 'lng', ul.lng)
        from public.user_locations ul
       where ul.user_id = auth.uid()
    ),
    'communities', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', n.id, 'name', n.name, 'city', n.city,
               'center_lat', n.center_lat, 'center_lng', n.center_lng)
             order by n.name)
        from public.neighborhoods n
       where n.id in (select id from mine)
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.shell_state() from public, anon;
grant execute on function public.shell_state() to authenticated;
