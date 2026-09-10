# Automatic city events

Implemented on 2026-09-09. Migrations 0045–0049 are applied to Supabase. Both provider keys were validated and configured as sensitive production environment variables. See the release status at the end of this document for deployment and first-import results.

## Behavior

City listings appear under **Events → Around your city**, with original source links. They do not create fake founders, projects, teams, contributions, or RSVP counts. The existing project-event flow remains available above them.

Every named city in neighborhoods gets an event_cities row. Inserts and city changes, a profile's first neighborhood assignment, and community memberships all trigger registration. Registration is idempotent: additional neighbors in a city do not reset the schedule or repeat discovery. Existing cities are backfilled by the migration. Unnamed locations become eligible once their city is filled in.

The worker checks every ten minutes and claims one due city. Successful imports set the next refresh seven days ahead. Failures/partial failures retry after a day. A ten-minute lease prevents cron/admin overlap and permits recovery after a terminated worker. Cities no longer represented in neighborhoods are not claimed.

Admin has **Populate now — all cities**, a per-city Populate button, last-run status/count/error, and weekly-import enable/disable controls. All-cities processes one immediately and queues the rest; it does not promise completion of an unbounded list within one HTTP request. Admin actions re-check the signed-in account's is_admin before using the service role. The cron route requires CRON_SECRET and is allowed through the session proxy.

New cities are therefore normally picked up within ten minutes, subject to earlier queued cities and provider quotas. Signup does not wait on search/API traffic. New onboarding queues a welcome email after 30 minutes, allowing initial event collection to finish when the queue is short.

## Providers and website discovery

> **Ticketmaster was removed (2026-09, migration 0053).** It filled a new city
> fast — 319 listings for Kansas City within a minute — but what it supplies is
> ticketed entertainment: touring bands, arena sport, theatre runs. Beside a
> neighbor's "Garden Work Day" that is not a neighborhood becoming visible, it
> is noise wearing the same card. The provider code, the API key and the rows
> are all gone, and the database now rejects the value, because a feature
> switched off but left in the schema comes back by accident.


2. **SerpApi Google Search API:** one event-oriented query per refresh. Only structured events_results with a valid upcoming date AND source URL become listings; ordinary organic search snippets are never invented into events. Search results without a reliable date/link are skipped. Some searches have no structured events, so zero results is possible.
3. **Calendar discovery:** a separate Google search on first import and every 30 days finds tourism, municipal, parks, and library calendars. Candidate links are saved for admin review. Kansas City's known Visit KC calendar is included when its source search runs. Admins can enable supported sources for direct collection every 24 or 48 hours. Discovery alone does not enable a source or imply a verified partnership.

SerpApi explicitly deprecated engine=google_events. The implementation uses the supported engine=google endpoint. Provider keys stay server-only. The search importer contacts fixed API hosts; a separate crawler fetches admin-enabled sources. Discovered sites are stored **disabled by default** and are never fetched until an admin enables them — discovery proposes, a human approves, because pointing an automatic crawler at unreviewed search results is how a server ends up fetching somebody's router. Calls to the fixed provider hosts time out at 30 s (raised from 15 s after a live run in which both search calls aborted, leaving the search half silently empty). Source URLs are restricted to HTTPS and rendered as text links; imported HTML/images are not copied.

## Direct calendar collection

Listings keep the labels their source applied (migration 0055): iCal states
them in `CATEGORIES`, and a web page usually renders them as links to its own
category pages rather than publishing them as data, so the crawler reads the
link text. They are shown as chips and are never inferred by us — "Public
Meeting" and "Nature" are the difference between two errands that look
identical in a list of titles.

When the same event arrives from both a feed and a page, the copy kept is the
one that says more. That ordering matters: a site's page is read before its
feed, and the feed is usually the half carrying the categories, so keeping
whichever arrived first silently discarded every tag on kcparks.org.


Admin → Calendar collection accepts an ICS feed or a webpage containing schema.org Event JSON-LD. Each enabled source runs daily or every other day. A ten-minute cron claims one due source per invocation, with a lease to prevent overlap. The manual collection button runs one source and queues the remainder.

The crawler checks robots.txt, respects supported crawl delays, pins validated public DNS addresses, limits requests to 1 MB and 15 seconds, and rejects cross-origin redirects. A webpage crawl follows at most five same-origin event detail links. Only dated, linked events are saved. Titles are HTML-decoded before storage, so a calendar publishing `KC Chief&#8217;s Red Thursday Pep Rally` inside its JSON-LD is stored and shown as written. Listings are deduplicated on write with the same helper the feed uses on display, because a crawl reads the listing page and then its detail pages and sites publish the same event in both. All-day and floating calendar times remain labels rather than invented UTC instants. Recurrence expansion is bounded; unusually dense recurrence rules are skipped. Unsupported sites show an admin explanation and may need a custom adapter. This is a scheduled server worker and does not require an ongoing Claude or Codex session.

## Residents, clans, and activity

