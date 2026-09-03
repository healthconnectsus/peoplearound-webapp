# Progress

A running log of every commit. Newest first.

Each entry: `### <date> — <message>` followed by what changed. New entries are
added automatically by `npm run ship` (see `scripts/ship.mjs`).

<!-- New entries go directly below this line. -->

### 2026-09-03 — Logo v8.1: fourth letter back to blue #3b7fda so the two p's sit 45 degrees apart instead of 23; brand.ts People rail synced to the wordmark's teal #04b495 with a dark same-hue label at AA

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/lib/brand.ts`


### 2026-09-03 — Logo v8: new hand-designed export - red heart mark (now fully vector, no raster P), teal first 'p' with a long descender that connects into 'around', grey #5e6a6f wordline; icon is a white heart on a red tile; PWA icons regenerated

- `public/apple-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-09-03 — Darken the green so its label can be white

- `src/app/globals.css`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/TagFilter.tsx`
- `src/lib/brand.ts`


### 2026-09-03 — Help buttons join the wordmark green

- `src/lib/brand.ts`


### 2026-09-03 — Green buttons take the wordmark's o: one token, dark ink, deep shade where white is needed

- `src/app/analytics/page.tsx`
- `src/app/chats/Composer.tsx`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/globals.css`
- `src/app/ideas/page.tsx`
- `src/app/login/page.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/page.tsx`
- `src/app/people/NewCommunityDialog.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/LocationCard.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/settings/page.tsx`
- `src/app/start/page.tsx`
- `src/components/AsksSection.tsx`
- `src/components/BadgeCelebration.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/PlaybookList.tsx`
- `src/components/PushToggle.tsx`
- `src/components/TagFilter.tsx`


### 2026-09-03 — Palette v7.6: 'o' back to lime #87d400 (Offers) by request; Projects stays blue #3b7fda; brand.ts mark, button and doc follow

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/lib/brand.ts`


### 2026-09-03 — White label on the project blue; favors and small help take #12967f

- `src/components/FeedComposer.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/brand.ts`


### 2026-09-03 — Palette v7.5: 'o' to brand teal #04b495 (Offers) and 'p' to blue #3b7fda (Projects) - keeps a 45-degree hue gap between the adjacent rails; brand.ts marks, dark-label buttons and doc updated to match

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/lib/brand.ts`


### 2026-09-03 — Use the wordmark's exact teal and fuchsia; dark labels keep them legible

- `src/app/invite/CopyLinkButton.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`
- `src/lib/brand.ts`


### 2026-09-03 — Brand hues: project actions take the wordmark's teal P, invite takes the fuchsia E

- `src/app/invite/CopyLinkButton.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-09-03 — Favicon v7.4: mark enlarged to 115% of the tile, bleeding off the edges (clipped to the rounded tile); PWA icons regenerated

- `public/apple-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `src/app/icon.svg`
- `src/lib/brand.ts`


### 2026-09-03 — Logo v7.3: one brand neutral - PA mark and 'around' both #4c575c in light mode (matches the favicon tile); dark mode unchanged

- `public/logo-light.svg`
- `public/logo.svg`


### 2026-09-03 — Logo v7.2: two-tone neutrals - PA mark darker (#4c575c), 'around' lighter (#6a767b, kept >=4.5:1); favicon rebuilt as filled slate tile with white heart at 78% (white tile was invisible on light tab bars); PWA icons regenerated

- `public/apple-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-09-03 — Logo v7.1: unify light-mode neutrals - PA mark and 'around' both #5e6a6f (was #435055 / #929fa4, the latter only 2.7:1 on white); favicon + PWA icons regenerated; dark mode unchanged

- `public/apple-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-09-03 — Signed-out logo: bigger again

- `src/app/login/page.tsx`


### 2026-09-03 — Drop the tagline under the logo; bigger logo on the signed-out page and footer

- `src/app/login/page.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-09-03 — Logo v7: adopt the hand-designed PA heart lockup - traced the raster P to vector (98.7% IoU, no bitmap left), rebuilt light/dark/adaptive SVGs, new favicon + PWA icons from the mark, header sizes bumped for the stacked two-line lockup; old generator marked superseded

- `public/apple-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `scripts/gen-logo.mjs`
- `src/app/icon.svg`
- `src/app/login/page.tsx`
- `src/app/start/page.tsx`
- `src/components/SiteHeader.tsx`


### 2026-08-17 — Basemap config: set a Mapbox token, pick a style by name

- `.env.example`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/lib/basemap.ts`


### 2026-08-17 — Make the tile layer provider-ready: tile size, retina, Mapbox docs

- `.env.example`
- `docs/SCALING.md`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`


### 2026-08-17 — Buttons stop being pills; louder composer prompt; nothing in the chips goes black

- `src/app/admin/page.tsx`
- `src/app/asks/AskComposer.tsx`
- `src/app/connections/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/CopyLinkButton.tsx`
- `src/app/invite/page.tsx`
- `src/app/login/page.tsx`
- `src/app/neighborhood/LocateButton.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/page.tsx`
- `src/app/people/NewCommunityDialog.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/DeleteAccountButton.tsx`
- `src/app/profile/LocationCard.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/FlagButton.tsx`
- `src/app/projects/[id]/OwnerTools.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/start/page.tsx`
- `src/components/AsksSection.tsx`
- `src/components/BadgeCelebration.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/MapPicker.tsx`
- `src/components/PhotoPicker.tsx`
- `src/components/PlaybookList.tsx`
- `src/components/PushToggle.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`
- `src/components/TopBar.tsx`
- `src/lib/chips.ts`


### 2026-08-17 — Filters sits beside the community dropdown

- `src/app/people/page.tsx`


### 2026-08-17 — Rail: weight eases on hover via variable Roboto, slate palette

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-17 — Thicker slate filter buttons; community picker back to a dropdown

- `src/app/people/page.tsx`
- `src/components/CommunityFilter.tsx`
- `src/lib/chips.ts`


### 2026-08-17 — Feed tags become one checkable multi-select dropdown

- `src/app/people/page.tsx`
- `src/components/TagFilter.tsx`


### 2026-08-17 — Feed filters as Nextdoor-style buttons; drop the redundant heading

- `src/app/explore/page.tsx`
- `src/app/people/page.tsx`
- `src/components/CommunityFilter.tsx`
- `src/lib/chips.ts`


### 2026-08-17 — Explore becomes a community directory; founding banner moves to People around (me)

- `src/app/explore/page.tsx`
- `src/app/neighborhood/communityActions.ts`
- `src/app/people/page.tsx`


