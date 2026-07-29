-- Peoplearound — demo seed
-- Paste into the Supabase SQL editor to populate the pilot neighborhood with
-- a believable three weeks of fake activity: six neighbors, five projects,
-- stars, a real team, contributions at every trust stage (logged, accepted,
-- confirmed + attested), and past + upcoming events with RSVPs.
--
-- All demo accounts use emails @example.com and the password `neighbors123`,
-- so you can log in as any of them (e.g. maria@example.com) to demo the
-- founder/joiner/witness flows from different seats.
--
-- Idempotent: safe to re-run. To remove everything again, run the cleanup
-- at the bottom of this file.

-- ------------------------------------------------------------------
-- 1. Six demo neighbors (auth users → profiles via the existing trigger)
-- ------------------------------------------------------------------
do $$
declare
  ids uuid[] := array[
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003',
    'd0000000-0000-4000-8000-000000000004',
    'd0000000-0000-4000-8000-000000000005',
    'd0000000-0000-4000-8000-000000000006'
  ]::uuid[];
  emails text[] := array[
    'maria@example.com', 'john@example.com', 'amara@example.com',
    'tom@example.com', 'elena@example.com', 'sam@example.com'
  ];
  names text[] := array['Maria', 'John', 'Amara', 'Tom', 'Elena', 'Sam'];
  pilot uuid;
  i int;
begin
  select id into pilot from public.neighborhoods order by created_at limit 1;

  for i in 1..array_length(ids, 1) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', ids[i],
      'authenticated', 'authenticated', emails[i],
      extensions.crypt('neighbors123', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', names[i]),
      now() - interval '30 days', now()
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), ids[i],
      jsonb_build_object('sub', ids[i]::text, 'email', emails[i], 'email_verified', true),
      'email', ids[i]::text, now(), now(), now()
    )
    on conflict do nothing;

    -- The on-signup trigger created the profile; make sure the name and
    -- neighborhood are set even on re-runs.
    update public.profiles
       set display_name = names[i], neighborhood_id = pilot
     where id = ids[i];
  end loop;
end
$$;

-- ------------------------------------------------------------------
-- 2. Projects (neighborhood is stamped by the insert trigger)
--    Maria d…01 · John d…02 · Amara d…03 · Tom d…04 · Elena d…05 · Sam d…06
-- ------------------------------------------------------------------
insert into public.projects (id, owner_id, title, description, category, state, created_at, updated_at)
values
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   'Turn the empty lot on Oak Street into a community garden',
   'That fenced-off lot has been sitting empty for years. I want to turn it into a garden we all share — raised beds, a compost corner, maybe a bench. I''ve never done anything like this and I can''t do it alone, but I keep imagining tomatoes there.',
   'community', 'active', now() - interval '21 days', now() - interval '1 day'),
  ('da000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004',
   'Neighborhood tool library in my garage',
   'I have a full wall of tools I use twice a year. What if my garage became the place you borrow a drill, a ladder, or a tile cutter instead of buying one? I''d need help cataloguing and setting simple rules.',
   'community', 'idea', now() - interval '10 days', now() - interval '10 days'),
  ('da000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000005',
   'Free Saturday math tutoring for kids',
   'I taught math for 12 years and I miss it. Saturday mornings at the library meeting room: any kid, any level, free. Parents welcome to stay. I could use one or two more adults who like fractions more than is normal.',
   'learning', 'active', now() - interval '14 days', now() - interval '6 days'),
  ('da000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002',
   'Fix up the Riverside playground swings',
   'Two of the four swings have been broken since spring and the chains squeak like a horror film. New seats, new hardware, a morning of work. Done together, it''s a Saturday.',
   'community', 'completed', now() - interval '28 days', now() - interval '5 days'),
  ('da000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006',
   'Weekly evening walking group',
   'Nothing fancy — a loop around the park, Tuesday evenings, any pace. I''ve been walking alone and honestly it would be nicer with company.',
   'fitness', 'idea', now() - interval '2 days', now() - interval '2 days')
on conflict (id) do nothing;

-- ------------------------------------------------------------------
-- 3. Stars — spread over days so the timeline clusters read naturally
-- ------------------------------------------------------------------
insert into public.stars (project_id, user_id, created_at) values
  -- The garden gathers momentum
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', now() - interval '20 days'),
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', now() - interval '20 days' + interval '3 hours'),
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', now() - interval '19 days'),
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', now() - interval '18 days'),
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', now() - interval '17 days'),
  -- Tool library
  ('da000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', now() - interval '9 days'),
  ('da000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', now() - interval '9 days' + interval '2 hours'),
  ('da000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', now() - interval '8 days'),
  -- Tutoring
  ('da000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', now() - interval '13 days'),
  ('da000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', now() - interval '12 days'),
  -- Playground (Sam starred → later attests Maria''s contribution)
  ('da000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000006', now() - interval '26 days'),
  ('da000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005', now() - interval '25 days'),
  ('da000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', now() - interval '24 days'),
  -- Walking group, fresh
  ('da000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', now() - interval '1 day')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 4. Memberships — accepted teams + a pending request to demo approval