- New city rows seed four publicly labeled demo residents in a separate table. Admin can seed up to eight through the UI. They cannot authenticate, message, post, earn credit, or inflate real neighbor counts. Existing cities are not automatically backfilled with demo residents.
- Admin can create a named city/community and send an invitation to a real resident. Real accounts require email verification; the app does not fabricate real identities. `scripts/configure-invite-email.mjs` installs a token-hash invitation template compatible with the existing server confirmation route, without sending mail itself.
- Every existing and new profile receives a personal clan and random invitation code. Joining requires an explicit action by the invitee. Owners can rename their clan; other members can leave. Clans do not bypass community or private-project access rules.
- The desktop and mobile top bars offer admins a city dropdown leading to a dedicated city overview. It does not relocate the administrator's home community.
- Admin activity reports filter by user, community, or both. Totals cover stored projects, events, small helps, offers, updates, and contributions; the list shows the latest 100. New event authors are stamped from the authenticated session. Historical events with unknown authors appear only in community reports. This is a posting report, not a history of deleted posts, clicks, or private messages.

## Welcome emails

The onboarding trigger creates one welcome job per newly assigned profile, with a 30-minute delay and no backfill of existing users. The worker checks every ten minutes and claims up to ten jobs. It respects `digest_opt_out`, waits for email verification, excludes legacy example-domain accounts, and includes up to five upcoming city events plus a verified-neighbor count and the personal clan link.

HTML values are escaped. The outgoing payload is persisted before sending and retries reuse a Resend idempotency key. Five failed attempts are shown in admin; unverified accounts wait instead of exhausting their retry allowance. Provider idempotency is time-limited, so this is not a claim of exactly-once delivery across arbitrarily long failures. The existing weekly digest continues separately. No invitation or welcome email was sent as a test to a real user.

Dates without time zones retain the provider's date/time label; the importer does not invent an instant. Ambiguous/range dates are skipped. Listings expire eight days after last observation; stale entries vanish even when a provider fails. Results are upserted by city/provider/external ID, with conservative display deduplication. Different showtimes are preserved. Cross-provider duplicates with different titles/venues/time labels can remain.

## Configuration and activation

Set server-only variables locally and on Vercel:

```text
SERPAPI_API_KEY=...
EVENT_SEARCH_MONTHLY_LIMIT=200
EVENT_SEARCH_HOURLY_LIMIT=40
```

The existing SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and CRON_SECRET are also required. One provider may be configured alone. Calendar discovery specifically requires SerpApi. Missing keys leave the queue untouched and admin explains what is missing.

For another environment, apply migrations 0045 through 0049 in order using `scripts/db-apply.mjs`, configure the invitation template, and deploy. `RESEND_API_KEY` and a verified `ALERT_FROM` sender are required for welcome mail. Check source links, geographic relevance, counts, and admin status after the first import. The ten-minute schedules require a hosting plan that supports that frequency.

The monthly/hourly search budgets are reserved atomically in Postgres before API requests, including admin clicks and failed attempts. Defaults leave headroom under the researched 250 searches/month and 50/hour free plan. This tracks only this feature, not other applications sharing the key. Budget exhaustion shows in admin and does not delete existing events. At roughly one search/week plus one calendar-discovery search/month, expect approximately 5–6 searches per city per month before retries/manual refreshes. More cities eventually need a larger quota or direct municipal feeds.

City identity follows the app's existing normalized city labels. Same-name cities in different regions are not yet independently identified by a geographic city ID. Admin can specify a fuller search location (e.g. Kansas City, Missouri, United States), and an unqualified name is filled in once from the city's own coordinates. For precise global expansion, first upgrade the shared city model to include region/country identity.

## Validation

- `npm run test:events`: normalization, date boundaries, source URLs, provider schemas, cancellations, duplicates/showtimes, geohash, idempotent import writes, provider isolation, budget denial, locks, missing keys, and cron auth.
- Calendar fixtures cover malformed JSON-LD siblings, all-day/floating/zoned dates, bounded recurrences and private DNS destinations. Welcome fixtures verify opt-outs, HTML escaping, persistent retry payloads and idempotency keys. Both new cron endpoints reject unauthenticated requests.
- `npm run test:database`: all five migrations applied twice to isolated PostgreSQL/PGlite fixtures, including clan ownership and joins/leaves, restricted RPC access, labeled demo creation, welcome queue and crawler leases, event attribution, activity filtering and verified-neighbor context.
- `npm run lint`, TypeScript, and production build.
- Live read-only checks confirmed the existing Supabase schema and both API credentials. Test fixtures did not alter production users. `npm audit` reported zero vulnerabilities after dependency patch updates, including Next.js 16.3.4.

## API research (checked 2026-09-09)

- SerpApi: free plan 250 searches/month, 50/hour. Google Search supports inline event results and ordinary calendar discovery. [Pricing](https://serpapi.com/pricing), [supported event results](https://serpapi.com/events-results), [old endpoint deprecation](https://serpapi.com/google-events-api).
- Socrata/SODA: free municipal open-data access where a city publishes a suitable events dataset; not a nationwide event catalog. Dataset schemas/coverage differ, so no generic adapter is wired yet. [SODA3 access](https://support.socrata.com/hc/en-us/articles/34730618169623-Introducing-the-new-SODA3-API), [app tokens](https://dev.socrata.com/docs/app-tokens.html).
- [Visit KC calendar](https://www.visitkc.com/events/) is a relevant Kansas City source; a public calendar page alone is not a documented reusable events API.
