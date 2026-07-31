-- Collapse six roles into three permission states, and move expertise to where
-- it belongs.
--
-- 0005 shipped admin/dev/educator/native_speaker/learner/observer. Only two of
-- those meant anything: admin and dev were staff, the other four were byte-for-
-- byte identical in every policy. Six names, two permission levels — noise.
--
-- Now: pending -> member -> admin. Admins approve people and decide tickets.
-- Members do everything else. That's the whole model.
--
-- Expertise becomes a separate descriptive column that grants nothing. It stays
-- because "this rating came from a native speaker" is the entire basis of RQ3 —
-- an LLM matching a human EXPERT panel is meaningless if you can't say who the
-- experts were. Access and attribution are different questions.

alter table team_members add column if not exists expertise text
  check (expertise in ('native_speaker', 'educator', 'learner', 'other'));

-- Fold the old roles down before tightening the constraint.
alter table team_members drop constraint if exists team_members_role_check;

update team_members set expertise = coalesce(expertise, role)
  where role in ('native_speaker', 'educator', 'learner');

update team_members set role = 'admin'  where role = 'dev';
update team_members set role = 'member' where role in ('educator', 'native_speaker', 'learner', 'observer');
update team_members set expertise = coalesce(expertise, 'other');

alter table team_members add constraint team_members_role_check
  check (role in ('pending', 'member', 'admin'));

alter table team_members alter column role set default 'pending';

create or replace function is_team()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from team_members
    where id = auth.uid() and role in ('member', 'admin')
  );
$$;

-- Approving people and deciding tickets is admin-only. There is no second tier
-- that can quietly do it.
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from team_members where id = auth.uid() and role = 'admin'
  );
$$;

-- Members may edit their own display name and expertise, never their own role.
drop policy if exists "team update self" on team_members;
create policy "team update self" on team_members
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = current_team_role());
