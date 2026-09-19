# Peoplearound — Search strategy

*Written 2026-09-18. Companion to [MARKETING.md](MARKETING.md), which covers
every other channel; this one covers only what people find by typing something
into a search box. The technical foundations in §4 are already shipped — the
rest is sequenced work.*

**The thesis in one line:** this is not an SEO problem yet, it is a *public
surface* problem — there are nine indexable URLs and almost nothing on them,
so the work is to publish the two bodies of content the product already owns
(87 imported local events and 8 playbooks) and only then to optimise anything.

---

## 1. Where we stand

Measured 2026-09-18, on production.

### The entire public surface is nine URLs

`/login`, `/start`, `/privacy`, `/city`, and five `/city/<slug>` pages. That
is the sitemap. Everything else — the feed, projects, events, offers, asks,
playbooks, help — is behind the session wall and `Disallow`ed, correctly,
in [robots.txt](../src/app/robots.ts).

Of those nine, four were defective until today: three rendered their brand
name twice in the title, the city descriptions read "0 neighbor-led projects
in Kansas City", and the sitemap's priority-1 entry was `/`, which answers
every crawler with a redirect. Those are fixed (§4).

### There is no home page

`/` redirects signed-out visitors to `/login`. So the site's most important
URL — the one every inbound link, every citation and every brand search points
at — is a 307, and the marketing content lives at a URL with the word "login"
in it. Search engines consolidate this well enough, but it means the front
door cannot be linked to, cannot accumulate authority under its own address,
and reads badly in a result.

### The brand is not indexed. The source repository is.

