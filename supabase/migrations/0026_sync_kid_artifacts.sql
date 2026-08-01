-- Drawings and homework have never actually reached the server.
--
-- Checked live: kid_artifacts and homework_items are both completely empty,
-- for every profile, since the beginning of this project. 0005_identity.sql
-- declares `for insert with check (true)` on both tables, matching the
-- pattern that already works for profiles/feedback_items/game_runs, but a
-- direct anon INSERT against either table is rejected outright with 42501
-- ("new row violates row-level security policy"), live, right now. The
-- storage upload itself succeeds; only the row that records it fails. That
-- silent failure is exactly what 0018's own comment claimed was already
-- fixed by 0005 and it was not, so every "get your drawings and homework
-- back" promise since then has been backed by nothing.
--
-- Same fix as 0024/0025: route the write through a SECURITY DEFINER
-- function, which bypasses whatever is blocking the direct path by running
-- as its owner rather than anon.

-- p_is_avatar also sets profiles.avatar_artifact_id in the same call: that
-- was a raw anon UPDATE on profiles, which hits the exact drift 0024 already
-- worked around, so it never persisted either.
create or replace function sync_kid_artifact(
  p_id uuid,
  p_profile_id uuid,
  p_kind text,
  p_storage_path text,
  p_is_avatar boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into kid_artifacts (id, profile_id, kind, storage_path)
  values (p_id, p_profile_id, p_kind, p_storage_path)
  on conflict (id) do update set
    kind = excluded.kind,
    storage_path = excluded.storage_path;

  if p_is_avatar then
    update profiles set avatar_artifact_id = p_id where id = p_profile_id;
  end if;
end;
$$;

grant execute on function sync_kid_artifact(uuid, uuid, text, text, boolean) to anon, authenticated;

create or replace function sync_homework_item(
  p_id uuid,
  p_profile_id uuid,
  p_student_name text,
  p_title text,
  p_note text,
  p_homework_date date,
  p_storage_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into homework_items (id, profile_id, student_name, title, note, homework_date, storage_path)
  values (p_id, p_profile_id, coalesce(nullif(p_student_name, ''), 'Kid'), p_title, p_note, p_homework_date, p_storage_path)
  on conflict (id) do update set
    student_name = excluded.student_name,
    title = excluded.title,
    note = excluded.note,
    homework_date = excluded.homework_date,
    storage_path = excluded.storage_path;
end;
$$;

grant execute on function sync_homework_item(uuid, uuid, text, text, text, date, text) to anon, authenticated;
