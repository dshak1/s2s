-- content_items only has "items team read" (is_team()) — an anonymous kid
-- has no team_members row, so an anon select on content_items returns zero
-- rows, not an error. Instructor-added vocab (content_items, kind='vocab',
-- source='human') needs to reach the anonymous, localStorage-only game
-- clients, same as any other kid-facing read in this app (see the
-- "using (true)" policies on homework_items, wishlist_items, feedback_items,
-- sessions, and the old vocab table in 0001_init.sql).
--
-- Scoped to status = 'live' so drafts/retired items stay staff-only via the
-- existing is_team() policy.

drop policy if exists "items public read" on content_items;
create policy "items public read" on content_items for select using (status = 'live');
