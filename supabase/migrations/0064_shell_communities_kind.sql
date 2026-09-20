-- Peoplearound — 0064 the frame's community list carries its kind
--
-- `shell_state()` (migration 0057) already returns every community you
-- belong to, with its centre, because the map needs the centre. It did not
-- return `kind`, so anything that needed to tell a neighborhood from a
-- hobby group — the badge on the profile page's community list, the emoji on
-- its map — had to read `community_members` again to find out.
--
-- One more column on a list that is already being built. The profile page
-- drops a request for it, and `shellState()` becomes a complete answer to
-- "which communities am I in", rather than an almost-complete one that every
-- caller has to top up.
--
-- Everything else about the function is unchanged; this is the same body
-- with `kind` added to the community objects. SECURITY INVOKER and keyed on
-- auth.uid() as before, so there is still no argument through which to ask
-- about anyone else.
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
               'kind', n.kind,
               'center_lat', n.center_lat, 'center_lng', n.center_lng)
             order by n.name)
        from public.neighborhoods n
       where n.id in (select id from mine)
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.shell_state() from public, anon;
grant execute on function public.shell_state() to authenticated;