A search for the product name plus its tagline returns nothing from
peoplearound.com. What *does* return is
[github.com/healthconnectsus/peoplearound-webapp](https://github.com/healthconnectsus/peoplearound-webapp),
which is public, and whose description a search engine has already read and
summarised.

Two things follow. First, the fix is to make the product rank, not to hide the
repository — building in public is a deliberate play elsewhere
(IDEAS_2026-09-18 §M9). Second, worth a deliberate decision rather than a
default: `docs/` in that repository contains the complete go-to-market —
revenue plans, and in [OUTREACH_TARGETS.md](OUTREACH_TARGETS.md) a named list
of organizations, doors and sequencing. Publishing the philosophy is a choice;
publishing the target list may not have been.

### The name is generic in a crowded category

Searching the tagline surfaces *around*, *AroundU*, *Around: Plan with
Friends*, *AroundMe*, *Plansaround*, *AroundYou*, *Radarly* — a dozen
near-identical names in the same "meet people nearby" space, several with app
store listings. "Peoplearound" as a single word is at least distinctive, but
nothing currently tells a search engine that the word and this site are the
same entity. That is what the `Organization` markup added today is for; it is
also why the brand has to be won deliberately rather than assumed.

### There is no density to write about — yet

| | count |
|---|---|
| Registered accounts | 121 |
| …that have chosen a neighborhood | **5** |
| Real (non-demo) communities | 5 |
| Real, non-archived projects | 5 |
| Projects opened to anywhere, the only kind publishable | 4 — **all of them in demo places**, so **0** real |

This is the constraint the whole strategy has to respect. You cannot write
"what neighbors in Boulder are building" pages when five people have picked a
neighborhood — and no amount of search work fixes that. It is also, separately
from SEO, the most striking number in this document: **116 of 121 registered
accounts never chose a place.** Whatever that turns out to be — stalled
onboarding, old test accounts, a schema change — it is worth knowing before
spending on acquisition of any kind.

Until today those pages were worse than empty. `/city` sorts busiest-first,
and the top two entries were "Springfield · 20 projects · 67 neighbors" and
"Shelbyville · 10 projects · 33 neighbors" — the demo seed, above Boulder and
Kansas City, which are real and showed zero. Both were in the sitemap.
[Migration 0058](../supabase/migrations/0058_demo_not_public.sql) removes demo
places from every view a stranger can read.

### What we do have

Two real assets, both currently invisible to search:

- **87 upcoming local events**, refreshed every 48 hours — 64 in Boulder, 23
  in Kansas City — from the county open-space calendar, the university, the
  parks department. Each carries its source's own tags and a link back to the
  organizer. Entirely behind the login wall today.
- **Eight playbooks** — repair café, community garden, walking group, little
  free pantry, tool library, skill swap, senior tech hour, block cleanup —
  each with a description, a first step and the specific asks to make. Real,
  well-written, evergreen how-to content. `Disallow`ed in robots.txt *and*
  behind the session wall.

Those two are the strategy.

---

## 2. What can be won, and what cannot

Ranked by how realistic it is at current scale.

**Winnable now**

1. **The brand.** "peoplearound", "peoplearound app", "peoplearound.com".
   Zero competition for the exact string, and we are losing it to our own
   repository. Free.
2. **Long-tail local event queries.** "free events in kansas city this
   weekend", "things to do in boulder this week", "kansas city parks events".
   Mid-size-city event SERPs are thin and dominated by ad-heavy aggregators.
   We have a curated, plain, non-commercial list nobody else assembles for
   these specific cities — and it updates itself.
3. **"How to start a ___" queries.** "how to start a repair café", "how to
   start a neighborhood tool library", "how to organize a block cleanup".
   Informational, evergreen, national, and *needs no local density at all*.
   The content is already written.
4. **Comparison and intent queries.** "nextdoor alternative", "app to
   organize neighborhood projects". Low volume, very high intent.

**Not winnable, and not worth attempting**

- **"Community garden Denver" and its family.** Owned by Nextdoor, Facebook
  Groups, Meetup and municipal sites, all with years of authority and actual
  content. Attempting it produces thin pages that drag the whole domain down.
- **Event rich results / the events carousel.** Per [Google's event structured
  data guidance](https://developers.google.com/search/docs/appearance/structured-data/event),
  the event experience supports pages focused on a *single* event, and offers
  must lead to a page where a ticket can actually be bought. A listing page of
  87 free community events is not eligible. Build the event pages for ordinary
  organic ranking, not for a carousel. *(Worth re-checking against the Rich
  Results Test before anyone spends a day on markup — this guidance has
  changed before.)*
- **Neighborhood-name pages, today.** "{neighborhood} projects" landing pages
  are named in MARKETING.md §3 as a near-zero-competition play. They are —
  once the neighborhoods have something in them. Five real communities with
  five projects between them would produce five thin, duplicate pages. Park
  it; §3.5 says when to revisit.

---

## 3. The plan, in order

Each item: what, why now, first step, effort, and how you would know.

### 3.0 Instrumentation, before anything else

**What.** Verify the domain in Google Search Console and Bing Webmaster
Tools; submit the sitemap; check the Index Coverage report.

**Why now.** There is currently no way to answer "are we indexed, for what,
and what is broken" except by guessing. Every item below is unmeasurable
without it, and Search Console is also where you find out if the demo-city
URLs were indexed before today and need removal.

**First step.** DNS TXT verification (the domain is on Vercel, so the record
goes in the domain's DNS). Then submit `/sitemap.xml`. If the old
`/city/springfield` and `/city/shelbyville` URLs show as indexed, use the
Removals tool — they now return `noindex`, but removal is faster.

**Effort.** An hour. **Worked if:** the coverage report shows nine valid URLs
and no errors.

### 3.1 Own the name — give the site a home page

**What.** Make `/` a real, public marketing page rather than a redirect to
`/login`. The content already exists on `/login`; extract it into a shared
component, render it at `/` for signed-out visitors, and keep `/`'s existing
onboarding logic for signed-in ones (invite attribution, the silent
neighborhood claim, frontier registration). `/login` becomes the form alone,
with a canonical pointing at `/`.

**Why now.** It is the one structural SEO defect that no amount of content
compensates for: a site with no home page has nowhere to accumulate
authority, nothing to return for a brand search, and an ugly URL on every
citation. It also fixes the sitemap's top entry, which today is a login page.

**First step.** Lift the hero, the "ideas being built" strip and the three
explanation sections out of [`src/app/login/page.tsx`](../src/app/login/page.tsx)
into `src/components/Landing.tsx`. The auth forms stay behind.

**Effort.** Half a day, and it touches the most sensitive page on the site —
do it on its own, verify sign-in and sign-up by hand afterwards, and run
`npm run smoke`.

**Worked if.** A brand search returns peoplearound.com above the GitHub
repository within a month of indexing.

### 3.2 The events layer — the only content that can rank now

**What.** Three pages, in this order:

1. **Put the imported listings on the existing public city pages.** `/city/boulder`
   currently shows four counts and a paragraph. It should show the 64 events
   that are actually on this week, grouped by day, each linking to the
   organizer. This is `LocalCalendars` minus the membership filter, through an
   anon-safe view.
2. **`/city/<slug>/this-weekend`** — the next seven days, as its own URL, so
   there is something to match "this weekend in {city}" precisely.
3. **A Thursday email**, no account required, of that same list.

**Why now.** It solves two problems with one build. The city pages are thin —
four numbers, three of them zero — and thin near-duplicate pages across five
cities are an active liability. And it is the only content the product owns
that a stranger has a reason to read, that updates itself, and that competes
in a weak SERP. Every other page on this list is written once; this one is
written by the crawler every 48 hours.

Note the honesty constraint that makes it work: these are other people's
events, clearly attributed, linking out. The page should say so. That is also
what keeps it from being the ad farm every competitor is.

**First step.** An anon-safe view over `city_events` (the pattern is migration
0043's `public_cities`), then the listings block on `/city/<slug>`. Do not
build the weekend page until the city page is earning clicks.

**Effort.** City-page block: half a day. Weekend page: a day. Email: two days
— Resend and the digest cron already exist.

**Worked if.** Search Console shows impressions for "{city} events"-shaped
queries within six weeks, and `/city/*` clicks go from zero to weekly double
digits.

### 3.3 The playbooks — evergreen, and free of the density problem

**What.** Make the playbooks public: an index at `/playbooks` and a page per
playbook at `/playbooks/<slug>`, each expanded from the current short entry
into a genuine guide — what it is, what it costs, permissions you will need,
the first three steps, what to ask neighbors for, what usually goes wrong.
Remove `/playbooks` from the robots disallow list and from the proxy's
session wall. Keep the "start this project" button, which turns a reader into
a founder in one click.

**Why now.** This is the highest-quality traffic the site can attract — the
person searching "how to start a repair café" is precisely the person the
product needs, a founder rather than a joiner — and it is the only content
play that works with five users as well as with fifty thousand. Eight guides
already exist in [`src/lib/playbooks.ts`](../src/lib/playbooks.ts); they are
currently locked in a room nobody can enter.

**First step.** Route and template first, with the existing copy. Expand one
guide properly (the repair café is the best-written) and see what a real one
costs before committing to eight.

**Effort.** Routes and index: a day. Per guide, expanded honestly: half a day
each.

**Worked if.** Any playbook page ranks in the top 20 for its own "how to
start" query within a quarter, and playbook → "start this project" conversion
is measurable at all.

### 3.4 Intent pages

**What.** Two: `/compare` (the honest Nextdoor comparison already specified
in IDEAS_2026-09-18 §M4) and an expanded `/start`, which today is a good
landing page linking only to `/login` — it should link to the playbooks, the
city pages and back to the home page.

**Why now.** Cheap — writing, not building — and `/start` already exists and
ranks for nothing because nothing links to it and it links onward to nothing.
Internal linking between the nine public pages is currently near-absent:
`/start` links only to `/login`; the playbooks will be orphans unless this is
fixed at the same time.

**Effort.** A day each. **Worked if.** `/compare` appears for "nextdoor
alternative" + a city name; `/start` stops being a dead end.

### 3.5 Neighborhood pages — gated, not scheduled

**What.** The `/neighborhood/<slug>` pages MARKETING.md §3 describes.

**When.** Not until a neighborhood has, say, five real projects or twenty
real members. Write the gate into the code — a page that does not qualify
should 404 rather than publish an empty one. Five thin pages today would cost
more than they earn.

---

## 4. Technical foundations

### Shipped 2026-09-18

- **Demo places removed from every public view** (migration 0058). `/city`
  no longer ranks invented communities above real ones, the front page's
  tally fell from "35 projects · 8 communities · 221 neighbors" to the true
  "5 · 5 · 121", and the two demo city pages now return `noindex`.
- **The landing page stops calling examples real.** With no globally-visible
  projects, `/login` fell back to hand-written samples under the heading
  "Real projects from real communities". It now says they are examples.
- **Titles.** `/start`, `/privacy` and every city page rendered the brand
  twice — "Privacy — Peoplearound — Peoplearound". Fixed at the source: the
  root layout's template appends it, so pages no longer do.
- **A title and description for the front door.** `/login` had none and
  inherited the bare word "Peoplearound".
- **`metadataBase`**, without which every canonical and card URL was emitted
  as a path, which is not a valid value for either.
- **Canonical URLs** on all five static public pages.
- **A share card** ([`opengraph-image.tsx`](../src/app/opengraph-image.tsx)) —
  there was none, so every link shared into a WhatsApp group or a Slack
  arrived as a grey rectangle.
- **…and the proxy bug that made the card unreachable.** Unfurlers fetch it
  with no session and do not follow redirects to HTML, so it answered 307 to
  the login page. Same class of bug as the one already documented for
  `sw.js` and `robots.txt`.
- **Structured data** — `Organization` + `WebSite` on the front door,
  `BreadcrumbList` on the city pages.
- **The sitemap stopped advertising a redirect.** `/` was the priority-1
  entry and answers crawlers with a 307.

### Remaining, in rough order of value

1. **Search Console** (§3.0) — nothing else is measurable without it.
2. **A real home page** (§3.1).
3. **Prerender the city pages.** `/city/<slug>` is dynamically rendered, so
   every crawl hits the database, and an unknown slug returns `200` with a
   `noindex` body rather than a clean `404` — Next streams the response
   before `notFound()` is reached. `generateStaticParams` plus a revalidate
   window would make the real pages CDN-cached and the unknown ones honest.
   Needs `loadCity` to stop using the cookie-bound Supabase client first.
4. **Internal linking** between the public pages (§3.4).
5. **Per-page share cards** — a city card with the city's name on it. The
   proxy already allows any path containing `opengraph-image`.
6. **Image optimisation** — the hero collage is a full-bleed background image
   on the front door and is not served responsively (IDEAS_2026-09-18 §D5).
   Largest Contentful Paint on the one page search traffic lands on.
7. **`hreflang`** if and when Spanish ships (§D10 in the same document).

---

## 5. Measuring

Four numbers, monthly, from Search Console:

1. **Indexed URLs** — should equal the sitemap. Any gap is a defect.
2. **Brand impressions and position** for "peoplearound" — the one query we
   should own outright.
3. **Non-brand clicks**, split by the three families in §2: events, "how to
   start", comparison. This is the number that says whether any of this works.
4. **Clicks → sign-ups**, per landing page. A playbook page that brings
   traffic but no founders is a blog, not a funnel.

And one anti-metric, in the spirit of [INCENTIVES.md §5](INCENTIVES.md):
**traffic that does not become a neighbor who picks a place is not a win.**
With 116 of 121 accounts currently having no neighborhood, more visitors is
not obviously the constraint — fix that number before optimising for volume,
or the traffic will land in the same hole.

---

## 6. What we will not do

- **No pages we cannot fill.** No neighborhood page, city page or playbook
  published before it has something to say. Thin pages are not free; they
  lower what the domain can rank for everywhere else.
- **No invented numbers, ever.** That is what migration 0058 is about. The
  city pages exist so a council officer or a reporter can trust them; one
  fabricated statistic ends that permanently.
- **No naming a neighbor on a public page** without their explicit,
  per-instance consent. This holds for project story pages and the wall of
  thanks alike (IDEAS_2026-09-18 §M2, §M7).
- **No scraped or spun content** to pad the event pages. What the crawler
  imports is attributed and links out; what it cannot import honestly, we do
  without.
- **No doorway pages** — "{service} in {city}" templates at scale. It is the
  obvious way to manufacture hundreds of URLs from the frontier location
  list, it is against Google's spam policies, and it would put the domain at
  risk for traffic that converts at zero.
