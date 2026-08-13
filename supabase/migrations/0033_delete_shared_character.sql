-- Lets a kid delete a character they shared (not anyone else's) straight
-- from the gallery. Same security-definer + profile_id-scoped pattern as
-- delete_kid_artifact/delete_homework_item in 0031 — anon DELETE against a
-- matching RLS policy hits the same live drift those worked around.
create or replace function delete_shared_character(
  p_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from shared_characters where id = p_id and profile_id = p_profile_id;
end;
$$;

grant execute on function delete_shared_character(uuid, uuid) to anon, authenticated;
