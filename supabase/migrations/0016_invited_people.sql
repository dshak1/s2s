-- The team roster, so approving someone is recognising a name rather than
-- guessing at an address.
--
-- Schema only. The actual people are loaded straight into the database and are
-- deliberately NOT in this file: it is committed to a public repo, and these are
-- real phone numbers belonging to real people.
--
-- Note the gap this cannot close on its own. Sign-in is a magic link, so the
-- only thing we can match a new account against is its email. A phone number
-- cannot gate an email signup. Rows with a phone and no email are a reference
-- list for whoever is approving; rows with an email auto-approve.

create table if not exists invited_people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique,
  phone text,
  intended_role text not null default 'member'
    check (intended_role in ('member', 'admin')),
  expertise text check (expertise in ('native_speaker', 'educator', 'learner', 'other')),
  note text,
  invited_by uuid references team_members(id) on delete set null,
  claimed_by uuid references team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invited_people_email_idx on invited_people (lower(email));

alter table invited_people enable row level security;

-- Admin only. This table holds personal contact details of people who have not
-- signed up yet and never agreed to be visible to the whole team.
drop policy if exists "invited admin only" on invited_people;
create policy "invited admin only" on invited_people
  for all using (is_staff()) with check (is_staff());

-- Auto-approve a signup whose email is on the list, at the role it was invited
-- at, skipping the pending queue. Anyone else still waits for a human.
create or replace function ensure_team_member(p_display_name text default null)
returns team_members
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users;
  v_row team_members;
  v_invite invited_people;
  v_role text;
  v_expertise text;
  v_name text;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from team_members where id = v_user.id;
  if v_row.id is not null then
    return v_row;
  end if;

  select * into v_invite from invited_people
   where lower(email) = lower(v_user.email) and claimed_by is null;

  if (select count(*) from team_members) = 0 then
    -- Bootstrap: the very first account is always the admin.
    v_role := 'admin';
    v_expertise := 'other';
    v_name := coalesce(nullif(p_display_name, ''), split_part(v_user.email, '@', 1));
  elsif v_invite.id is not null then
    v_role := v_invite.intended_role;
    v_expertise := coalesce(v_invite.expertise, 'other');
    v_name := coalesce(nullif(p_display_name, ''), v_invite.display_name);
  else
    v_role := 'pending';
    v_expertise := 'other';
    v_name := coalesce(nullif(p_display_name, ''), split_part(v_user.email, '@', 1));
  end if;

  insert into team_members (id, email, display_name, role, expertise)
  values (v_user.id, v_user.email, v_name, v_role, v_expertise)
  returning * into v_row;

  if v_invite.id is not null then
    update invited_people set claimed_by = v_row.id where id = v_invite.id;
  end if;

  return v_row;
end;
$$;

revoke execute on function ensure_team_member(text) from public, anon;
grant execute on function ensure_team_member(text) to authenticated;