### 2026-08-17 — Rail: People around (me), Explore Communities

- `src/components/Sidebar.tsx`


### 2026-08-17 — People lists: no frames, real avatars; community form moves behind a button

- `src/app/people/NewCommunityDialog.tsx`
- `src/app/people/page.tsx`


### 2026-08-17 — Draw an avatar for every demo neighbor

- `public/avatars/demo/u1.svg`
- `public/avatars/demo/u10.svg`
- `public/avatars/demo/u100.svg`
- `public/avatars/demo/u11.svg`
- `public/avatars/demo/u12.svg`
- `public/avatars/demo/u13.svg`
- `public/avatars/demo/u14.svg`
- `public/avatars/demo/u15.svg`
- `public/avatars/demo/u16.svg`
- `public/avatars/demo/u17.svg`
- `public/avatars/demo/u18.svg`
- `public/avatars/demo/u19.svg`
- `public/avatars/demo/u2.svg`
- `public/avatars/demo/u20.svg`
- `public/avatars/demo/u21.svg`
- `public/avatars/demo/u22.svg`
- `public/avatars/demo/u23.svg`
- `public/avatars/demo/u24.svg`
- `public/avatars/demo/u25.svg`
- `public/avatars/demo/u26.svg`
- `public/avatars/demo/u27.svg`
- `public/avatars/demo/u28.svg`
- `public/avatars/demo/u29.svg`
- `public/avatars/demo/u3.svg`
- `public/avatars/demo/u30.svg`
- `public/avatars/demo/u31.svg`
- `public/avatars/demo/u32.svg`
- `public/avatars/demo/u33.svg`
- `public/avatars/demo/u34.svg`
- `public/avatars/demo/u35.svg`
- `public/avatars/demo/u36.svg`
- `public/avatars/demo/u37.svg`
- `public/avatars/demo/u38.svg`
- `public/avatars/demo/u39.svg`
- `public/avatars/demo/u4.svg`
- `public/avatars/demo/u40.svg`
- `public/avatars/demo/u41.svg`
- `public/avatars/demo/u42.svg`
- `public/avatars/demo/u43.svg`
- `public/avatars/demo/u44.svg`
- `public/avatars/demo/u45.svg`
- `public/avatars/demo/u46.svg`
- `public/avatars/demo/u47.svg`
- `public/avatars/demo/u48.svg`
- `public/avatars/demo/u49.svg`
- `public/avatars/demo/u5.svg`
- `public/avatars/demo/u50.svg`
- `public/avatars/demo/u51.svg`
- `public/avatars/demo/u52.svg`
- `public/avatars/demo/u53.svg`
- `public/avatars/demo/u54.svg`
- `public/avatars/demo/u55.svg`
- `public/avatars/demo/u56.svg`
- `public/avatars/demo/u57.svg`
- `public/avatars/demo/u58.svg`
- `public/avatars/demo/u59.svg`
- `public/avatars/demo/u6.svg`
- `public/avatars/demo/u60.svg`
- `public/avatars/demo/u61.svg`
- `public/avatars/demo/u62.svg`
- `public/avatars/demo/u63.svg`
- `public/avatars/demo/u64.svg`
- `public/avatars/demo/u65.svg`
- `public/avatars/demo/u66.svg`
- `public/avatars/demo/u67.svg`
- `public/avatars/demo/u68.svg`
- `public/avatars/demo/u69.svg`
- `public/avatars/demo/u7.svg`
- `public/avatars/demo/u70.svg`
- `public/avatars/demo/u71.svg`
- `public/avatars/demo/u72.svg`
- `public/avatars/demo/u73.svg`
- `public/avatars/demo/u74.svg`
- `public/avatars/demo/u75.svg`
- `public/avatars/demo/u76.svg`
- `public/avatars/demo/u77.svg`
- `public/avatars/demo/u78.svg`
- `public/avatars/demo/u79.svg`
- `public/avatars/demo/u8.svg`
- `public/avatars/demo/u80.svg`
- `public/avatars/demo/u81.svg`
- `public/avatars/demo/u82.svg`
- `public/avatars/demo/u83.svg`
- `public/avatars/demo/u84.svg`
- `public/avatars/demo/u85.svg`
- `public/avatars/demo/u86.svg`
- `public/avatars/demo/u87.svg`
- `public/avatars/demo/u88.svg`
- `public/avatars/demo/u89.svg`
- `public/avatars/demo/u9.svg`
- `public/avatars/demo/u90.svg`
- `public/avatars/demo/u91.svg`
- `public/avatars/demo/u92.svg`
- `public/avatars/demo/u93.svg`
- `public/avatars/demo/u94.svg`
- `public/avatars/demo/u95.svg`
- `public/avatars/demo/u96.svg`
- `public/avatars/demo/u97.svg`
- `public/avatars/demo/u98.svg`
- `public/avatars/demo/u99.svg`
- `public/people1.webp`
- `public/people2.webp`
- `public/people3.webp`
- `scripts/gen-demo-avatars.mjs`
- `supabase/demo-avatars.sql`


### 2026-08-17 — docs: Tier 4b HOA/community-association partnership targets (CAI, registries, management companies, NUSA, Denver INC) + partnership shapes

- `docs/OUTREACH_TARGETS.md`


### 2026-08-17 — Fix login outage (NULL auth tokens from the demo seed); map falls back to the neighborhood

- `scripts/demo-seed-large.sql`
- `scripts/demo-seed.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/projects/[id]/page.tsx`
- `src/components/NeighborhoodMap.tsx`
- `supabase/migrations/0041_auth_null_tokens.sql`


### 2026-08-17 — Drop the rules around the project page's star row

- `src/app/projects/[id]/page.tsx`


### 2026-08-17 — Project page: edit panel, feed-style star/message row, tag-based status and meta

- `src/app/projects/[id]/OwnerTools.tsx`
- `src/app/projects/[id]/StateTag.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/components/ProjectHero.tsx`
- `src/lib/projects.ts`


### 2026-08-17 — Restore rounded frames, unframe the team list, move steward buttons beside their sections

- `src/app/projects/[id]/OwnerTools.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/components/PhotoPicker.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/components/ProjectHero.tsx`


### 2026-08-17 — Project page: view mode by default, shared photo header, square frames

- `src/app/projects/[id]/OwnerTools.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/components/PhotoPicker.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/components/ProjectHero.tsx`


### 2026-08-17 — Feed card: title and starter on the photo, star + message actions, category-tinted shadow

