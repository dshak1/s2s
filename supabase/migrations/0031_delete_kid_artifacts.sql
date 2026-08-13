-- deleteArtifact() in store.ts only ever removed the local copy. The server
-- row from sync_kid_artifact/sync_homework_item stayed put, so the next
-- hydrateFromServer() (every mount) saw it as "missing locally" and added it
-- straight back — a homework photo a kid deleted would silently reappear.
--
-- Same security-definer pattern as 0026: bypasses RLS as owner, but scopes
-- the delete to the given profile_id so one kid can't delete another's row.
create or replace function delete_kid_artifact(
  p_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from kid_artifacts where id = p_id and profile_id = p_profile_id;
end;
$$;

grant execute on function delete_kid_artifact(uuid, uuid) to anon, authenticated;

create or replace function delete_homework_item(
  p_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from homework_items where id = p_id and profile_id = p_profile_id;
end;
$$;

grant execute on function delete_homework_item(uuid, uuid) to anon, authenticated;
