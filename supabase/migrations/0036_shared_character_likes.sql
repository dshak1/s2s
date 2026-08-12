-- Likes on the shared character gallery (0032_shared_characters.sql) so kids
-- can tell each other's favorites apart, and a "Popular" section can surface
-- the most-liked ones. like_count is denormalized onto shared_characters
-- (kept in sync by toggle_character_like below) instead of a live count()
-- join — the gallery list is read far more often than characters are liked.
alter table shared_characters add column if not exists like_count integer not null default 0;

create table if not exists shared_character_likes (
  character_id uuid not null references shared_characters(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (character_id, profile_id)
);

alter table shared_character_likes enable row level security;

-- Same anon-insert RLS drift as shared_characters (0032/0033) — reads and
-- writes both go through SECURITY DEFINER functions below, so the only
-- direct-table policy needed is staff moderation access.
drop policy if exists "character likes staff manage" on shared_character_likes;
create policy "character likes staff manage" on shared_character_likes
  for all using (is_staff()) with check (is_staff());

-- Toggles a like for (character, profile) and keeps like_count in step.
-- Returns the new liked state so the client can flip its heart icon off
-- the response instead of re-fetching.
create or replace function toggle_character_like(
  p_character_id uuid,
  p_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  already_liked boolean;
begin
  select exists(
    select 1 from shared_character_likes
    where character_id = p_character_id and profile_id = p_profile_id
  ) into already_liked;

  if already_liked then
    delete from shared_character_likes
      where character_id = p_character_id and profile_id = p_profile_id;
    update shared_characters set like_count = greatest(0, like_count - 1) where id = p_character_id;
    return false;
  else
    insert into shared_character_likes (character_id, profile_id)
    values (p_character_id, p_profile_id)
    on conflict do nothing;
    update shared_characters set like_count = like_count + 1 where id = p_character_id;
    return true;
  end if;
end;
$$;

grant execute on function toggle_character_like(uuid, uuid) to anon, authenticated;

-- Which of a batch of characters this profile has already liked, so the
-- gallery can render filled vs. outline hearts on first load. A plain
-- select can't do this for anon kid profiles (no auth.uid() session to key
-- an RLS policy on), so it's a SECURITY DEFINER read same as the writes.
create or replace function liked_character_ids(
  p_profile_id uuid,
  p_character_ids uuid[]
)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select character_id from shared_character_likes
  where profile_id = p_profile_id and character_id = any(p_character_ids);
$$;

grant execute on function liked_character_ids(uuid, uuid[]) to anon, authenticated;
