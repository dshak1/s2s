-- Close the open-signup hole.
--
-- signInWithOtp creates a user for any email address that asks. As shipped in
-- 0005 that meant anyone on the internet could request a link, land as
-- 'observer', and read the dashboard — which is learner data. The magic link
-- proves you own an inbox, not that you are on this team.
--
-- New accounts now land as 'pending' and can see nothing until an admin
-- promotes them at /admin/team. The first account ever created is still the
-- admin, so bootstrapping is unchanged.

alter table team_members drop constraint if exists team_members_role_check;
alter table team_members add constraint team_members_role_check
  check (role in ('pending', 'admin', 'dev', 'educator', 'native_speaker', 'learner', 'observer'));

create or replace function is_team()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from team_members
    where id = auth.uid() and role <> 'pending'
  );
$$;

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

  -- First account ever = admin. Everyone after waits for approval.
  select case when count(*) = 0 then 'admin' else 'pending' end
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

-- A pending user has to be able to read their own row, or the app can't tell
-- "waiting for approval" apart from "not signed in".
drop policy if exists "read own team row" on team_members;
create policy "read own team row" on team_members
  for select using (id = auth.uid());

revoke execute on function ensure_team_member(text) from public, anon;
grant execute on function ensure_team_member(text) to authenticated;
