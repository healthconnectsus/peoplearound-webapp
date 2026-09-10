-- Peoplearound — 0052 events can carry a photo
--
-- The last unfinished piece of Tier 1 item 1 (FEATURE_IDEAS): projects, project
-- updates, offers and small-help asks all take a photo; events, the one thing
-- you actually turn up to, did not.
--
-- It matters more here than anywhere else. An event is an invitation to stand
-- in a real place with people you may not know yet, and "the Oak Street lot"
-- is a very different proposition depending on whether you can see it. A
-- picture of the room, the corner, the last time this happened, answers the
-- question a hesitant neighbor is actually asking: will I know where to go,
-- and will I look out of place.
--
-- No new policies needed. `events` already restricts insert, update and delete
-- to project stewards (migration 0007, widened to co-organizers in 0028), and
-- a column inherits the row's rules. Photos live in the existing public
-- `projects` storage bucket, uploaded client-side under the uploader's own id,
-- exactly like a project cover.
--
-- Idempotent.

alter table public.events
  add column if not exists photo_url text;

comment on column public.events.photo_url is
  'Optional cover photo, uploaded to the public projects bucket. Set by a project steward when planning the event.';
