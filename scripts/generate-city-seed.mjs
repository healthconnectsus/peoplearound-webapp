#!/usr/bin/env node
/**
 * generate-city-seed.mjs — deterministically generates scripts/city-seed.sql:
 * demonstration neighborhoods in twelve major US cities, so that the first
 * real person to open the app in Chicago or Austin finds a place with people
 * in it rather than an empty room.
 *
 * Per city: two real neighborhoods (real names, real centre coordinates, so a
 * visitor's "where am I?" lands in one), eight example residents each, six
 * projects (ideas, things being built, one finished), events past and
 * upcoming with jobs to take, stars, teams, and confirmed help — all
 * respecting the product's trust rules (no self-crediting, attester ≠
 * contributor ≠ founder, star/join eligibility follows reach).
 *
 * What keeps this honest, because invented statistics are not a cosmetic
 * problem (migration 0058):
 *   - every neighborhood is `is_demo = true`, so none of it reaches the
 *     public city pages, the sitemap or the login tally;
 *   - every account is @example.com, which the admin analytics classify as
 *     demo rather than real;
 *   - each neighborhood's description says so in plain words;
 *   - eight residents, not thirty: the first ten neighbors of a place are
 *     its founding neighbors for good, and two of those spots stay open for
 *     the real people who arrive.
 *
 * Run:  node scripts/generate-city-seed.mjs
 * Apply: node scripts/db-apply.mjs scripts/city-seed.sql   (idempotent)
 * Deterministic (seeded PRNG): re-running produces the identical file.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "city-seed.sql");

// Seeded PRNG (mulberry32) — believable variety, identical on every run.
let s = 20261007;
const rand = () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const q = (t) => t.replace(/'/g, "''");
const pad = (n) => String(n).padStart(12, "0");
const uid = (n) => `e1000000-0000-4000-8000-${pad(n)}`;
const pid = (n) => `ea100000-0000-4000-8000-${pad(n)}`;
const cid = (n) => `ec100000-0000-4000-8000-${pad(n)}`;
const eid = (n) => `ee100000-0000-4000-8000-${pad(n)}`;
const rid = (n) => `ef100000-0000-4000-8000-${pad(n)}`;
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ------------------------------------------------------------------ cities
// Real neighborhoods, real centres. Names are unique across the whole table
// (neighborhoods.name is unique), which is why Seattle gets Ballard rather
// than its own Capitol Hill, and Chicago Pilsen rather than its Hyde Park.
const CITIES = [
  { city: "Denver", hoods: [["Capitol Hill", 39.7334, -104.9797], ["Highland", 39.7589, -105.0100]],
    parks: ["Cheesman Park", "Highland Park"], streets: ["Colfax Avenue", "32nd Avenue"], spots: ["the Tattered Cover steps", "the Highland Bridge"] },
  { city: "Austin", hoods: [["East Austin", 30.2648, -97.7210], ["Hyde Park", 30.3077, -97.7297]],
    parks: ["Boggy Creek Greenbelt", "Shipe Park"], streets: ["East 6th Street", "Duval Street"], spots: ["the Shipe Park pool", "the Rosewood rec center"] },
  { city: "Dallas", hoods: [["Bishop Arts District", 32.7489, -96.8290], ["Lakewood", 32.8138, -96.7390]],
    parks: ["Kidd Springs Park", "White Rock Lake"], streets: ["Davis Street", "Abrams Road"], spots: ["the Bishop Arts fountain", "the Lakewood library"] },
  { city: "Houston", hoods: [["The Heights", 29.7905, -95.3984], ["Montrose", 29.7427, -95.3909]],
    parks: ["Donovan Park", "Menil Park"], streets: ["19th Street", "Westheimer Road"], spots: ["the Heights bike trail", "the Menil lawn"] },
  { city: "Phoenix", hoods: [["Roosevelt Row", 33.4568, -112.0730], ["Arcadia", 33.5065, -111.9700]],
    parks: ["Hance Park", "Arcadia Park"], streets: ["Roosevelt Street", "Indian School Road"], spots: ["the Hance Park amphitheater", "the Arcadia canal path"] },
  { city: "Los Angeles", hoods: [["Silver Lake", 34.0869, -118.2702], ["Highland Park", 34.1115, -118.1927]],
    parks: ["Silver Lake Meadow", "Sycamore Grove Park"], streets: ["Sunset Boulevard", "York Boulevard"], spots: ["the reservoir path", "the Highland Park library"] },
  { city: "San Diego", hoods: [["North Park", 32.7452, -117.1296], ["Ocean Beach", 32.7496, -117.2500]],
    parks: ["Bird Park", "Robb Field"], streets: ["30th Street", "Newport Avenue"], spots: ["the North Park sign", "Dog Beach"] },
  { city: "San Francisco", hoods: [["Mission District", 37.7599, -122.4148], ["Inner Sunset", 37.7601, -122.4689]],
    parks: ["Dolores Park", "Golden Gate Park"], streets: ["Valencia Street", "Irving Street"], spots: ["the Dolores Park hill", "the 9th Avenue steps"] },
  { city: "Seattle", hoods: [["Ballard", 47.6685, -122.3850], ["Fremont", 47.6510, -122.3505]],
    parks: ["Ballard Commons", "Gas Works Park"], streets: ["Market Street", "Fremont Avenue"], spots: ["the Ballard Locks", "the Fremont Troll"] },
  { city: "Chicago", hoods: [["Logan Square", 41.9231, -87.7093], ["Pilsen", 41.8570, -87.6560]],
    parks: ["Palmer Square", "Harrison Park"], streets: ["Milwaukee Avenue", "18th Street"], spots: ["the Logan Square monument", "the Harrison Park fieldhouse"] },
  { city: "New York", hoods: [["Astoria", 40.7644, -73.9235], ["Park Slope", 40.6710, -73.9814]],
    parks: ["Astoria Park", "Prospect Park"], streets: ["Steinway Street", "5th Avenue"], spots: ["the Astoria Park track", "the Grand Army Plaza market"] },
  { city: "Atlanta", hoods: [["Inman Park", 33.7574, -84.3524], ["East Atlanta Village", 33.7406, -84.3450]],
    parks: ["Freedom Park", "Brownwood Park"], streets: ["Edgewood Avenue", "Flat Shoals Avenue"], spots: ["the Beltline at Krog", "the East Atlanta farmers market"] },
];
const PER_HOOD = 8;

// ------------------------------------------------------------------ people
const FIRST = [
  "Nora","Devon","Priya","Marcus","Ines","Kofi","Lena","Omar","Sofia","Jonas",
  "Aisha","Pete","Yuki","Carlos","Maja","Tariq","Grace","Viktor","Rosa","Sean",
  "Amina","Leo","Hana","Diego","Freya","Ravi","Clara","Musa","Ella","Bram",
  "Zoe","Ivan","Layla","Owen","Nadia","Felix","Iris","Jamal","Ruth","Anders",
  "Bianca","Chen","Dara","Emil","Farah","Gustav","Hilda","Idris","Julia","Karim",
  "Mateo","Noor","Oscar","Paloma","Quinn","Rafael","Selin","Tomas","Uma","Wes",
  "Ximena","Yara","Zane","Adaeze","Bao","Celeste","Dmitri","Esme","Finn","Gloria",
];
const LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW";

// ---------------------------------------------------------------- projects
// [title, description, category, help, reach]. Placeholders are filled from
// the city's own places so Pilsen's cleanup is not in Dolores Park.
const TEMPLATES = [
  ["Saturday cleanup at {park}", "One hour, gloves and bags provided, coffee after at {spot}. The park is ours and it looks like nobody's. Twelve people would make it spotless monthly.", "outdoors", "local", "neighborhood"],
  ["Repaint the faded crosswalks on {street}", "Both crossings by the school have almost disappeared. The city says 'next year'. One weekend, proper road paint, done. Need steady hands and someone with a pressure washer.", "community", "local", "neighborhood"],
  ["Community fridge near {spot}", "The café agreed to host a community fridge on their wall — surplus food in, anyone takes what they need. Need help building the shelter box and a small rota to keep it clean.", "giving", "local", "neighborhood"],
  ["Weekly board game night", "The library lets us use the back room every Thursday. Four boxes of games, more welcome. Come play — and I could use a co-host so it survives my flu.", "games", "local", "neighborhood"],
  ["Fix the wobbly benches in {park}", "Five benches, all loose, one actually dangerous. Wood, screws, one afternoon. The parks office says if we fix them to spec they'll sign it off.", "home", "local", "neighborhood"],
  ["Seed and cutting swap on {street}", "Everyone's windowsill basil dies alone. Twice a month we swap seeds, cuttings and advice outside the hardware store. Need a second table and someone who labels legibly.", "outdoors", "local", "neighborhood"],
  ["Teach seniors to video-call their grandkids", "One hour, one senior, one phone. The community center gives us the room. Patient people wanted; tech skills optional, kindness mandatory.", "learning", "local", "neighborhood"],
  ["Couch-to-5k around {park}, beginners only", "If you can't run 400 meters, you're exactly who this is for. Tuesdays and Saturdays, slower than you think, nobody left behind.", "fitness", "local", "neighborhood"],
  ["Free bike repair Saturdays at {spot}", "I fix bikes in front of my garage, first Saturday every month. Bring your bike, learn to do it yourself. Another pair of greasy hands would double what we handle.", "community", "local", "neighborhood"],
  ["Little free pantry on {street}", "Like a little free library but for cans and pasta. I'll build the box — I need a host with a visible fence and three or four people to check it weekly.", "giving", "local", "neighborhood"],
  ["Translate the city's recycling rules into six languages", "The rules are only in English and half the block guesses wrong. I have the official text; I need native speakers — anywhere — for Spanish, Vietnamese, Arabic, Polish, Tagalog and Amharic.", "community", "remote", "global"],
  ["After-school homework club", "Two retired teachers already in. We take any kid, any subject, Monday to Wednesday at the rec center. Could use two more adults and someone who bakes.", "learning", "local", "neighborhood"],
  ["Map every accessible entrance along {street}", "Wheelchair users shouldn't need luck to find a way in. We survey shops door by door and publish a free map. Walkers and wheelers welcome; a data person would be gold.", "community", "both", "city"],
  ["Mural for the underpass by {spot}", "It's grey, it's grim, and every kid walks through it daily. Provisional blessing from the alderman and two art students — we need painters of any level and someone to charm a paint shop.", "arts", "both", "city"],
  ["Podcast about ordinary neighbors doing great things", "Every episode: one neighbor, one story, thirty minutes. I have mics and enthusiasm; I need an editor (remote is fine) and introverts willing to be interviewed.", "arts", "remote", "global"],
  ["Dog-walking pool for shift workers", "Nurses and drivers can't walk dogs at 2pm. We match dogs with neighbors who'd love a walk buddy without owning one. Five reliable walkers to start.", "social", "local", "neighborhood"],
  ["Repair café at {spot} — bring your broken things", "Toasters, trousers, tablets: we fix instead of toss, last Sunday monthly. Have menders for textiles and wood; need an electronics person and a greeter.", "giving", "local", "neighborhood"],
  ["Community compost behind {park}", "Three bays, proper signage, no rats (promise). The garden association is in. Need builders for a weekend and households willing to fill it right.", "outdoors", "local", "neighborhood"],
  ["Oral history of {street}, before it's gone", "Mrs. Okafor is 91 and remembers the street when it had a dairy. Recording the elders' stories before they disappear. Need an interviewer and someone to digitize old photos.", "learning", "both", "neighborhood"],
  ["Beginner-friendly community choir", "No auditions, no sheet-music snobbery. Wednesday nights at the church hall. We have a conductor; we need singers who think they can't sing and someone to run the socials.", "arts", "local", "city"],
  ["Solar panels for the rec center roof", "The quote is doable if we self-organize the paperwork and half the labor. An electrician, a grant veteran and a few Saturday bodies gets it done.", "venture", "both", "city"],
  ["Friday night pickup basketball at {park}", "The court is lit and empty every night. Friday evening run, all levels, zero attitude. Need one more organizer so it survives holidays.", "fitness", "local", "neighborhood"],
  ["Sew the school-play costumes together", "The school play needs 30 costumes and has budget for 5. If eight people who can thread a machine give two evenings, every kid gets a costume that fits.", "home", "local", "neighborhood"],
  ["Block emergency contact tree", "When the water main burst nobody knew who to check on. A simple phone tree, block by block, tested twice a year. One volunteer per block — that's it.", "community", "local", "neighborhood"],
  ["Plain-language dashboard for the city's air sensors", "The sensors exist, the data's public, nobody can read it. Building a dashboard anyone understands. Need a frontend dev and a data-viz person — remote welcome.", "venture", "remote", "global"],
  ["Window-box challenge for {street}", "A concrete canyon. Fifty window boxes would change it completely. Bulk soil and seedlings negotiated; need neighbors to claim a window each.", "outdoors", "local", "neighborhood"],
  ["Learn-to-swim scholarships at the city pool", "Every summer kids drown who never had lessons. The pool offered discounted slots if we organize sign-ups and sponsors. Need organizers and a treasurer type.", "giving", "both", "city"],
  ["Potluck under the trees at {park}", "Once a month, one dish each, long tables, no speeches. Need two people to haul tables and someone to keep the sign-up sheet honest.", "food", "local", "neighborhood"],
  ["Tool library in the garage on {street}", "Forty drills on one block and each gets used twice a year. Lending shelf, paper notebook, Saturday hours. Need a second key-holder and a label maker.", "giving", "local", "neighborhood"],
  ["Sunday morning tai chi at {spot}", "Slow, outdoors, free. A retired instructor leads; we need a backup leader and someone to bring the speaker.", "fitness", "local", "neighborhood"],
  ["Pop-up open mic at the corner café", "Poems, songs, that joke you keep telling. Third Thursday. The café's in; we need a host and a sound person.", "arts", "local", "neighborhood"],
  ["Chess in {park} on Saturdays", "Boards on the picnic tables, all ages, all levels. Need a few sets and someone patient with eight-year-olds.", "games", "local", "neighborhood"],
  ["Neighborhood bulk buy of good coffee", "Fifteen households, one roaster, one delivery. Cheaper and better. Need a spreadsheet person and a porch for drop-offs.", "food", "local", "neighborhood"],
  ["Welcome kits for new neighbors on {street}", "A map, a list of the good shops, two cookies. Hand-delivered by someone who lives here. Need writers, bakers and a walker.", "social", "local", "neighborhood"],
  ["Bird walks in {park}, dawn, slow", "An hour, binoculars shared, coffee after. A birder leads; we need a second pair of eyes and a flask.", "outdoors", "local", "neighborhood"],
  ["Start-up clinic for neighbors with a side business", "Two accountants and a lawyer on the block, one evening a month, free questions. Need a room and someone to keep the list.", "venture", "local", "city"],
];

const CONTRIB_TEXT = {
  knowledge: [
    "Found out exactly which permit we need and who signs it — saved us weeks of guessing.",
    "Wrote up how the next neighborhood did this, with contacts who'll advise us.",
    "Got the safety requirements in writing from the city so we can't be shut down later.",
    "Mapped the three suppliers who give community projects a discount.",
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
  "Open evening for curious neighbors", "The big push weekend", "First-timers welcome session",
];
const JOBS = [
  ["Setup crew", "Arrive 30 minutes early, carry tables out", 2],
  ["Bring a cooler of water", "For twenty people on a warm morning", 1],
  ["Greeter", "Say hello, point people at the sign-in sheet", 1],
  ["Cleanup", "Stay 20 minutes after, bags provided", 2],
  ["Photos", "Take a few for the project page — no faces of kids", 1],
  ["Snacks", "Something that survives an hour outdoors", 2],
];

// ------------------------------------------------------------------ build
const hoods = []; // { name, city, lat, lng, idx }
const users = []; // { id, email, name, hood (idx), n }
const seenNames = new Set();
let un = 0;
CITIES.forEach((c, ci) => {
  c.hoods.forEach(([name, lat, lng]) => {
    const h = { name, city: c.city, lat, lng, idx: hoods.length, ci };
    hoods.push(h);
    for (let k = 1; k <= PER_HOOD; k++) {
      un += 1;
      let full;
      do {
        full = `${pick(FIRST)} ${LAST_INITIALS[int(0, LAST_INITIALS.length - 1)]}.`;
      } while (seenNames.has(full));
      seenNames.add(full);
      users.push({ id: uid(un), n: un, email: `${slug(c.city)}-${slug(name)}-${k}@example.com`, name: full, hood: h.idx });
    }
  });
});

const fill = (text, c) => text
  .replace("{park}", pick(c.parks)).replace("{street}", pick(c.streets)).replace("{spot}", pick(c.spots));

const projects = []; // { p, owner, hood, ci, title, desc, cat, state, help, reach, daysAgo }
let pn = 0;
CITIES.forEach((c, ci) => {
  // Six per city, three per neighborhood, templates rotating so cities differ.
  for (let k = 0; k < 6; k++) {
    const t = TEMPLATES[(ci * 5 + k * 2) % TEMPLATES.length];
    const hood = hoods[ci * 2 + (k % 2)];
    const residents = users.filter((u) => u.hood === hood.idx);
    const owner = residents[(k * 3) % residents.length];
    pn += 1;
    const state = ["active", "idea", "active", "completed", "idea", "active"][k];
    projects.push({
      p: pn, owner, hood, ci, title: fill(t[0], c), desc: fill(t[1], c), cat: t[2],
      state, help: t[3], reach: t[4], daysAgo: int(3, 45),
    });
  }
});

const cityOf = (hoodIdx) => hoods[hoodIdx].city;
const eligible = (m) => users.filter((u) => {
  if (u.id === m.owner.id) return false;
  if (m.reach === "global") return true;
  if (m.reach === "city") return cityOf(u.hood) === m.hood.city;
  return u.hood === m.hood.idx;
});

// ------------------------------------------------------------------ emit
const L = [];
L.push(`-- Peoplearound — CITY demo seed (generated by scripts/generate-city-seed.mjs — do not edit by hand)
-- ${CITIES.length} cities, ${hoods.length} demonstration neighborhoods, ${users.length} example residents,
-- ${projects.length} projects with stars, teams, confirmed help, events and jobs.
-- Every neighborhood is is_demo = true (kept off the public pages, 0058);
-- every account is @example.com (classified "demo" by the admin analytics).
-- Password for all: \`neighbors123\`.
-- Idempotent: safe to re-run. Cleanup block at the bottom removes everything.
`);

L.push(`insert into public.neighborhoods (name, city, kind, center_lat, center_lng, is_demo, description) values
${hoods.map((h) => `  ('${q(h.name)}', '${q(h.city)}', 'neighborhood', ${h.lat}, ${h.lng}, true, 'A demonstration neighborhood: the people and projects here are examples of what neighbors start, not real residents. Invite yours and make it real.')`).join(",\n")}
on conflict (name) do nothing;
`);

L.push(`do $$
declare
  ids uuid[] := array[
    ${users.map((u) => `'${u.id}'`).join(",\n    ")}
  ]::uuid[];
  emails text[] := array[
    ${users.map((u) => `'${u.email}'`).join(",\n    ")}
  ];
  names text[] := array[
    ${users.map((u) => `'${q(u.name)}'`).join(",\n    ")}
  ];
  hood_names text[] := array[
    ${users.map((u) => `'${q(hoods[u.hood].name)}'`).join(",\n    ")}
  ];
  hood uuid;
  i int;
begin
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
      now() - (interval '1 day' * (30 + (i * 7) % 90)), now(),
      '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), ids[i],
      jsonb_build_object('sub', ids[i]::text, 'email', emails[i], 'email_verified', true),
      'email', ids[i]::text, now(), now(), now()
    ) on conflict do nothing;

    select n.id into hood from public.neighborhoods n where n.name = hood_names[i];

    update public.profiles
       set display_name = names[i],
           neighborhood_id = hood,
           -- The hundred drawn portraits (supabase/demo-avatars.sql), reused.
           avatar_url = '/avatars/demo/u' || (1 + (i - 1) % 100) || '.svg'
     where id = ids[i];

    insert into public.community_members (community_id, user_id, created_at)
    values (hood, ids[i], now() - (interval '1 day' * (30 + (i * 7) % 90)))
    on conflict do nothing;
  end loop;
end
$$;

-- Example residents do not get the welcome email: there is nobody at
-- example.com to read it, and bounces hurt the sender's reputation.
delete from public.welcome_mail_jobs
 where sent_at is null
   and user_id::text like 'e1000000-0000-4000-8000-%';
`);

// Projects. neighborhood_id is stamped by the before-insert trigger from the owner's profile.
const PHOTOS = ["/photos/park-cleanup.jpg", "/photos/choir.jpg", "/photos/window-boxes.jpg", "/photos/midnight-football.jpg", "/photos/contact-tree.jpg", "/photos/swim-lessons.jpg", "/photos/solar-roof.jpg", "/photos/air-quality.jpg", "/photos/costumes.jpg"];
const projRows = projects.map((m) => {
  const done = m.state === "completed";
  const photo = m.p % 4 === 0 ? `'${PHOTOS[m.p % PHOTOS.length]}'` : "null";
  const pinned = rand() < (m.help === "remote" ? 0.35 : 0.85);
  const lat = pinned ? (m.hood.lat + (rand() - 0.5) * 0.016).toFixed(6) : "null";
  const lng = pinned ? (m.hood.lng + (rand() - 0.5) * 0.022).toFixed(6) : "null";
  return `  ('${pid(m.p)}', '${m.owner.id}', '${q(m.title)}', '${q(m.desc)}', '${m.cat}', '${m.state}', '${m.help}', '${m.reach}', ${lat}, ${lng}, ${photo}, now() - interval '${m.daysAgo} days ${int(0, 20)} hours', now() - interval '${done ? int(1, 4) : Math.max(0, m.daysAgo - 1)} days')`;
});
L.push(`insert into public.projects (id, owner_id, title, description, category, state, help, reach, lat, lng, photo_url, created_at, updated_at) values
${projRows.join(",\n")}
on conflict (id) do nothing;
`);

// Stars.
const starRows = [];
for (const m of projects) {
  const pool = eligible(m);
  const n = Math.min(pool.length, int(2, m.reach === "global" ? 18 : m.reach === "city" ? 9 : 6));
  const start = int(0, Math.max(0, pool.length - n));
  m.stargazers = pool.slice(start, start + n);
  for (const u of m.stargazers) {
    const d = Math.max(0, m.daysAgo - int(0, Math.min(m.daysAgo, 12)));
    starRows.push(`  ('${pid(m.p)}', '${u.id}', now() - interval '${d} days ${int(0, 23)} hours')`);
  }
}
L.push(`insert into public.stars (project_id, user_id, created_at) values
${starRows.join(",\n")}
on conflict do nothing;
`);

// Memberships.
const memberRows = [];
for (const m of projects) {
  const pool = eligible(m).filter((u) => !m.stargazers.slice(0, 2).includes(u));
  const nAcc = Math.min(pool.length, m.state === "idea" ? int(0, 1) : int(1, 3));
  const nPend = Math.min(Math.max(pool.length - nAcc, 0), m.state === "completed" ? 0 : int(0, 1));
  m.team = pool.slice(0, nAcc);
  for (const u of m.team) memberRows.push(`  ('${pid(m.p)}', '${u.id}', 'accepted', now() - interval '${Math.max(0, m.daysAgo - int(1, 6))} days')`);
  for (const u of pool.slice(nAcc, nAcc + nPend)) memberRows.push(`  ('${pid(m.p)}', '${u.id}', 'pending', now() - interval '${int(0, 3)} days ${int(1, 20)} hours')`);
}
L.push(`insert into public.memberships (project_id, user_id, status, created_at) values
${memberRows.join(",\n")}
on conflict do nothing;
`);

// Contributions + attestations.
const TYPES = ["knowledge", "resource", "skill", "time", "presence"];
const contribRows = [], attestRows = [];
let cn = 0;
for (const m of projects) {
  if (m.team.length === 0 || m.state === "idea") continue;
  const n = m.state === "completed" ? int(2, 3) : int(0, 2);
  for (let k = 0; k < n; k++) {
    cn += 1;
    const contributor = m.team[k % m.team.length];
    const type = TYPES[(cn + k) % TYPES.length];
    const text = pick(CONTRIB_TEXT[type]);
    const witnesses = [...m.team, ...m.stargazers].filter((u) => u.id !== contributor.id && u.id !== m.owner.id);
    const roll = rand();
    const created = Math.max(1, m.daysAgo - int(3, 10));
    if (roll < 0.6 && witnesses.length > 0) {
      contribRows.push(`  ('${cid(cn)}', '${pid(m.p)}', '${contributor.id}', '${type}', '${q(text)}', 'confirmed', now() - interval '${created} days', now() - interval '${Math.max(0, created - 1)} days', now() - interval '${Math.max(0, created - 2)} days')`);
      attestRows.push(`  ('${cid(cn)}', '${pick(witnesses).id}', now() - interval '${Math.max(0, created - 2)} days')`);
    } else if (roll < 0.8) {
      contribRows.push(`  ('${cid(cn)}', '${pid(m.p)}', '${contributor.id}', '${type}', '${q(text)}', 'accepted', now() - interval '${created} days', now() - interval '${Math.max(0, created - 1)} days', null)`);
    } else {
      contribRows.push(`  ('${cid(cn)}', '${pid(m.p)}', '${contributor.id}', '${type}', '${q(text)}', 'logged', now() - interval '${int(0, 2)} days ${int(1, 20)} hours', null, null)`);
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

// Events: every active project gets one — two thirds upcoming (with jobs), a third past.
const eventRows = [], rsvpRows = [], roleRows = [], signupRows = [];
let en = 0, rn = 0;
for (const m of projects) {
  if (m.state !== "active") continue;
  en += 1;
  const c = CITIES[m.ci];
  const upcoming = en % 3 !== 0;
  const when = upcoming
    ? `now() + interval '${int(1, 13)} days ${int(9, 18)} hours'`
    : `now() - interval '${Math.max(1, m.daysAgo - int(4, 12))} days'`;
  const place = pick([...c.parks, ...c.spots]);
  eventRows.push(`  ('${eid(en)}', '${pid(m.p)}', '${q(pick(EVENT_TITLES))}', ${when}, '${q(place)}', '${m.owner.id}', '${q(upcoming ? "Come as you are. Everything you need is provided; bring water and a friend." : "")}', now() - interval '${Math.max(1, m.daysAgo - int(2, 5))} days')`);
  const joiners = [...m.team, ...m.stargazers.slice(0, 4)];
  for (const u of joiners) rsvpRows.push(`  ('${eid(en)}', '${u.id}', now() - interval '${int(0, 4)} days')`);
  if (upcoming) {
    const picked = [JOBS[en % JOBS.length], JOBS[(en + 3) % JOBS.length]];
    picked.forEach(([title, detail, needed], pos) => {
      rn += 1;
      roleRows.push(`  ('${rid(rn)}', '${eid(en)}', '${q(title)}', '${q(detail)}', ${needed}, ${pos}, '${m.owner.id}')`);
      // Some jobs are half taken, some untouched — a flyer should have something to ask for.
      const takers = joiners.filter((u) => u.id !== m.owner.id).slice(0, pos === 0 ? Math.min(needed - 1, 1) : 0);
      for (const u of takers) signupRows.push(`  ('${rid(rn)}', '${u.id}', now() - interval '${int(0, 3)} days')`);
    });
  }
}
L.push(`insert into public.events (id, project_id, title, starts_at, place, created_by, description, created_at) values
${eventRows.join(",\n")}
on conflict (id) do nothing;

insert into public.rsvps (event_id, user_id, created_at) values
${rsvpRows.join(",\n")}
on conflict do nothing;

insert into public.event_roles (id, event_id, title, detail, needed, position, created_by) values
${roleRows.join(",\n")}
on conflict (id) do nothing;

${signupRows.length ? `insert into public.event_role_signups (role_id, user_id, created_at) values
${signupRows.join(",\n")}
on conflict do nothing;` : ""}
`);

L.push(`-- ------------------------------------------------------------------
-- CLEANUP — uncomment and run to remove everything this seed created.
-- Deleting the auth users cascades through profiles → projects → stars,
-- memberships, contributions, attestations, events, roles, rsvps.
-- ------------------------------------------------------------------
-- delete from auth.users where id::text like 'e1000000-0000-4000-8000-%';
-- delete from public.neighborhoods n
--   where n.is_demo
--     and n.name in (${hoods.map((h) => `'${q(h.name)}'`).join(", ")})
--     and not exists (select 1 from public.profiles p where p.neighborhood_id = n.id)
--     and not exists (select 1 from public.projects pr where pr.neighborhood_id = n.id);
`);

writeFileSync(OUT, L.join("\n"));
const upcoming = eventRows.filter((r) => r.includes("now() + interval")).length;
console.log(`wrote ${OUT}`);
console.log(`${CITIES.length} cities · ${hoods.length} neighborhoods · ${users.length} residents · ${projects.length} projects · ${eventRows.length} events (${upcoming} upcoming) · ${roleRows.length} jobs · ${starRows.length} stars · ${memberRows.length} memberships · ${contribRows.length} contributions`);
