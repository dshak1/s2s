-- Sync XP and progress across devices, not just artifacts.
--
-- hydrateFromServer only ever merged drawings and homework photos. XP, region
-- progress, vocab mastery and letter stats have lived in `profiles` since
-- 0001, but nothing ever read them back, so a kid who unlocked a region on one
-- device did not see it unlock on another until they re-earned it there too.
--
-- Reads go through a SECURITY DEFINER function for the same reason as 0018:
-- an anonymous kid has no identity a policy could match on, so the profile id
-- is the credential.

create or replace function profile_state(p_profile_id uuid)
returns table (
  display_name text,
  xp int,
  region_progress jsonb,
  vocab_correct jsonb,
  letter_stats jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select p.display_name, p.xp, p.region_progress, p.vocab_correct, p.letter_stats
  from profiles p
  where p.id = p_profile_id;
$$;

grant execute on function profile_state(uuid) to anon, authenticated;
