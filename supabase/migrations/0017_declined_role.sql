-- Approving someone needed an opposite.
--
-- Deleting the team_members row would work once, then they sign in again and
-- reappear in the queue forever. 'declined' is a real state: no access, and it
-- stays on the roster so nobody has to re-decide every week.
--
-- is_team() already only accepts 'member' and 'admin', so declined accounts get
-- nothing without any policy change.

alter table team_members drop constraint if exists team_members_role_check;
alter table team_members add constraint team_members_role_check
  check (role in ('pending', 'declined', 'member', 'admin'));
