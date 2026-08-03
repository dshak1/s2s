-- XP only ever reached the server via joinSession, once, at the start of a
-- session. Everything earned after that (region unlocks, vocab mastery,
-- letter mastery, and now the home background choice) stayed local-only
-- until a kid rejoined, which most never do mid-play. A recovery code on a
-- second device then pulled whatever the server had from that one join, not
-- what the kid actually has now. This adds home_cover_id (never synced at
-- all, not even a column) and widens profile_state / sync_profile_state to
-- carry it, so the app can sync continuously rather than only at join time
-- (see the scheduleServerSync debounce in src/lib/store.ts).

alter table profiles add column if not exists home_cover_id text;

drop function if exists profile_state(uuid);
create function profile_state(p_profile_id uuid)
returns table (
  display_name text,
  xp int,
  region_progress jsonb,
  vocab_correct jsonb,
  letter_stats jsonb,
  home_cover_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.display_name, p.xp, p.region_progress, p.vocab_correct, p.letter_stats, p.home_cover_id
  from profiles p
  where p.id = p_profile_id;
$$;

grant execute on function profile_state(uuid) to anon, authenticated;

drop function if exists sync_profile_state(uuid, text, int, int, jsonb, jsonb, jsonb);
create function sync_profile_state(
  p_profile_id uuid,
  p_display_name text,
  p_xp int,
  p_streak_weeks int,
  p_region_progress jsonb,
  p_vocab_correct jsonb,
  p_letter_stats jsonb,
  p_home_cover_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name, xp, streak_weeks, region_progress, vocab_correct, letter_stats, home_cover_id)
  values (p_profile_id, coalesce(nullif(p_display_name, ''), 'Kid'), p_xp, p_streak_weeks, p_region_progress, p_vocab_correct, p_letter_stats, p_home_cover_id)
  on conflict (id) do update set
    display_name = excluded.display_name,
    xp = excluded.xp,
    streak_weeks = excluded.streak_weeks,
    region_progress = excluded.region_progress,
    vocab_correct = excluded.vocab_correct,
    letter_stats = excluded.letter_stats,
    home_cover_id = coalesce(excluded.home_cover_id, profiles.home_cover_id);
end;
$$;

grant execute on function sync_profile_state(uuid, text, int, int, jsonb, jsonb, jsonb, text) to anon, authenticated;
