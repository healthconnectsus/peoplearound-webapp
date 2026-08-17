#!/usr/bin/env node
/**
 * generate-demo-seed.mjs — deterministically generates scripts/demo-seed-large.sql:
 * 100 fake users across 3 neighborhoods (2 cities) and 30 projects with
 * stars, teams, contributions at every trust stage, attestations, and
 * events — all respecting the product's trust rules (no self-crediting,
 * attester ≠ contributor ≠ founder, star/join eligibility follows reach).
 *
 * Run:  node scripts/generate-demo-seed.mjs [--lat=48.8566 --lng=2.3522]
 * (--lat/--lng center the demo map pins on your real city; the default is
 * Central Park, NYC. Old Town — the second city — lands ~15 km away.)
 * Then paste scripts/demo-seed-large.sql into the Supabase SQL editor.
 * Deterministic (seeded PRNG): re-running produces the identical file.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "demo-seed-large.sql");

// Seeded PRNG (mulberry32) — believable variety, identical on every run.
let s = 20260729;
const rand = () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const q = (t) => t.replace(/'/g, "''");

// Map-pin bases: pilot + Riverside share a city; Old Town is another city.
const argVal = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? parseFloat(a.split("=")[1]) : dflt;
};
const BASE_LAT = argVal("lat", 39.7294); // Aurora, CO
const BASE_LNG = argVal("lng", -104.8319);
const HOOD_BASE = [
  [BASE_LAT, BASE_LNG], // pilot
  [BASE_LAT + 0.018, BASE_LNG + 0.02], // Riverside (same city)
  [BASE_LAT - 0.11, BASE_LNG + 0.09], // Old Town (other city, ~15 km away)
];

const uid = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pid = (n) => `ea000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const cid = (n) => `ec000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const eid = (n) => `ee000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ------------------------------------------------------------------ users
const FIRST = [
  "Nora","Devon","Priya","Marcus","Ines","Kofi","Lena","Omar","Sofia","Jonas",
  "Aisha","Pete","Yuki","Carlos","Maja","Tariq","Grace","Viktor","Rosa","Sean",
  "Amina","Leo","Hana","Diego","Freya","Ravi","Clara","Musa","Ella","Bram",
  "Zoe","Ivan","Layla","Owen","Nadia","Felix","Iris","Jamal","Ruth","Anders",
  "Bianca","Chen","Dara","Emil","Farah","Gustav","Hilda","Idris","Julia","Karim",
];
const LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW";
const users = [];
const seenNames = new Set();
for (let i = 1; i <= 100; i++) {
  let name;
  do {
    name = `${pick(FIRST)} ${LAST_INITIALS[int(0, LAST_INITIALS.length - 1)]}.`;
  } while (seenNames.has(name));
  seenNames.add(name);
  users.push({
    id: uid(i),
    email: `u${i}@example.com`,
    name,
    hood: i % 3, // 0 = pilot, 1 = Riverside, 2 = Old Town
  });
}

// --------------------------------------------------------------- projects
// [title, description, category, state, help, reach]
const PROJECTS = [
  ["Repaint the faded crosswalks near the school", "The zebra stripes on both crossings by the elementary school have almost disappeared. The city says 'next year'. I say: one weekend, proper road paint, done. Need a few steady hands and someone who owns a pressure washer.", "community", "active", "local", "neighborhood"],
  ["Community fridge outside the bakery", "The bakery agreed to host a community fridge on their wall — surplus food in, anyone takes what they need. I need help building the shelter box and a small rota of people to keep it clean.", "community", "active", "local", "neighborhood"],
  ["Turn the station underpass into a mural", "It's grey, it's grim, and every kid walks through it daily. I've got provisional blessing from the council and two art students — we need painters of any skill level and someone to sweet-talk a paint shop into a discount.", "community", "idea", "both", "city"],
  ["Weekly board game night at the library", "The library lets us use the back room every Thursday. I have four boxes of games. Come play — and I could use a co-host so it doesn't die when I'm sick.", "community", "active", "local", "neighborhood"],
  ["Fix the creaky bench circle in Miller Park", "Five benches, all wobbly, one actually dangerous. Wood, screws, one afternoon. The parks office said if we fix them to spec they'll sign it off.", "home", "idea", "local", "neighborhood"],
  ["Neighborhood seed & cutting swap", "Everyone's windowsill basil dies alone. Twice a month we swap seeds, cuttings and advice on the church steps. Need a second table and someone who can label things legibly.", "community", "active", "local", "neighborhood"],
  ["Teach seniors to video-call their grandkids", "One hour, one senior, one phone — that's all it takes. The community center gives us the room. Patient people wanted; tech skills optional, kindness mandatory.", "learning", "active", "local", "neighborhood"],
  ["Open-source app for our tool library", "Our garage tool library is outgrowing the paper notebook. I'm building a tiny lending app (Next.js + Supabase, fittingly) and could use a designer and another dev — from anywhere, honestly.", "venture", "active", "remote", "global"],
  ["Couch-to-5k group, absolute beginners only", "If you can't run 400 meters, you're exactly who this is for. Tuesdays and Saturdays, slower than you think, nobody left behind.", "fitness", "active", "local", "neighborhood"],
  ["Rooftop beehive on the co-op building", "The co-op board said yes (I'm still surprised). Two hives, shared honey, and a pollinator garden on the roof. Need someone who's kept bees before and a few unafraid helpers.", "community", "idea", "both", "city"],
  ["Free bike repair Saturdays", "I fix bikes in front of my garage, first Saturday every month. Bring your bike, learn to do it yourself. Another pair of greasy hands would double what we can handle.", "community", "active", "local", "neighborhood"],
  ["Little free pantry on Elm corner", "Like a little free library but for cans and pasta. I'll build the box — I need a spot host with a visible fence and 3-4 people to check on it weekly.", "community", "completed", "local", "neighborhood"],
  ["Translate our city's recycling rules into 6 languages", "The rules are only in one language and half the street guesses wrong. I've got the official text; I need native speakers — anywhere in the world — for Arabic, Vietnamese, Polish, Turkish, Spanish and Ukrainian.", "community", "active", "remote", "global"],
  ["After-school homework club", "Two retired teachers already in. We take any kid, any subject, Monday to Wednesday at the community hall. Could use two more adults and someone who bakes.", "learning", "active", "local", "neighborhood"],
  ["Map every accessible entrance in the city center", "Wheelchair users shouldn't need luck to find a way in. We survey shops street by street and publish a free map. Walkers and wheelers welcome; a data person would be gold.", "community", "active", "both", "city"],
  ["Restore the old cinema marquee", "The letters still exist — they're in the basement! The owner will let us rehang them if we restore them properly. Electricians and stubborn romantics needed.", "community", "idea", "both", "city"],
  ["Podcast about ordinary neighbors doing great things", "Every episode: one neighbor, one story, thirty minutes. I have mics and enthusiasm; I need an editor (remote is fine) and introverts willing to be interviewed.", "venture", "idea", "remote", "global"],
  ["Dog-walking pool for shift workers", "Nurses and drivers can't walk dogs at 2pm. We match dogs with neighbors who'd love a walk buddy without owning one. I need five reliable walkers to start.", "community", "active", "local", "neighborhood"],
  ["Repair café — bring your broken things", "Toasters, trousers, tablets: we fix instead of toss, last Sunday monthly. Have menders for textiles and wood; need an electronics person and a greeter.", "community", "active", "local", "neighborhood"],
  ["Community compost behind the allotments", "Three bays, proper signage, no rats (promise). The allotment association is in. Need builders for a weekend and households willing to fill it right.", "community", "idea", "local", "neighborhood"],
  ["Oral history of our street, before it's gone", "Mrs. Halvorsen is 94 and remembers the street when it had a dairy. I'm recording the elders' stories before they disappear. Need an interviewer and someone to digitize old photos.", "learning", "active", "both", "neighborhood"],
  ["Beginner-friendly community choir", "No auditions, no sheet-music snobbery. Wednesday nights at St. Anne's. We have a conductor; we need singers who think they can't sing and someone to run the socials.", "community", "active", "local", "city"],
  ["Solar panels for the sports club roof", "The quote is doable if we self-organize the paperwork and half the labor. An electrician, a grant-application veteran, and a few Saturday bodies gets it done.", "venture", "idea", "both", "city"],
  ["Midnight football under the bridge", "The five-a-side court is lit and empty every night. Friday midnight kickabout, all levels, zero attitude. Need one more organizer so it survives holidays.", "fitness", "active", "local", "neighborhood"],
  ["Sew school-play costumes together", "The school play needs 30 costumes and has budget for 5. If eight people who can thread a machine give two evenings, every kid gets a costume that fits.", "home", "completed", "local", "neighborhood"],
  ["Neighborhood emergency contact tree", "When the water main burst nobody knew who to check on. A simple phone tree, block by block, tested twice a year. Need one volunteer per block — that's it.", "community", "active", "local", "neighborhood"],
  ["Open data dashboard for city air quality", "The sensors exist, the data's public, nobody can read it. I'm building a plain-language dashboard. Need a frontend dev and a data-viz person — remote welcome.", "venture", "active", "remote", "global"],
  ["Saturday morning park cleanup crew", "One hour, gloves provided, coffee after. The park is ours and it looks like nobody's. Twelve people would make it spotless monthly.", "community", "completed", "local", "neighborhood"],
  ["Window-box challenge for the greyest street", "Acacia Street is a concrete canyon. Fifty window boxes would change it completely. I've negotiated bulk soil and seedlings; need neighbors to claim a window each.", "home", "idea", "local", "neighborhood"],
  ["Learn-to-swim scholarships at the city pool", "Every year kids in this city drown who never had lessons. The pool offered discounted slots if we organize sign-ups and sponsors. Need organizers and a treasurer type.", "community", "idea", "both", "city"],
];

const CONTRIB_TEXT = {
  knowledge: [
    "Found out exactly which permit we need and who signs it — saved us weeks of guessing.",
    "Wrote up how the neighboring district did this successfully, with contacts who'll advise us.",
    "Got the safety requirements in writing from the city so we can't be shut down later.",
    "Mapped out the three suppliers who'll give community projects a discount.",
  ],
  resource: [
    "Brought my trailer and moved all the materials in one go.",
    "Donated the leftover paint and brushes from our renovation — enough for the whole job.",
    "Lent my generator and work lights for the whole weekend.",
    "Got my employer to donate the printing — flyers and signage sorted.",
  ],
  skill: [
    "Did the wiring properly and safely — certified and signed off.",
    "Designed the poster and the sign-up sheet; print-ready files in the shared folder.",
    "Built the frame square and solid — it'll outlive all of us.",
    "Set up the shared calendar and rota so nobody has to chase anybody.",
  ],
  time: [
    "Put in the full Saturday — six hours of unglamorous but necessary graft.",
    "Covered three weekday slots when nobody else could.",
    "Did the door-to-door round on both streets — 40 households talked to.",
    "Sorted and labelled everything so the next session starts instantly.",
  ],
  presence: [
    "Showed up to every session this month and kept the mood up.",
    "Was there at 7am to receive the delivery so nobody else had to.",
    "Came to the open evening and brought four new neighbors along.",
    "Held the fort at the stall all afternoon.",
  ],
};

const EVENT_TITLES = [
  "Work morning — many hands edition", "Planning huddle over coffee", "Build day — tools provided",
  "Open evening for curious neighbors", "The big push: finish it weekend", "First-timers welcome session",
];

// ------------------------------------------------------------------ emit
const L = [];
L.push(`-- Peoplearound — LARGE demo seed (generated by scripts/generate-demo-seed.mjs — do not edit by hand)
-- 100 fake users across 3 neighborhoods (2 cities), 30 projects with stars,
-- teams, contributions (all trust stages), attestations, and events.
-- All demo accounts: password \`neighbors123\`, emails u1@example.com … u100@example.com.
-- Idempotent: safe to re-run. Cleanup block at the bottom removes everything.
`);

// Neighborhoods + cities.
L.push(`-- Neighborhoods: reuse the oldest row as the pilot, add two more, group into cities.
insert into public.neighborhoods (name, city) values
  ('Riverside', 'Springfield'), ('Old Town', 'Shelbyville')
on conflict (name) do nothing;
update public.neighborhoods set city = coalesce(city, 'Springfield')
 where id = (select id from public.neighborhoods order by created_at limit 1);
`);

// Users.
const idsArr = users.map((u) => `'${u.id}'`).join(",\n    ");
const emailsArr = users.map((u) => `'${u.email}'`).join(",\n    ");
const namesArr = users.map((u) => `'${q(u.name)}'`).join(",\n    ");
const hoodsArr = users.map((u) => u.hood).join(",");
L.push(`do $$
declare
  ids uuid[] := array[
    ${idsArr}
  ]::uuid[];
  emails text[] := array[
    ${emailsArr}
  ];
  names text[] := array[
    ${namesArr}
  ];
  hood_pick int[] := array[${hoodsArr}];
  hoods uuid[];
  i int;
begin
  select array[
    (select id from public.neighborhoods order by created_at limit 1),
    (select id from public.neighborhoods where name = 'Riverside'),
    (select id from public.neighborhoods where name = 'Old Town')
  ] into hoods;

  for i in 1..array_length(ids, 1) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      -- GoTrue scans these into Go strings and cannot read a NULL: leaving
      -- them unset takes down *every* login with "Database error querying
      -- schema", not just the seeded accounts. Empty string, always.
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone_change,
      phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000', ids[i], 'authenticated', 'authenticated',
      emails[i], extensions.crypt('neighbors123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', names[i]),
      now() - interval '60 days', now(),
      '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), ids[i],
      jsonb_build_object('sub', ids[i]::text, 'email', emails[i], 'email_verified', true),
      'email', ids[i]::text, now(), now(), now()
    ) on conflict do nothing;

    update public.profiles
       set display_name = names[i], neighborhood_id = hoods[hood_pick[i] + 1]
     where id = ids[i];
  end loop;
end
$$;
`);

// Projects — owner is user (p*3 % 100)+1 so owners spread across all hoods.
const projRows = [];
const projMeta = []; // for later stages
PROJECTS.forEach(([title, desc, cat, state, help, reach], idx) => {
  const p = idx + 1;
  // p*7 cycles mod 3, so owners rotate across all three neighborhoods.
  const ownerIdx = ((p * 7) % 100) + 1;
  const owner = users[ownerIdx - 1];
  const daysAgo = 30 - Math.floor(idx * 0.9); // spread over the last month
  const done = state === "completed";
  // Cover photos for the projects that have generated imagery (p22–p30).
  const PHOTOS = {
    22: "/photos/choir.jpg",
    23: "/photos/solar-roof.jpg",
    24: "/photos/midnight-football.jpg",
    25: "/photos/costumes.jpg",
    26: "/photos/contact-tree.jpg",
    27: "/photos/air-quality.jpg",
    28: "/photos/park-cleanup.jpg",
    29: "/photos/window-boxes.jpg",
    30: "/photos/swim-lessons.jpg",
  };
  const photo = PHOTOS[p] ? `'${PHOTOS[p]}'` : "null";
  // ~80% of hands-on projects get a map pin near their neighborhood center;
  // remote-help projects less often (the work isn't at a place).
  const pinned = rand() < (help === "remote" ? 0.35 : 0.8);
  const [bLat, bLng] = HOOD_BASE[owner.hood];
  const lat = pinned ? (bLat + (rand() - 0.5) * 0.016).toFixed(6) : "null";
  const lng = pinned ? (bLng + (rand() - 0.5) * 0.022).toFixed(6) : "null";
  projRows.push(
    `  ('${pid(p)}', '${owner.id}', '${q(title)}', '${q(desc)}', '${cat}', '${state}', '${help}', '${reach}', ${lat}, ${lng}, ${photo}, now() - interval '${daysAgo} days ${int(0, 20)} hours', now() - interval '${done ? int(1, 4) : daysAgo - 1} days')`,
  );
  projMeta.push({ p, owner, ownerIdx, reach, state, daysAgo, hood: owner.hood });
});
L.push(`insert into public.projects (id, owner_id, title, description, category, state, help, reach, lat, lng, photo_url, created_at, updated_at) values
${projRows.join(",\n")}
on conflict (id) do nothing;

-- neighborhood_id is stamped automatically by the before-insert trigger
-- from each owner's profile (set in the user loop above).
`);

// Eligibility: who may star/join a project, by reach.
const cityOf = (hood) => (hood === 2 ? "Shelbyville" : "Springfield");
const eligible = (meta) =>
  users.filter((u) => {
    if (u.id === meta.owner.id) return false;
    if (meta.reach === "global") return true;
    if (meta.reach === "city") return cityOf(u.hood) === cityOf(meta.hood);
    return u.hood === meta.hood;
  });

// Stars.
const starRows = [];
for (const m of projMeta) {
  const pool = eligible(m);
  const n = Math.min(pool.length, int(2, m.reach === "global" ? 24 : 14));
  const start = int(0, Math.max(0, pool.length - n));
  for (let k = 0; k < n; k++) {
    const u = pool[start + k];
    const d = Math.max(0, m.daysAgo - int(0, Math.min(m.daysAgo, 12)));
    starRows.push(
      `  ('${pid(m.p)}', '${u.id}', now() - interval '${d} days ${int(0, 23)} hours')`,
    );
  }
  m.stargazers = pool.slice(start, start + n);
}
L.push(`insert into public.stars (project_id, user_id, created_at) values
${starRows.join(",\n")}
on conflict do nothing;
`);

// Memberships.
const memberRows = [];
for (const m of projMeta) {
  const pool = eligible(m).filter((u) => !m.stargazers.slice(0, 2).includes(u));
  const nAcc = Math.min(pool.length, int(1, 4));
  const nPend = Math.min(Math.max(pool.length - nAcc, 0), m.state === "completed" ? 0 : int(0, 2));
  m.team = pool.slice(0, nAcc);
  const pending = pool.slice(nAcc, nAcc + nPend);
  for (const u of m.team) {
    memberRows.push(
      `  ('${pid(m.p)}', '${u.id}', 'accepted', now() - interval '${Math.max(0, m.daysAgo - int(1, 6))} days')`,
    );
  }
  for (const u of pending) {
    memberRows.push(
      `  ('${pid(m.p)}', '${u.id}', 'pending', now() - interval '${int(0, 3)} days ${int(1, 20)} hours')`,
    );
  }
}
L.push(`insert into public.memberships (project_id, user_id, status, created_at) values
${memberRows.join(",\n")}
on conflict do nothing;
`);

// Contributions + attestations.
const TYPES = ["knowledge", "resource", "skill", "time", "presence"];
const contribRows = [];
const attestRows = [];
let cn = 0;
for (const m of projMeta) {
  if (m.team.length === 0 || m.state === "idea") continue;
  const n = m.state === "completed" ? int(2, 3) : int(0, 3);
  for (let k = 0; k < n; k++) {
    cn += 1;
    const contributor = m.team[k % m.team.length];
    const type = TYPES[(cn + k) % TYPES.length];
    const text = pick(CONTRIB_TEXT[type]);
    const witnesses = [...m.team, ...m.stargazers].filter(
      (u) => u.id !== contributor.id && u.id !== m.owner.id,
    );
    const roll = rand();
    const created = Math.max(1, m.daysAgo - int(3, 10));
    // 60% confirmed (needs a witness), 20% accepted, 20% logged
    if (roll < 0.6 && witnesses.length > 0) {
      const witness = pick(witnesses);
      contribRows.push(
        `  ('${cid(cn)}', '${pid(m.p)}', '${contributor.id}', '${type}', '${q(text)}', 'confirmed', now() - interval '${created} days', now() - interval '${Math.max(0, created - 1)} days', now() - interval '${Math.max(0, created - 2)} days')`,
      );
      attestRows.push(
        `  ('${cid(cn)}', '${witness.id}', now() - interval '${Math.max(0, created - 2)} days')`,
      );
    } else if (roll < 0.8) {
      contribRows.push(
        `  ('${cid(cn)}', '${pid(m.p)}', '${contributor.id}', '${type}', '${q(text)}', 'accepted', now() - interval '${created} days', now() - interval '${Math.max(0, created - 1)} days', null)`,
      );
    } else {
      contribRows.push(
        `  ('${cid(cn)}', '${pid(m.p)}', '${contributor.id}', '${type}', '${q(text)}', 'logged', now() - interval '${int(0, 2)} days ${int(1, 20)} hours', null, null)`,
      );
    }
  }
}
L.push(`insert into public.contributions (id, project_id, contributor_id, type, description, status, created_at, accepted_at, confirmed_at) values
${contribRows.join(",\n")}
on conflict (id) do nothing;

insert into public.attestations (contribution_id, attester_id, created_at) values
${attestRows.join(",\n")}
on conflict do nothing;
`);

// Events (about half the active projects; past + upcoming) + rsvps.
const eventRows = [];
const rsvpRows = [];
let en = 0;
for (const m of projMeta) {
  if (m.state !== "active" || rand() < 0.4) continue;
  en += 1;
  const title = pick(EVENT_TITLES);
  const upcoming = rand() < 0.5;
  const when = upcoming
    ? `now() + interval '${int(1, 9)} days ${int(8, 18)} hours'`
    : `now() - interval '${Math.max(1, m.daysAgo - int(4, 12))} days'`;
  eventRows.push(
    `  ('${eid(en)}', '${pid(m.p)}', '${q(title)}', ${when}, 'Meet at the usual spot', now() - interval '${Math.max(1, m.daysAgo - int(2, 5))} days')`,
  );
  const joiners = [...m.team, ...m.stargazers.slice(0, 4)];
  for (const u of joiners) {
    rsvpRows.push(`  ('${eid(en)}', '${u.id}', now() - interval '${int(0, 4)} days')`);
  }
}
L.push(`insert into public.events (id, project_id, title, starts_at, place, created_at) values
${eventRows.join(",\n")}
on conflict (id) do nothing;

insert into public.rsvps (event_id, user_id, created_at) values
${rsvpRows.join(",\n")}
on conflict do nothing;
`);

L.push(`-- ------------------------------------------------------------------
-- CLEANUP — uncomment and run to remove all large-seed data.
-- Deleting the demo auth users cascades through profiles → projects →
-- stars, memberships, contributions, attestations, events, rsvps.
-- ------------------------------------------------------------------
-- delete from auth.users where id::text like 'e0000000-0000-4000-8000-%';
-- delete from public.neighborhoods n
--   where n.name in ('Riverside', 'Old Town')
--     and not exists (select 1 from public.profiles p where p.neighborhood_id = n.id)
--     and not exists (select 1 from public.projects pr where pr.neighborhood_id = n.id);
`);

writeFileSync(OUT, L.join("\n"));
console.log(`✅ wrote ${OUT}`);
console.log(`   users: ${users.length}, projects: ${PROJECTS.length}, stars: ${starRows.length}, memberships: ${memberRows.length}, contributions: ${contribRows.length}, attestations: ${attestRows.length}, events: ${eventRows.length}, rsvps: ${rsvpRows.length}`);