- `src/app/explore/page.tsx`
- `src/app/people/page.tsx`
- `src/app/projects/actions.ts`
- `src/components/ProjectFeedCard.tsx`
- `src/components/SubmitButton.tsx`
- `src/lib/feed.ts`
- `src/lib/projects.ts`


### 2026-08-17 — Admins are exempt from the abuse caps; project map matches every other page

- `docs/ARCHITECTURE.md`
- `src/app/projects/[id]/page.tsx`
- `src/components/TopBar.tsx`
- `supabase/migrations/0040_admins_uncapped.sql`


### 2026-08-17 — Search now returns people, events, offers AND projects

- `docs/UX_SPEC.md`
- `src/app/explore/page.tsx`


### 2026-08-17 — Reduced-motion support, app-wide

- `src/app/globals.css`


### 2026-08-17 — Photographer credit travels with the photo (0039), plus the bug that ate it

- `src/app/api/unsplash-photos/route.ts`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0039_photo_credit.sql`


### 2026-08-17 — Private impact score (closes Phase 1) + cap notices at the wizard doors

- `src/app/analytics/page.tsx`
- `src/app/asks/AskComposer.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/AsksSection.tsx`
- `src/lib/impact.ts`
- `supabase/migrations/0038_action_count.sql`


### 2026-08-17 — Sweep: pending states on every row-creating submit, duplicates purged

- `src/app/chats/Composer.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/people/page.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/components/SubmitButton.tsx`


### 2026-08-17 — Fix: submit buttons gave no feedback, so one click became ten projects

- `src/app/asks/AskComposer.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/SubmitButton.tsx`


### 2026-08-17 — Small help becomes a wizard; cover photo steps instead of showing a gallery

- `docs/UX_SPEC.md`
- `src/app/asks/AskComposer.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/StockPhotoPicker.tsx`
- `src/components/useStockPhotos.ts`


### 2026-08-16 — Warm all 21 adult-group photo queries; ask composer becomes a lightbox

- `docs/UX_SPEC.md`
- `src/app/asks/AskComposer.tsx`


### 2026-08-16 — Cover photos follow the activity, show groups of adults, and never blank

- `scripts/warm-stock-photos.mjs`
- `src/app/api/unsplash-photos/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/StockPhotoPicker.tsx`


### 2026-08-16 — Cover twice as tall with a gradient scrim, edit cue on the description

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-16 — Step 3: auto-loaded blurred cover, six timing cards, prose description

- `docs/UX_SPEC.md`
- `src/app/explore/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/components/StockPhotoPicker.tsx`
- `src/lib/feed.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0037_project_when.sql`


### 2026-08-16 — Stock photos: fix the one-photo-one-query flaw, pre-warm 390 photos

- `docs/ARCHITECTURE.md`
- `scripts/warm-stock-photos.mjs`
- `src/app/api/unsplash-photos/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `supabase/migrations/0036_stock_photo_queries.sql`


### 2026-08-16 — Fetch Unsplash's max 30 photos per query instead of 12

- `src/app/api/unsplash-photos/route.ts`


### 2026-08-16 — Stock photos: cache + per-city recency, and The basics previews the post

- `docs/UX_SPEC.md`
- `src/app/api/unsplash-photos/route.ts`
- `src/app/api/unsplash-photos/track/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/StockPhotoPicker.tsx`
- `supabase/migrations/0035_stock_photos.sql`


### 2026-08-15 — Wizard: 3 free stock photos alongside upload, via the Unsplash API

- `docs/ARCHITECTURE.md`
- `docs/UX_SPEC.md`
- `src/app/api/unsplash-photos/route.ts`
- `src/app/api/unsplash-photos/track/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/StockPhotoPicker.tsx`


### 2026-08-15 — Fix: 'Ask for small help' did nothing when already on People around

- `src/app/asks/AskComposer.tsx`


### 2026-08-12 — Wider content, bolder borders, and a fixed search bar

- `docs/UX_SPEC.md`
- `src/app/admin/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/asks/AskComposer.tsx`
- `src/app/chats/Composer.tsx`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/login/page.tsx`
- `src/app/neighborhood/LocateButton.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/DeleteAccountButton.tsx`
- `src/app/profile/LocationCard.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/FlagButton.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/PhotoUploads.tsx`
- `src/app/settings/page.tsx`
- `src/app/start/page.tsx`
- `src/components/AsksSection.tsx`
- `src/components/CommunityFilter.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/PhotoPicker.tsx`
- `src/components/PlaybookList.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/components/PushToggle.tsx`
- `src/components/SiteHeader.tsx`
- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`


### 2026-08-12 — Content further right, neutral borders become solid slate (blueish-gray)

- `docs/UX_SPEC.md`
- `src/app/admin/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/asks/AskComposer.tsx`
- `src/app/chats/Composer.tsx`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/login/page.tsx`
- `src/app/neighborhood/LocateButton.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/DeleteAccountButton.tsx`
- `src/app/profile/LocationCard.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/FlagButton.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/PhotoUploads.tsx`
- `src/app/settings/page.tsx`
- `src/app/start/page.tsx`
- `src/components/AsksSection.tsx`
- `src/components/CommunityFilter.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/PhotoPicker.tsx`
- `src/components/PlaybookList.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/components/PushToggle.tsx`
- `src/components/SiteHeader.tsx`
- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`


### 2026-08-12 — Content shifts right, neutral borders darken one step

- `docs/UX_SPEC.md`
- `src/app/admin/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/asks/AskComposer.tsx`
- `src/app/chats/Composer.tsx`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/login/page.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/LocationCard.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/FlagButton.tsx`
- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/PhotoUploads.tsx`
- `src/app/settings/page.tsx`
- `src/app/start/page.tsx`
- `src/components/AsksSection.tsx`
- `src/components/CommunityFilter.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/PhotoPicker.tsx`
- `src/components/PlaybookList.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/components/SiteHeader.tsx`
- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`


### 2026-08-11 — Bigger corner X, no People title, community dropdown, five-door composer

- `docs/UX_SPEC.md`
- `src/app/people/page.tsx`
- `src/app/projects/new/CloseWizard.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/CommunityFilter.tsx`
- `src/components/FeedComposer.tsx`


### 2026-08-11 — The idea wizard becomes a full-page lightbox

- `docs/UX_SPEC.md`
- `src/app/projects/new/CloseWizard.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-11 — Composer: drop the avatar

- `src/app/explore/page.tsx`
- `src/app/people/page.tsx`
- `src/components/FeedComposer.tsx`


### 2026-08-11 — Composer on one row; drop the pulse chips from both feeds

- `src/app/explore/page.tsx`
- `src/app/people/page.tsx`
- `src/components/FeedComposer.tsx`


