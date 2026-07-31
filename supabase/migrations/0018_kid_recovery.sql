-- Kids get their work back.
--
-- Two faults kept every drawing and every homework photo trapped on one
-- browser. The write path was fixed in 0005 (the kid-art bucket had no insert
-- policy, so uploads failed and sync silently returned). This migration fixes
-- the other half: nothing was ever read back, and a kid had no way to be the
-- same kid on a second device.
--
-- Reads are SECURITY DEFINER functions keyed on the profile id rather than new
-- RLS policies, because an anonymous kid has no identity for a policy to match
-- on. Knowing the profile id is the credential. Ids are v4 UUIDs generated on
-- the device and never listed anywhere, so this is the same trust level as the
-- recovery code below, and it is a deliberate trade against the zero-login
-- promise.

alter table profiles add column if not exists recovery_code text unique;

create index if not exists profiles_recovery_code_idx on profiles (recovery_code);

-- Six characters, no O/0/I/1, so a seven year old can read it off a screen and
-- type it on a tablet without help.
create or replace function generate_recovery_code()
returns text
language plpgsql
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_taken boolean;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    select exists (select 1 from profiles where recovery_code = v_code) into v_taken;
    exit when not v_taken;
  end loop;
  return v_code;
end;
$$;

-- Hand back this profile's code, creating both the row and the code if needed.
-- Upserts the profile so a kid who has only ever played offline still gets one.
create or replace function profile_recovery_code(
  p_profile_id uuid,
  p_display_name text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  insert into profiles (id, display_name)
  values (p_profile_id, coalesce(nullif(p_display_name, ''), 'Kid'))
  on conflict (id) do nothing;

  select recovery_code into v_code from profiles where id = p_profile_id;

  if v_code is null then
    v_code := generate_recovery_code();
    update profiles set recovery_code = v_code where id = p_profile_id;
  end if;

  return v_code;
end;
$$;

create or replace function claim_profile(p_code text)
returns table (id uuid, display_name text, xp int)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.xp
  from profiles p
  where p.recovery_code = upper(btrim(p_code));
$$;

-- Everything this profile has made, with the storage path the client turns into
-- a public URL.
create or replace function profile_artifacts(p_profile_id uuid)
returns table (id uuid, kind text, storage_path text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.kind, a.storage_path, a.created_at
  from kid_artifacts a
  where a.profile_id = p_profile_id
  order by a.created_at desc
  limit 200;
$$;

create or replace function profile_homework(p_profile_id uuid)
returns table (
  id uuid,
  title text,
  note text,
  homework_date date,
  storage_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.title, h.note, h.homework_date, h.storage_path, h.created_at
  from homework_items h
  where h.profile_id = p_profile_id
  order by h.created_at desc
  limit 200;
$$;

grant execute on function profile_recovery_code(uuid, text) to anon, authenticated;
grant execute on function claim_profile(text) to anon, authenticated;
grant execute on function profile_artifacts(uuid) to anon, authenticated;
grant execute on function profile_homework(uuid) to anon, authenticated;
revoke execute on function generate_recovery_code() from public, anon;
