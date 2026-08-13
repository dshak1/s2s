-- Shared character gallery for Nomad Run (and the avatar studio). A kid can
-- draw/upload a runner and share it; other kids can browse the gallery and
-- pick someone else's character to play as, or a staff-seeded one (Canva
-- exports, background already stripped, so kids don't need to know how).
--
-- Kid submissions go in as 'pending' — a public, unmoderated image-upload
-- gallery is a real content-safety problem on a kids' product, so nothing
-- reaches the public gallery without a staff approve first. Staff-seeded
-- rows go straight to 'live' since a staff member is uploading them directly.
create table if not exists shared_characters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null, -- null for staff-seeded rows
  display_name text not null default 'A kid',
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'live', 'declined')),
  source text not null default 'kid' check (source in ('kid', 'staff')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references team_members(id) on delete set null
);

create index if not exists shared_characters_status_idx on shared_characters (status, created_at desc);

alter table shared_characters enable row level security;

-- Public gallery: anyone (including anon kids) can see live rows only.
drop policy if exists "characters public read" on shared_characters;
create policy "characters public read" on shared_characters
  for select using (status = 'live');

-- Staff can see/manage everything (the pending queue, approve/decline, seed
-- new ones) — same shape as content_items' "items staff write".
drop policy if exists "characters staff manage" on shared_characters;
create policy "characters staff manage" on shared_characters
  for all using (is_staff()) with check (is_staff());

-- A direct anon insert here would hit the same live RLS drift documented in
-- 0026_sync_kid_artifacts.sql (anon inserts against a matching policy were
-- rejected with 42501 despite the policy allowing it) — routed through a
-- SECURITY DEFINER function instead, same fix as that migration.
create or replace function share_character(
  p_id uuid,
  p_profile_id uuid,
  p_display_name text,
  p_storage_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into shared_characters (id, profile_id, display_name, storage_path, status, source)
  values (p_id, p_profile_id, coalesce(nullif(p_display_name, ''), 'A kid'), p_storage_path, 'pending', 'kid')
  on conflict (id) do nothing;
end;
$$;

grant execute on function share_character(uuid, uuid, text, text) to anon, authenticated;