### 2026-08-11 — Composer strip: shorter prompt, buttons split evenly and aligned

- `src/components/FeedComposer.tsx`


### 2026-08-11 — peoplearound.com opens on People around; Explore moves to its own route

- `docs/UX_SPEC.md`
- `src/app/explore/page.tsx`
- `src/app/page.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-11 — Sidebar: color only the first letter, and fix a broken Ask link

- `docs/UX_SPEC.md`
- `src/components/Sidebar.tsx`


### 2026-08-11 — People around becomes Explore's twin, scoped to your own communities

- `docs/UX_SPEC.md`
- `src/app/people/page.tsx`
- `src/components/ProjectFeedCard.tsx`
- `src/lib/feed.ts`


### 2026-08-11 — Sidebar: bigger text, inactive rails go fully regular weight

- `src/components/Sidebar.tsx`


### 2026-08-11 — Rail back to neutral, wider sidebar, Roboto, Explore-style People header

- `src/app/admin/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/globals.css`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/layout.tsx`
- `src/app/offers/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`


### 2026-08-11 — Rail letters wear the wordmark's colors, Explore gets a composer strip

- `src/app/admin/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/offers/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/FeedComposer.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`


### 2026-08-11 — The rail spells PEOPLE, and the shell breathes on the left

- `docs/UX_SPEC.md`
- `src/app/asks/askActions.ts`
- `src/app/asks/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/neighborhood/communityActions.ts`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/FavesList.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/navCounts.ts`


### 2026-08-11 — Inter replaces Arial app-wide, and rails bold on hover

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-11 — Six rails: Local Faves joins People around, Small help joins My Communities

- `docs/UX_SPEC.md`
- `src/app/admin/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/asks/askActions.ts`
- `src/app/asks/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/offers/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/recap/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/AsksSection.tsx`
- `src/components/FavesList.tsx`
- `src/components/MapShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/lib/navCounts.ts`


### 2026-08-11 — Wizard adopts the colour of the intent you picked

- `docs/UX_SPEC.md`
- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-11 — Sidebar tagline: drop italic, semibold weight

- `src/components/Sidebar.tsx`


### 2026-08-11 — Sidebar tagline: bump to 12px

- `src/components/Sidebar.tsx`


### 2026-08-11 — Tagline fits on one line under the wordmark

- `docs/MARKETING.md`
- `src/app/login/page.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-08-11 — Per-intent project tags, and the tagline becomes the brand name

- `docs/MARKETING.md`
- `src/app/login/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`
- `src/lib/projects.ts`


### 2026-08-11 — Wizard: 2-row description textarea, 'Already started' instead of 'Already building'

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-11 — The basics: drop the title field, add an edit pencil, rename the description

- `docs/UX_SPEC.md`
- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-11 — The basics: a blue summary line, and lighter form furniture

- `src/app/projects/new/IdeaForm.tsx`
- `src/components/PhotoPicker.tsx`


### 2026-08-11 — Wizard: stepper moves to the right rail, tighter step 2, Back leads every row

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Your idea: a Next button that skips the assistant and keeps your words

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Wizard page: drop the subtitle and the emerald panel around step 2

- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


### 2026-08-10 — Quick-pick cards: shorter, real example on the flip side, bridge line to free text

- `public/faces/dana.webp`
- `public/faces/elena.webp`
- `public/faces/grace.webp`
- `public/faces/hannah.webp`
- `public/faces/ken.webp`
- `public/faces/leo.webp`
- `public/faces/lily.webp`
- `public/faces/marcus.webp`
- `public/faces/mei.webp`
- `public/faces/miguel.webp`
- `public/faces/ruth.webp`
- `public/faces/sam.webp`
- `public/faces/tom.webp`
- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Quick-pick cards match the intent cards: colored gradients, hover flip

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Your idea step: quick-pick cards per intent, heading carries the choice

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Sidebar buttons: both solid, left-aligned, lucide icons

- `docs/UX_SPEC.md`
- `src/components/Sidebar.tsx`


### 2026-08-10 — Intent step: 'I'd like to:' framing, cards become verbs

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Intent cards: saturated gradient fronts instead of pale tints

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Flip cards use real headshots from the face set

- `public/faces/anna.webp`
- `public/faces/jonathan.webp`
- `public/faces/people1.webp`
- `public/faces/people2.webp`
- `public/faces/people3.webp`
- `public/faces/rosa.webp`
- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Wizard intent cards: color-tinted, flip on hover to a real example

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Wizard: opening step asks what kind of thing this is

- `docs/UX_SPEC.md`
- `src/app/api/shape-idea/route.ts`
- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-10 — Wizard page heading: 'Start something with people' (matches button label)

- `src/app/manifest.ts`
- `src/app/projects/new/page.tsx`


### 2026-08-10 — Primary button: 'Start something with people' instead of 'Share something to do'

- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-08-10 — Login page: align headline and section titles with brand tagline

- `src/app/login/page.tsx`


### 2026-08-10 — Sidebar: sparkles icon on the share button, doors back between rails and utilities

- `docs/UX_SPEC.md`
- `src/components/Sidebar.tsx`


### 2026-08-10 — Sidebar: both start-buttons above the rails, and 'Share something to do'

- `docs/UX_SPEC.md`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-08-10 — Tagline under the logo: 'Let's do something together.'

- `docs/UX_SPEC.md`
- `src/app/login/page.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-08-10 — docs: brand voice (tagline, CTA, core question) in MARKETING.md; non-goals section in CONCEPT.md

- `docs/CONCEPT.md`
- `docs/MARKETING.md`


### 2026-08-10 — Sidebar: one number per rail, and drop the community stats block

- `docs/UX_SPEC.md`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/navCounts.ts`


### 2026-08-08 — Map: community switcher pills, and a map on My ideas

- `docs/UX_SPEC.md`
- `src/app/ideas/page.tsx`
- `src/components/MapShell.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/lib/mapPins.ts`


### 2026-08-07 — Every around-me map frames your neighborhood, not the continent

- `docs/UX_SPEC.md`
- `src/components/MapShell.tsx`
- `src/components/NeighborhoodMap.tsx`


### 2026-08-07 — Pin pickers open on your neighborhood, not the whole planet

- `docs/UX_SPEC.md`
- `src/app/asks/AskComposer.tsx`
- `src/app/asks/page.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/page.tsx`
- `src/app/profile/LocationCard.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/MapPicker.tsx`
- `src/lib/mapPins.ts`


### 2026-08-07 — Sidebar: 'Ask for small help' button; fold Groups into People around and Playbooks into My ideas

