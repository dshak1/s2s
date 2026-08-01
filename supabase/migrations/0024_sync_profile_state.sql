-- Write XP and progress through a function, not a direct anon UPDATE.
--
-- 0022 and 0023 re-asserted the "profiles anon update" policy and grant.
-- Neither fixed it: verified live, with `Prefer: count=exact`, that anon
-- UPDATE against `profiles` matches zero rows no matter which column is
-- touched, while the exact same statement run as postgres (SQL editor) or
-- via the service-role key over the same REST API succeeds immediately. The
-- policy, grant, and permissive/roles columns all read correctly in
-- pg_policies; a project restart wasn't available to rule out stuck internal
-- state (no Pro plan). Whatever it is lives below this app's migrations, so
-- work around it: SECURITY DEFINER functions bypass RLS entirely because they
-- run as their owner, not as anon, which is exactly why profile_recovery_code
-- and profile_state already work for the read side. This is the write side.

create or replace function sync_profile_state(
  p_profile_id uuid,
  p_display_name text,
  p_xp int,
  p_streak_weeks int,
  p_region_progress jsonb,
  p_vocab_correct jsonb,
  p_letter_stats jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name, xp, streak_weeks, region_progress, vocab_correct, letter_stats)
  values (p_profile_id, coalesce(nullif(p_display_name, ''), 'Kid'), p_xp, p_streak_weeks, p_region_progress, p_vocab_correct, p_letter_stats)
  on conflict (id) do update set
    display_name = excluded.display_name,
    xp = excluded.xp,
    streak_weeks = excluded.streak_weeks,
    region_progress = excluded.region_progress,
    vocab_correct = excluded.vocab_correct,
    letter_stats = excluded.letter_stats;
end;
$$;

grant execute on function sync_profile_state(uuid, text, int, int, jsonb, jsonb, jsonb) to anon, authenticated;
