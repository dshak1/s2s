-- Re-assert the anon update policy on `profiles`.
--
-- 0005_identity.sql declared `for update using (true) with check (true)`, and
-- docs/security.md documents this as a known, accepted gap (an anonymous kid
-- has no identity to scope an update to, so "using (true)" is the only option;
-- the id itself is the only protection). Checked directly against the live
-- project while building 0021: inserts into `profiles` succeed, but updates
-- silently affect zero rows, which means xp and progress written after a
-- profile's first save never actually persist. Whatever caused the live
-- policy to stop matching the migration (a manual dashboard change is the
-- likely culprit, not anything in this repo's history), this puts it back.

drop policy if exists "profiles anon update" on profiles;
create policy "profiles anon update" on profiles for update using (true) with check (true);