- `docs/UX_SPEC.md`
- `src/app/asks/AskComposer.tsx`
- `src/app/asks/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/people/page.tsx`
- `src/app/playbooks/page.tsx`
- `src/app/profile/page.tsx`
- `src/components/PlaybookList.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-07 — Small help: ask for a hand with an honest time estimate

- `docs/DATA_MODEL.md`
- `docs/FEATURE_IDEAS.md`
- `docs/UX_SPEC.md`
- `src/app/asks/AskComposer.tsx`
- `src/app/asks/askActions.ts`
- `src/app/asks/page.tsx`
- `src/app/help/page.tsx`
- `src/app/offers/page.tsx`
- `src/app/page.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/asks.ts`
- `src/lib/mapPins.ts`
- `supabase/migrations/0033_small_help.sql`
- `supabase/migrations/0034_offer_claim_guard.sql`


### 2026-08-07 — Logo v6.4: darken 'around' ink from #6E6E73 to #58585C (light mode); dark mode stays #D4D4D8 for legibility

- `docs/MARKETING.md`
- `docs/OUTREACH_TARGETS.md`
- `public/logo-light.svg`
- `public/logo.svg`
- `scripts/gen-logo.mjs`
- `src/app/icon.svg`


### 2026-08-07 — Tier 2 complete: PWA install (manifest, icons, offline shell) and opt-in Web Push delivered from the notifications table by a 10-minute cron

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/FEATURE_IDEAS.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`
- `public/apple-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/sw.js`
- `src/app/api/push/route.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/layout.tsx`
- `src/app/manifest.ts`
- `src/app/offline/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/PushToggle.tsx`
- `src/components/ServiceWorker.tsx`
- `supabase/migrations/0032_push_subscriptions.sql`
- `vercel.json`


### 2026-08-07 — Security: upgrade next 16.2.7 to 16.3.0 - clears all HIGH advisories incl. GHSA-6gpp-xcg3-4w24 proxy/middleware auth bypass (auth guard lives in src/proxy.ts) plus SSRF/DoS/cache-confusion and vulnerable postcss; npm audit now 0 vulnerabilities; build passes, auth redirect and public routes verified on dev server

- `package-lock.json`
- `package.json`


### 2026-08-07 — Tier 2: playbooks (proven starting points that prefill the wizard), collective milestones on the feed, and /recap neighborhood year in review

- `package-lock.json`
- `package.json`
- `src/app/page.tsx`
- `src/app/playbooks/page.tsx`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/recap/page.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/milestones.ts`
- `src/lib/playbooks.ts`


### 2026-08-07 — Profile map: your world (your spot, communities, ideas, faves, events) plus private location control and communities/events sections; migration 0031

- `docs/DATA_MODEL.md`
- `docs/UX_SPEC.md`
- `src/app/profile/LocationCard.tsx`
- `src/app/profile/locationActions.ts`
- `src/app/profile/page.tsx`
- `src/lib/mapPins.ts`
- `supabase/migrations/0031_user_location.sql`


### 2026-08-07 — Spatial context for offers (approximate pin + place text, rounded to ~110m), groups (community centres), and people (community clusters with headcounts, never individuals); migration 0030

- `docs/DATA_MODEL.md`
- `docs/UX_SPEC.md`
- `src/app/groups/page.tsx`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/offerActions.ts`
- `src/app/offers/page.tsx`
- `src/app/people/page.tsx`
- `src/lib/mapPins.ts`
- `supabase/migrations/0030_offer_location.sql`


### 2026-08-07 — Map shell on every around-me page (faves, groups, events, offers, people, communities) via a shared MapShell; rename to My Communities

- `docs/UX_SPEC.md`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/offers/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/components/MapShell.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/mapPins.ts`


### 2026-08-07 — Logo v6.3: normalize 'around' to people's exact x-height (emboldening had left it ~30 units taller; measured-band uniform rescale, favicon too); ink softened to gray #6E6E73 light / #D4D4D8 dark

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `scripts/gen-logo.mjs`
- `src/app/icon.svg`


### 2026-08-07 — Tier 2: reputation and skills assembled from confirmed contributions (ranked by distinct attesters, never volume); docs for co-organizer + gardener + reputation

- `docs/FEATURE_IDEAS.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`


### 2026-08-07 — Logo v6.2: tighten spacing - word gap 105 to 70, 'around' letter gaps reduced 40 each (floored at 3 where r's arm nearly touches o); around placed by bbox after emboldening

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `scripts/gen-logo.mjs`
- `src/app/profile/page.tsx`
- `src/lib/reputation.ts`


### 2026-08-07 — Tier 2: AI Gardener phase 2 — private stall nudges and dignified off-ramps for quiet projects (DeepSeek, weekly cron, founder-only, dismissible); migration 0029

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `scripts/gen-logo.mjs`
- `src/app/api/gardener/route.ts`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/updateActions.ts`
- `src/lib/supabase/proxy.ts`
- `supabase/migrations/0029_gardener_nudges.sql`
- `vercel.json`


### 2026-08-07 — Tier 2: co-organizer role — founders promote teammates who can then accept joins, run events, and accept others' contributions (never their own); migration 0028

- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `supabase/migrations/0028_co_organizers.sql`


### 2026-08-07 — Tier 2: offers board (give/lend/skill, community-scoped, claim flow, no money anywhere) — migration 0027

- `docs/DATA_MODEL.md`
- `docs/FEATURE_IDEAS.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `src/app/offers/OfferComposer.tsx`
- `src/app/offers/offerActions.ts`
- `src/app/offers/page.tsx`
- `src/components/Sidebar.tsx`
- `supabase/migrations/0027_offers.sql`


### 2026-08-07 — Grant admin to the operator's app login (peoplearound.alexandre@gmail.com) alongside the GitHub account

- `supabase/migrations/0026_admin_accounts.sql`


### 2026-08-07 — Tier 1 part 3: /admin ops console (flag queue, community cleanup, health strip) with is_admin gating; docs for the whole batch

- `docs/DATA_MODEL.md`
- `docs/FEATURE_IDEAS.md`
- `docs/ROADMAP.md`
- `src/app/admin/adminActions.ts`
- `src/app/admin/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-07 — Tier 1 part 2: persistent notification inbox (bell reads the table, mark-all-read, unread styling) and weekly digest email (Vercel Cron + Resend, quiet weeks send nothing, Settings opt-out)

