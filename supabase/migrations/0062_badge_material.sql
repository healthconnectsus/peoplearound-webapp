-- Peoplearound — 0062 badges and milestones stop costing nine requests
--
-- `computeBadges` decides which of a person's badges are earned. It is
-- derived at read time from confirmed records — deliberately, so a badge can
-- never drift from the facts that justify it (INCENTIVES §2.5) — and that
-- derivation takes six API requests: their confirmed contributions, how many
-- attestations they have written, how many neighbors they brought, the first
-- ten members of their community, their completed projects with the teams on
-- them, and how many ideas they have shared.
--
-- Three pages call it: `/profile`, `/explore` (so a fresh badge celebrates
-- where you are rather than only on the profile) and `/projects/[id]` (so
-- sharing a first idea celebrates on the page you land on afterwards).
-- `communityMilestone` adds three more counts on `/explore`.
--
-- None of them is slow. All nine are counts and small reads. What nine buys
-- is nine draws from the tail — roughly one database read in twenty-five
-- takes between a third of a second and two seconds — on pages that were
-- already the heaviest in the app.
--
-- Two functions, one request each. The rules stay in TypeScript, where the
-- thresholds live next to the words they print.
--
-- SECURITY INVOKER: every table is read as the caller, under the same
-- policies as the requests these replace. Both take the subject as an
-- argument rather than assuming `auth.uid()`, because a profile page may
-- eventually show someone else's badges, and the row-level security — not
-- the argument — is what decides what is visible.
--
-- Idempotent.

create or replace function public.badge_material(
  p_user uuid,
  p_community uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    -- Confirmed contributions, with the type each one was.
    'confirmed', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'type', c.type))
        from public.contributions c
       where c.contributor_id = p_user
         and c.status = 'confirmed'
    ), '[]'::jsonb),

    'attested', (
      select count(*)::integer from public.attestations a
       where a.attester_id = p_user
    ),

    'invited', (
      select count(*)::integer from public.profiles p
       where p.invited_by = p_user
    ),

    -- The first ten members of their community, by join order. Whether they
    -- are among them is what makes someone a founding neighbor.
    'founding', coalesce((
      select jsonb_agg(f.user_id order by f.created_at)
        from (
          select cm.user_id, cm.created_at
            from public.community_members cm
           where p_community is not null
             and cm.community_id = p_community
           order by cm.created_at
           limit 10
        ) f
    ), '[]'::jsonb),

    -- Completed projects they founded, each with its team, so "finished
    -- something with other people" can be told from "finished it alone".
    'completedOwn', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', pr.id,
               'memberships', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'user_id', m.user_id, 'status', m.status))
                   from public.memberships m where m.project_id = pr.id
               ), '[]'::jsonb)))
        from public.projects pr
       where pr.owner_id = p_user
         and pr.state = 'completed'::project_state
    ), '[]'::jsonb),

    'ownIdeas', (
      select count(*)::integer from public.projects pr
       where pr.owner_id = p_user
    )
  );
$$;

revoke all on function public.badge_material(uuid, uuid) from public, anon;
grant execute on function public.badge_material(uuid, uuid) to authenticated;

-- The three counts behind "Aurora reached 10 neighbors". About the place,
-- never a person.
create or replace function public.community_milestone_counts(p_community uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'neighbors', (
      select count(*)::integer from public.profiles p
       where p.neighborhood_id = p_community
    ),
    'completed', (
      select count(*)::integer from public.projects pr
       where pr.neighborhood_id = p_community
         and pr.state = 'completed'::project_state
    ),
    'confirmed', (
      select count(*)::integer from public.contributions c
       where c.status = 'confirmed'
    )
  );
$$;

revoke all on function public.community_milestone_counts(uuid) from public, anon;
grant execute on function public.community_milestone_counts(uuid) to authenticated;