-- ------------------------------------------------------------------
insert into public.memberships (project_id, user_id, status, created_at) values
  -- Garden team: John and Amara in, Tom''s request waiting for Maria
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'accepted', now() - interval '18 days'),
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'accepted', now() - interval '17 days'),
  ('da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'pending',  now() - interval '2 days'),
  -- Tool library: Elena wants in
  ('da000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'pending',  now() - interval '1 day'),
  -- Tutoring: Sam helps Elena
  ('da000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000006', 'accepted', now() - interval '11 days'),
  -- Playground: Maria helped John
  ('da000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'accepted', now() - interval '23 days')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 5. Contributions — one at every trust stage, all rules respected
--    (contributor is an accepted teammate, never the founder)
-- ------------------------------------------------------------------
insert into public.contributions (id, project_id, contributor_id, type, description, status, created_at, accepted_at, confirmed_at) values
  -- Garden: John''s permit knowledge — fully confirmed
  ('dc000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
   'knowledge', 'Tracked down the city land-use permit — it''s form B-7, and Denise at the parks department (ext. 4102) walks you through it. She says lots like ours get approved in 2–3 weeks.',
   'confirmed', now() - interval '15 days', now() - interval '15 days' + interval '5 hours', now() - interval '14 days'),
  -- Garden: Amara''s truck day — fully confirmed
  ('dc000000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003',
   'resource', 'Borrowed my cousin''s pickup and hauled twelve bags of soil plus the pallet of planks for the raised beds. Truck available again whenever we need it.',
   'confirmed', now() - interval '8 days', now() - interval '8 days' + interval '3 hours', now() - interval '7 days'),
  -- Garden: John''s weeding — accepted, awaiting a witness
  ('dc000000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
   'time', 'Spent Sunday morning clearing the weeds and dragging out the old fencing wire from the back half of the lot.',
   'accepted', now() - interval '3 days', now() - interval '2 days', null),
  -- Garden: Amara''s proposal draft — just logged, waiting for Maria
  ('dc000000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003',
   'skill', 'Drafted the one-page proposal for the parks department — scope, watering plan, and who maintains what. Shared in the group for edits.',
   'logged', now() - interval '1 day', null, null),
  -- Tutoring: Sam showed up and ran a table — confirmed
  ('dc000000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000006',
   'presence', 'Ran the fractions table for the younger kids all morning — four of them, two breakthroughs, one pizza analogy that finally landed.',
   'confirmed', now() - interval '6 days', now() - interval '6 days' + interval '4 hours', now() - interval '5 days'),
  -- Playground: Maria brought the hardware — confirmed (project completed)
  ('dc000000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001',
   'resource', 'Got the two replacement swing seats and galvanized chains at cost from the hardware store on 5th — told them what it was for and they knocked 30% off.',
   'confirmed', now() - interval '9 days', now() - interval '9 days' + interval '2 hours', now() - interval '8 days')
on conflict (id) do nothing;

-- Attestations: a second person saw each confirmed contribution happen
-- (attester is never the contributor and never the founder).
insert into public.attestations (contribution_id, attester_id, created_at) values
  ('dc000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', now() - interval '14 days'), -- Amara saw John''s permit find
  ('dc000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', now() - interval '7 days'),  -- John saw Amara''s truck day
  ('dc000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', now() - interval '5 days'),  -- Maria (stargazer) saw Sam tutor
  ('dc000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', now() - interval '8 days')   -- Sam (stargazer) saw Maria''s hardware run
on conflict do nothing;

-- ------------------------------------------------------------------
-- 6. Events — one already held (with the story to show for it),
--    one coming up (so "Happening soon" has something to say)
-- ------------------------------------------------------------------
insert into public.events (id, project_id, title, starts_at, place, created_at) values
  ('de000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001',
   'Soil hauling Saturday', now() - interval '8 days', 'The Oak Street lot', now() - interval '11 days'),
  ('de000000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-000000000001',
   'First planting day — bring gloves!', now() + interval '4 days', 'The Oak Street lot', now() - interval '2 days'),
  ('de000000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-000000000003',
   'Saturday tutoring — all kids welcome', now() + interval '2 days', 'Library meeting room', now() - interval '4 days'),
  ('de000000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-000000000004',
   'Swing repair morning', now() - interval '9 days', 'Riverside playground', now() - interval '13 days')
on conflict (id) do nothing;

insert into public.rsvps (event_id, user_id, created_at) values
  ('de000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', now() - interval '10 days'),
  ('de000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', now() - interval '10 days'),
  ('de000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', now() - interval '9 days'),
  ('de000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', now() - interval '2 days'),
  ('de000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', now() - interval '2 days'),
  ('de000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', now() - interval '1 day'),
  ('de000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000006', now() - interval '1 day'),
  ('de000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000006', now() - interval '3 days'),
  ('de000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('de000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', now() - interval '12 days'),
  ('de000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000006', now() - interval '11 days')
on conflict do nothing;

-- ------------------------------------------------------------------
-- CLEANUP — run this block (uncommented) to remove all demo data.
-- Deleting the auth users cascades through profiles → projects → stars,
-- memberships, contributions, attestations, events, and rsvps.
-- ------------------------------------------------------------------
-- delete from auth.users where id in (
--   'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
--   'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004',
--   'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006'
-- );