- `src/app/api/digest/route.ts`
- `src/app/notificationActions.ts`
- `src/app/settings/page.tsx`
- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`
- `src/lib/supabase/proxy.ts`
- `vercel.json`


### 2026-08-07 — Tier 1 part 1: add-to-calendar on events (.ics + Google), feed filter chips (category/help/event-soon), onboarding first-action nudge; notifications schema + fan-out triggers (migration 0025)

- `src/app/api/event-ics/route.ts`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0025_notifications_and_admin.sql`


### 2026-08-07 — Correct stale AI model reference and list new tables/storage in the architecture table

- `docs/ARCHITECTURE.md`


### 2026-08-07 — Docs catch-up: DATA_MODEL tables for updates/flags/views/rate-limit ledger, ROADMAP shipped list, UX_SPEC screens 4.13-4.15, AI provider correction

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`


### 2026-08-07 — Fix reviewer-found RSVP staleness (trigger touches parent event), cap realtime debounce at 10s, store JPEG bytes under .jpg paths, flatten transparency to white before JPEG encode

- `docs/SCALING.md`
- `src/app/settings/PhotoUploads.tsx`
- `src/components/LiveRefresh.tsx`
- `src/lib/image.ts`
- `supabase/migrations/0024_rsvp_touches_event.sql`


### 2026-08-07 — Fix two defects in the scaling pass: apply EXIF orientation when downscaling photos, and REPLICA IDENTITY FULL so filtered realtime catches deletes

- `docs/SCALING.md`
- `src/lib/image.ts`
- `supabase/migrations/0023_realtime_delete_filters.sql`


### 2026-08-07 — docs: add BUSINESS.md — monetization streams, sequencing, break-even

- `docs/BUSINESS.md`


### 2026-08-07 — Scaling fixes: filtered+visibility-gated realtime with polling fallback, client-side image downscaling, swappable map tile provider, Haiku fallback for AI; add docs/SCALING.md

- `docs/SCALING.md`
- `src/app/api/shape-idea/route.ts`
- `src/app/chats/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/settings/PhotoUploads.tsx`
- `src/components/LiveRefresh.tsx`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/PhotoPicker.tsx`
- `src/lib/image.ts`


### 2026-08-07 — Analytics page (/analytics): funnel, 30-day view trend, per-idea table; map now focuses on local+city pins instead of zooming out to the continent

- `docs/FEATURE_IDEAS.md`
- `src/app/analytics/page.tsx`
- `src/app/page.tsx`
- `src/app/profile/page.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0022_view_trends.sql`


### 2026-08-07 — Brand tooling: commit logo generator as scripts/gen-logo.mjs (variants quicksand/poppins/comfortaa + licensed-leksen slot, synthetic embolden via rounded polygon offset); verified byte-identical to shipped v6.1 assets; npm audit fix for dev tooling

- `package-lock.json`
- `package.json`
- `scripts/gen-logo.mjs`


