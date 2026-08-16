-- Peoplearound — 0037 when does this happen
--
-- "I'd like to find walking buddies" is not answerable until someone says
-- *when*. The single most common reason a joinable idea gathers nobody is
-- that a neighbor can't tell whether it fits their week — the playbooks
-- already say a vague ask is the top failure mode (FEATURE_IDEAS #11).
--
-- This is deliberately free text, not a timestamp, and deliberately on
-- `projects` rather than `events`:
--   • An event is a specific occasion with RSVPs. "Saturday mornings" is a
--     rhythm — the thing you agree on before there's an event to schedule.
--   • Software should not force "every Saturday 9am" out of someone who
--     means "weekend mornings, roughly". Two neighbors settle the detail;
--     the field just has to make the idea answerable.
-- Idempotent.

alter table public.projects
  add column if not exists when_text text
    check (when_text is null or char_length(when_text) <= 80);
