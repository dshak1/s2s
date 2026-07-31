-- Team identity + RLS tightening.
--
-- Two populations use this database and they need opposite treatment:
--   * Kids are anonymous by design (no login, localStorage-first). They must be
--     able to WRITE their own gameplay rows with the anon key.
--   * The team (educators, native speakers, devs) signs in with a magic link and
--     is the only population allowed to READ across rows.
--
-- 0001_init.sql shipped `for all using (true)` on every gameplay table, which
-- means anyone holding the public anon key could read every kid's profile. This
-- migration replaces those with write-only anon access + team-only reads.

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------

create table if not exists team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Team member',
  role text not null default 'observer'
    check (role in ('admin', 'dev', 'educator', 'native_speaker', 'learner', 'observer')),
  created_at timestamptz not null default now()
);

create index if not exists team_members_role_idx on team_members (role);

alter table team_members enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so policies can call them without recursing into
-- team_members' own RLS.
-- ---------------------------------------------------------------------------

create or replace function current_team_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from team_members where id = auth.uid();
$$;

create or replace function is_team()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (select 1 from team_members where id = auth.uid());
$$;

-- Staff can make decisions on ideas and promote other members.
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from team_members where id = auth.uid() and role in ('admin', 'dev')
  );
$$;

-- Called from the auth callback after a successful magic-link sign-in.
-- Bootstrap rule: the very first person to sign in becomes admin; everyone
-- after that lands as 'observer' and an admin promotes them from /admin/team.
create or replace function ensure_team_member(p_display_name text default null)
returns team_members
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users;
  v_row team_members;
  v_role text;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from team_members where id = v_user.id;
  if v_row.id is not null then
    return v_row;
  end if;

  select case when count(*) = 0 then 'admin' else 'observer' end
    into v_role from team_members;

  insert into team_members (id, email, display_name, role)
  values (
    v_user.id,
    v_user.email,
    coalesce(nullif(p_display_name, ''), split_part(v_user.email, '@', 1)),
    v_role
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function ensure_team_member(text) to authenticated;
grant execute on function current_team_role() to authenticated, anon;
grant execute on function is_team() to authenticated, anon;
grant execute on function is_staff() to authenticated, anon;

-- team_members policies: everyone on the team can see the roster (needed for
-- attribution on ideas and labels); only staff can change roles.
drop policy if exists "team read roster" on team_members;
create policy "team read roster" on team_members
  for select using (is_team());

drop policy if exists "team update self" on team_members;
create policy "team update self" on team_members
  for update using (id = auth.uid()) with check (id = auth.uid() and role = current_team_role());

drop policy if exists "staff manage roster" on team_members;
create policy "staff manage roster" on team_members
  for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Tighten gameplay tables: anon writes, team reads.
-- ---------------------------------------------------------------------------

-- profiles — kids upsert their own row on join; nobody anonymous reads them.
drop policy if exists "profiles anon" on profiles;
drop policy if exists "profiles anon insert" on profiles;
create policy "profiles anon insert" on profiles for insert with check (true);
drop policy if exists "profiles anon update" on profiles;
create policy "profiles anon update" on profiles for update using (true) with check (true);
drop policy if exists "profiles team read" on profiles;
create policy "profiles team read" on profiles for select using (is_team());

-- sessions — a kid must resolve a session code to an id when joining, so SELECT
-- stays open. Creating and launching games is a facilitator (team) action.
drop policy if exists "sessions anon" on sessions;
drop policy if exists "sessions public read" on sessions;
create policy "sessions public read" on sessions for select using (true);
drop policy if exists "sessions team write" on sessions;
create policy "sessions team write" on sessions for all using (is_team()) with check (is_team());

-- attendance — kids write their own row; the live roster is a staff view.
drop policy if exists "attendance anon" on attendance;
drop policy if exists "attendance anon insert" on attendance;
create policy "attendance anon insert" on attendance for insert with check (true);
drop policy if exists "attendance anon update" on attendance;
create policy "attendance anon update" on attendance for update using (true) with check (true);
drop policy if exists "attendance team read" on attendance;
create policy "attendance team read" on attendance for select using (is_team());

-- game_runs
drop policy if exists "runs anon" on game_runs;
drop policy if exists "runs anon insert" on game_runs;
create policy "runs anon insert" on game_runs for insert with check (true);
drop policy if exists "runs anon update" on game_runs;
create policy "runs anon update" on game_runs for update using (true) with check (true);
drop policy if exists "runs team read" on game_runs;
create policy "runs team read" on game_runs for select using (is_team());

-- kid_artifacts
drop policy if exists "artifacts anon" on kid_artifacts;
drop policy if exists "artifacts anon insert" on kid_artifacts;
create policy "artifacts anon insert" on kid_artifacts for insert with check (true);
drop policy if exists "artifacts anon update" on kid_artifacts;
create policy "artifacts anon update" on kid_artifacts for update using (true) with check (true);
drop policy if exists "artifacts team read" on kid_artifacts;
create policy "artifacts team read" on kid_artifacts for select using (is_team());

-- profile_badges
drop policy if exists "pbadges anon" on profile_badges;
drop policy if exists "pbadges anon insert" on profile_badges;
create policy "pbadges anon insert" on profile_badges for insert with check (true);
drop policy if exists "pbadges anon update" on profile_badges;
create policy "pbadges anon update" on profile_badges for update using (true) with check (true);
drop policy if exists "pbadges team read" on profile_badges;
create policy "pbadges team read" on profile_badges for select using (is_team());

-- homework_items — 0004 left these fully open.
drop policy if exists "homework select" on homework_items;
drop policy if exists "homework insert" on homework_items;
drop policy if exists "homework update" on homework_items;
drop policy if exists "homework anon insert" on homework_items;
create policy "homework anon insert" on homework_items for insert with check (true);
drop policy if exists "homework anon update" on homework_items;
create policy "homework anon update" on homework_items for update using (true) with check (true);
drop policy if exists "homework team read" on homework_items;
create policy "homework team read" on homework_items for select using (is_team());

-- feedback_items — anyone can send feedback, only the team reads it.
drop policy if exists "feedback select" on feedback_items;
drop policy if exists "feedback team read" on feedback_items;
create policy "feedback team read" on feedback_items for select using (is_team());

-- wishlist_items stays publicly readable until 0008_triage.sql moves the board
-- behind team auth along with votes and comments.

-- ---------------------------------------------------------------------------
-- Storage: 0001 created the kid-art bucket but never granted anon the right to
-- upload into it, so syncArtifact/syncHomework silently swallowed every upload
-- (both helpers `return` on error). These are the missing policies.
-- ---------------------------------------------------------------------------

drop policy if exists "kid-art anon upload" on storage.objects;
create policy "kid-art anon upload" on storage.objects
  for insert with check (bucket_id = 'kid-art');

drop policy if exists "kid-art anon update" on storage.objects;
create policy "kid-art anon update" on storage.objects
  for update using (bucket_id = 'kid-art') with check (bucket_id = 'kid-art');

drop policy if exists "kid-art public read" on storage.objects;
create policy "kid-art public read" on storage.objects
  for select using (bucket_id = 'kid-art');