### 2026-08-07 — Logo v6.1: switch wordmark to Quicksand - colored glass 'people' (Medium), 'around' Bold emboldened +15 units via rounded polygon offset (synthetic ExtraBold, round terminals preserved); favicon matches

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-08-07 — Logo v6: invert the two words - 'people' colored per letter with 70-unit glass overlap (Poppins Medium), 'around' solid ink Poppins ExtraBold; favicon pa inverted to match

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-08-06 — Logo v5.1: 'around' letters now overlap 70 units with 0.88 translucency (layered-glass color mixing, placed by bbox so bearings can't eat the overlap); favicon pa overlaps too

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-08-06 — Logo v5: full redesign - lowercase Poppins editorial wordmark, 'people' in Light ink, 'around' Medium with one brand color per letter; matching pa favicon; text vectorized to paths (OFL font, not shipped)

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-08-06 — Project page: sticky full-height map in the right column, matching the feed's split shell

- `src/app/projects/[id]/page.tsx`


### 2026-08-06 — Mark photo uploads and project updates as shipped in the feature backlog

- `docs/FEATURE_IDEAS.md`


### 2026-08-06 — Tier 1: real photo uploads (projects bucket, wizard + owner editor) and project updates (build log posts into the timeline)

- `src/app/projects/[id]/UpdateComposer.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/projects/updateActions.ts`
- `src/components/PhotoPicker.tsx`
- `supabase/migrations/0021_project_photos_and_updates.sql`


### 2026-08-06 — Profile analytics (idea views with private per-day dedup, messages sent, stars given, neighbors brought) and FEATURE_IDEAS.md backlog

- `docs/FEATURE_IDEAS.md`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `supabase/migrations/0020_project_views.sql`


### 2026-08-06 — First Idea badge (one-time) with celebration on the project page; community flagging with ops review email at 3 flags

- `docs/ARCHITECTURE.md`
- `docs/INCENTIVES.md`
- `src/app/projects/[id]/FlagButton.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/flagActions.ts`
- `src/lib/badges.ts`
- `supabase/migrations/0019_project_flags.sql`


### 2026-08-06 — Logo: restore the PEOPLE letter overlap and original cap height after thinning - inset 47.4/1000em then rescale, reproducing every original letter separation; favicon recentred

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-08-06 — Logo: thin the wordmark — inset glyphs 40/1000em (stem 199 to 119), applied to logo.svg, logo-light/dark.svg and the app icon

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-08-05 — Wider wizard (fluid column), AI refiner on DeepSeek (Anthropic fallback), skip link only shown as AI-failure escape hatch

- `src/app/api/shape-idea/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


### 2026-08-05 — Wizard focus mode: extra-large typography and controls, white veil over the sidebar (logo stays)

- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`


### 2026-08-05 — Example ideas in two columns; widen wizard page accordingly

- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


### 2026-08-04 — Inspiration rail on step 1: ten tappable example ideas that prefill the talk-it-out box

- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


### 2026-08-04 — Widen the start-an-idea wizard to max-w-3xl

- `src/app/projects/new/page.tsx`


### 2026-08-04 — Wizard progress: numbered step chips (1-4), bigger bolder labels

- `src/app/projects/new/IdeaForm.tsx`


### 2026-08-04 — Start an idea: renamed title, wider title-to-wizard spacing, bigger bolder step headings

- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


### 2026-08-04 — Bigger, bolder page titles (text-3xl extrabold) and darker section headers for readability

- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`


### 2026-08-04 — Tighten share-an-idea wizard copy: half the words, same warmth

- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/MapPicker.tsx`


### 2026-08-04 — Widen the neighborhood map column (50% lg / 53% xl, top bar mirrored)

- `src/app/page.tsx`
- `src/components/TopBar.tsx`


### 2026-08-04 — Nudge search bar and content column right on desktop (shared lg:pl-16)

- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/TopBar.tsx`


### 2026-08-04 — Align content precisely with the top search bar: left-align the search column, normalize page padding to px-4/lg:px-8 everywhere

- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/TopBar.tsx`


### 2026-08-04 — Project cover photos (9 generated images on demo projects, feed card + detail hero) and left-align app content with the search bar

- `public/photos/air-quality.jpg`
- `public/photos/choir.jpg`
- `public/photos/contact-tree.jpg`
- `public/photos/costumes.jpg`
- `public/photos/midnight-football.jpg`
- `public/photos/park-cleanup.jpg`
- `public/photos/solar-roof.jpg`
- `public/photos/swim-lessons.jpg`
- `public/photos/window-boxes.jpg`
- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/settings/page.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0018_project_photos.sql`


### 2026-08-04 — Anti-abuse pass: DB-enforced per-user caps (projects/communities/conversations/messages/AI shaping), 429 on shape-idea, Turnstile CAPTCHA wiring

- `docs/ARCHITECTURE.md`
- `scripts/configure-captcha.mjs`
- `src/app/api/shape-idea/route.ts`
- `src/app/login/actions.ts`
- `src/app/login/page.tsx`
- `supabase/migrations/0017_abuse_caps.sql`


### 2026-08-04 — Marketing: public /start landing page (run club / pickup soccer / pickleball starter plans), docs/MARKETING.md with sports-association outreach plan and email templates

- `docs/MARKETING.md`
- `src/app/start/page.tsx`
- `src/lib/supabase/proxy.ts`


### 2026-08-04 — Docs: properly document messaging (/chats, participant-scoped RLS) and multi-community membership; fix stale neighborhoods write-path claim

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/UX_SPEC.md`


### 2026-08-04 — Badge patch: extend the P's stem below the ribbon (foot was hidden); celebrate new badges on the home feed so founding fires at first login

- `src/app/page.tsx`
- `src/components/BadgeMedallion.tsx`


### 2026-08-04 — Badge patches (P-silhouette + gradient ribbon, per brand mockups) and one-time unlock celebration with confetti; dev badge gallery

- `docs/INCENTIVES.md`
- `src/app/dev/badges/page.tsx`
- `src/app/profile/page.tsx`
- `src/components/BadgeCelebration.tsx`
- `src/components/BadgeMedallion.tsx`
- `src/lib/supabase/proxy.ts`


### 2026-08-04 — Badges v1 (derived medallions, earned-only), delete-account with confirm lightbox, branded auth emails via Resend SMTP; INCENTIVES.md updated

- `docs/INCENTIVES.md`
- `scripts/configure-auth-email.mjs`
- `src/app/profile/DeleteAccountButton.tsx`
- `src/app/profile/actions.ts`
- `src/app/profile/page.tsx`
- `src/components/BadgeMedallion.tsx`
- `src/lib/badges.ts`


### 2026-08-04 — Add INCENTIVES.md living incentives record; bring docs up to date: frontier locations, security posture, auto-locate onboarding, founding neighbors, communities generalization

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/INCENTIVES.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`


### 2026-08-03 — Founding Neighbors incentive: permanent first-10 status, personal invite links with attribution (invited_by), founding-era growth banner

- `src/app/invite/CopyLinkButton.tsx`
- `src/app/invite/page.tsx`
- `src/app/page.tsx`
- `src/lib/supabase/proxy.ts`
- `supabase/migrations/0016_invite_attribution.sql`


### 2026-08-03 — Require sign-up before frontier registration: anonymous visitors get name preview only; place is created on first signed-in visit

- `src/app/api/register-location/route.ts`
- `src/app/login/AutoLocate.tsx`
- `src/app/page.tsx`
- `src/lib/frontier.ts`


### 2026-08-03 — Harden frontier endpoint: service-role-only register RPC, DB-enforced per-IP and global daily caps, origin check, in-memory throttle, salted IP hashing

- `package-lock.json`
- `package.json`
- `src/app/api/register-location/route.ts`
- `src/lib/supabase/admin.ts`
- `supabase/migrations/0015_frontier_hardening.sql`


### 2026-08-03 — Frontier locations: auto-register uncovered places (Nominatim + dedupe) and email ops alert; neighborhood centers for matching

- `src/app/api/register-location/route.ts`
- `src/app/login/AutoLocate.tsx`
- `src/lib/supabase/proxy.ts`
- `supabase/migrations/0014_frontier_locations.sql`


### 2026-08-03 — Auto location popup for logged-out visitors: anon locate_teaser RPC, landing teaser banner, neighborhood auto-claim after sign-up

- `src/app/login/AutoLocate.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `supabase/migrations/0013_public_locate.sql`


### 2026-07-31 — Landing ideas: 3-column photo card grid with collage crops

- `src/app/login/page.tsx`


### 2026-07-31 — Hero overlay: deepen mid and bottom stops (via 60, to 35)

- `src/app/login/page.tsx`


### 2026-07-31 — Hero overlay: vertical gradient, dark at top easing lighter at bottom

- `src/app/login/page.tsx`


### 2026-07-31 — Full-bleed hero collage to page top; white nav + dark-variant logo over photo

- `src/app/login/page.tsx`


### 2026-07-31 — Fix ambiguous profiles->neighborhoods embeds after 0011 (broke home redirect); photo collage hero with dark overlay

- `public/hero-collage.jpg`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/TopBar.tsx`


### 2026-07-31 — Fix onboarding dead-end: joining a community falls back to setting primary before migration 0011

- `src/app/neighborhood/communityActions.ts`


### 2026-07-31 — Hero collage of project tiles on the landing page

- `src/app/login/page.tsx`


### 2026-07-31 — Nextdoor-style logged-out landing page with live public ideas list (migration 0012)

- `src/app/login/page.tsx`
- `supabase/migrations/0012_public_ideas.sql`


### 2026-07-31 — Messaging (chats) + multi-community membership with kinds; migration 0011

- `README.md`
- `src/app/chats/Composer.tsx`
- `src/app/chats/MarkRead.tsx`
- `src/app/chats/actions.ts`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/neighborhood/communityActions.ts`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBarIcons.tsx`
- `src/lib/communities.ts`
- `supabase/migrations/0011_communities_and_chats.sql`


### 2026-07-31 — Nextdoor-style Edit Profile (bio/pronouns/hometown/photos), lucide outline icons, tagline in docs

- `README.md`
- `docs/CONCEPT.md`
- `package-lock.json`
- `package.json`
- `src/app/profile/page.tsx`
- `src/app/settings/PhotoUploads.tsx`
- `src/app/settings/actions.ts`
- `src/app/settings/page.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`
- `supabase/migrations/0010_profile_fields.sql`


### 2026-07-31 — New tagline: Build ideas with your communities

- `src/app/help/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`


### 2026-07-31 — Profile page + Nextdoor-style dropdown header with View profile

- `src/app/profile/page.tsx`
- `src/components/ProfileMenu.tsx`


### 2026-07-31 — Top bar: notifications bell (join requests + stars) and messages icon

- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`


### 2026-07-31 — Home title: Communities (city/your ideas/total ideas)

- `src/app/page.tsx`


### 2026-07-31 — Top bar alignment + transparency, My ideas + My connections pages, My community block with neighborhood stats

- `src/app/connections/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`


### 2026-07-31 — Bigger sidebar logo (full-width in a wider rail)

- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-30 — Nextdoor-style chrome: top bar with search + profile menu, expanded sidebar, new Events/People/Faves/Groups/Settings/Help/Invite pages

- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/invite/CopyLinkButton.tsx`
- `src/app/invite/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/settings/actions.ts`
- `src/app/settings/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`


### 2026-07-30 — Nextdoor-style sidebar on desktop + more saturated logo colors

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-30 — Logo v3: fattened letterforms via polygon offset to match reference weight

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-07-30 — Logo v2: pastel translucent letter palette per new reference

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-07-30 — New logo: colorful overlapping DINASTI wordmark, adaptive light/dark SVG + favicon

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`
- `src/app/login/page.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-29 — Split app shell: sticky full-height map beside feed, stat-chip pulse, elevated cards on warm background; seed centered on Aurora CO

- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-29 — Redesign feed: neighborhood map (Leaflet/OSM), pulse header, reach zones, story-beat cards, avatars; location picker in wizard; seed pins

- `docs/DATA_MODEL.md`
- `docs/UX_SPEC.md`
- `package-lock.json`
- `package.json`
- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0009_project_location.sql`


### 2026-07-29 — Fix demo seed owner rotation so projects spread across all three neighborhoods

- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`


### 2026-07-29 — Add large demo seed generator: 100 users across 3 neighborhoods and 2 cities, 30 projects using help/reach

- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`


### 2026-07-29 — Add help kind + reach (neighborhood/city/global, RLS-enforced) and rebuild create flow as a 4-step wizard

- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/UX_SPEC.md`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0008_help_and_reach.sql`


### 2026-07-29 — Add demo seed script: six neighbors, three weeks of simulated activity across the full loop

- `scripts/demo-seed.sql`


### 2026-07-28 — Add neighborhood scoping (PostGIS) + realtime: hard RLS boundary, /neighborhood picker with geolocation, live-updating feed

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `src/app/neighborhood/LocateButton.tsx`
- `src/app/neighborhood/actions.ts`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/components/LiveRefresh.tsx`
- `supabase/migrations/0007_neighborhoods.sql`


### 2026-07-28 — Add project history timeline: The story so far - idea, day-clustered stars, joins, confirmed contributions, events, completion

- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`
- `src/app/projects/[id]/page.tsx`
- `src/lib/projects.ts`


### 2026-07-28 — Add events + RSVPs: founder plans time/place, neighbors signal I'm-in; no no-show data by design; Happening-soon strip on feed

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0006_events.sql`


### 2026-07-28 — Revoke reconcile_contributions execute from anon (Supabase default-privilege hygiene)

- `supabase/migrations/0005_contributions.sql`


### 2026-07-28 — Add contributions + attestations trust layer: logged -> accepted -> confirmed with co-attestation, RLS anti-self-crediting, 7-day founder bypass

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `package-lock.json`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0005_contributions.sql`


### 2026-07-28 — Docs v2 for project pivot; add AI talk-it-out idea shaping (Claude + voice input)

- `.env.example`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CONCEPT.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`
- `package-lock.json`
- `package.json`
- `src/app/api/shape-idea/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


### 2026-07-04 — Pivot to joinable projects: rename goals to projects, add stars + request/approve memberships, friendlier UX

- `.claude/launch.json`
- `scripts/db-apply.mjs`
- `src/app/goals/[id]/page.tsx`
- `src/app/goals/actions.ts`
- `src/app/goals/new/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/page.tsx`
- `src/components/SiteHeader.tsx`
- `src/lib/goals.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0002_rename_goals_to_projects.sql`
- `supabase/migrations/0003_stars.sql`
- `supabase/migrations/0004_memberships.sql`


### 2026-06-05 — Add Goals feature: profiles+goals schema with RLS, create/feed/detail, state transitions

- `src/app/goals/[id]/page.tsx`
- `src/app/goals/actions.ts`
- `src/app/goals/new/page.tsx`
- `src/app/page.tsx`
- `src/components/ConfirmSubmit.tsx`
- `src/components/SiteHeader.tsx`
- `src/lib/goals.ts`
- `supabase/migrations/0001_profiles_and_goals.sql`


### 2026-06-05 — Harden auth: forward root ?code= to /auth/confirm

- `src/lib/supabase/proxy.ts`


### 2026-06-05 — Use peoplearound logo on login and home pages

- `public/logo.png`
- `src/app/login/page.tsx`
- `src/app/page.tsx`


### 2026-06-05 — Make commit-version robust for CLI deploys; wire Vercel deploy into ship

- `.gitignore`
- `.vercelignore`
- `next.config.ts`
- `scripts/ship.mjs`


### 2026-06-05 — Fix ship changed-files parsing (clean paths)

- `progress.md`
- `scripts/ship.mjs`


### 2026-06-05 — Add ship automation: progress + commit + push + deploy

- `package.json`
- `progress.md`
- `scripts/ship.mjs`


### 2026-06-05 — Initial webapp scaffold + Supabase auth

**Initial webapp scaffold + Supabase auth.**

- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind v4) into the repo, preserving the existing product `docs/`.
- Added Supabase auth via `@supabase/ssr`:
  - Browser client (`src/lib/supabase/client.ts`) and server client (`src/lib/supabase/server.ts`, async `cookies()`).
  - Session refresh + route protection in `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`).
- Built the auth flow:
  - `/login` — email/password sign-in & sign-up, plus magic-link, via server actions.
  - `/auth/confirm` — verifies email confirmation / magic links (`token_hash` and PKCE `code`).
  - Protected `/` home with sign-out.
- **Commit version on the login page**: footer shows `vX.Y.Z · <commit>`, injected at build time in `next.config.ts` (Vercel `VERCEL_GIT_COMMIT_SHA` or local git).
- Env handling: real values in gitignored `.env.local`; `.env.example` committed as a template. Secret key kept server-side only, never committed.
