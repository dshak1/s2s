-- Player accounts and kid-authored game kits.
--
-- The learner app stays anonymous and offline-first. An email is an optional
-- recovery method layered on top: a verified Supabase user can link one or
-- more learner profiles, then recover them on another device. The six-letter
-- player code remains the no-email path used in workshops.

alter table profiles
  add column if not exists custom_games jsonb not null default '[]'::jsonb,
  add column if not exists base_language text not null default 'en';

alter table profiles drop constraint if exists profiles_custom_games_array;
alter table profiles add constraint profiles_custom_games_array
  check (jsonb_typeof(custom_games) = 'array');

alter table profiles drop constraint if exists profiles_base_language_check;
alter table profiles add constraint profiles_base_language_check
  check (base_language in ('en', 'ru'));

create table if not exists player_profile_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create index if not exists player_profile_links_profile_idx
  on player_profile_links (profile_id);

alter table player_profile_links enable row level security;
revoke all on player_profile_links from anon, authenticated;

-- Linking requires a verified email session and the learner's recovery code.
-- The function never accepts a user id from the client.
create or replace function link_player_profile(
  p_profile_id uuid,
  p_recovery_code text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from profiles p
    where p.id = p_profile_id
      and p.recovery_code = upper(btrim(p_recovery_code))
  ) then
    raise exception 'invalid player code';
  end if;

  insert into player_profile_links (user_id, profile_id)
  values (auth.uid(), p_profile_id)
  on conflict (user_id, profile_id) do nothing;
end;
$$;

create or replace function my_player_profiles()
returns table (
  id uuid,
  display_name text,
  xp int,
  recovery_code text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.display_name, p.xp, p.recovery_code
  from player_profile_links l
  join profiles p on p.id = l.profile_id
  where l.user_id = auth.uid()
  order by l.linked_at desc;
$$;

revoke all on function link_player_profile(uuid, text) from public, anon;
revoke all on function my_player_profiles() from public, anon;
grant execute on function link_player_profile(uuid, text) to authenticated;
grant execute on function my_player_profiles() to authenticated;

-- Carry the small custom-game definitions across devices. Background images
-- stay in kid-art and are referenced by artifact id rather than embedded in
-- this JSON column.
drop function if exists profile_state(uuid);
create function profile_state(p_profile_id uuid)
returns table (
  display_name text,
  xp int,
  region_progress jsonb,
  vocab_correct jsonb,
  letter_stats jsonb,
  home_cover_id text,
  custom_games jsonb,
  base_language text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.display_name,
    p.xp,
    p.region_progress,
    p.vocab_correct,
    p.letter_stats,
    p.home_cover_id,
    p.custom_games,
    p.base_language
  from profiles p
  where p.id = p_profile_id;
$$;

grant execute on function profile_state(uuid) to anon, authenticated;

drop function if exists sync_profile_state(uuid, text, int, int, jsonb, jsonb, jsonb, text);
create function sync_profile_state(
  p_profile_id uuid,
  p_display_name text,
  p_xp int,
  p_streak_weeks int,
  p_region_progress jsonb,
  p_vocab_correct jsonb,
  p_letter_stats jsonb,
  p_home_cover_id text default null,
  p_custom_games jsonb default null,
  p_base_language text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (
    id,
    display_name,
    xp,
    streak_weeks,
    region_progress,
    vocab_correct,
    letter_stats,
    home_cover_id,
    custom_games,
    base_language
  )
  values (
    p_profile_id,
    coalesce(nullif(p_display_name, ''), 'Kid'),
    p_xp,
    p_streak_weeks,
    p_region_progress,
    p_vocab_correct,
    p_letter_stats,
    p_home_cover_id,
    coalesce(p_custom_games, '[]'::jsonb),
    coalesce(p_base_language, 'en')
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    xp = excluded.xp,
    streak_weeks = excluded.streak_weeks,
    region_progress = excluded.region_progress,
    vocab_correct = excluded.vocab_correct,
    letter_stats = excluded.letter_stats,
    home_cover_id = coalesce(excluded.home_cover_id, profiles.home_cover_id),
    custom_games = coalesce(p_custom_games, profiles.custom_games),
    base_language = coalesce(p_base_language, profiles.base_language);
end;
$$;

grant execute on function sync_profile_state(
  uuid, text, int, int, jsonb, jsonb, jsonb, text, jsonb, text
) to anon, authenticated;
