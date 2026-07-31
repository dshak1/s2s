-- Homework submissions + widen the artifact kind check for newer kinds.

create table if not exists homework_items (
  id uuid primary key,
  profile_id uuid,
  student_name text not null default 'Kid',
  title text,
  note text,
  homework_date date,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table homework_items enable row level security;

create policy "homework select" on homework_items for select using (true);
create policy "homework insert" on homework_items for insert with check (true);
create policy "homework update" on homework_items for update using (true) with check (true);

-- 0001 only allowed tanba/canva/story; the app now also stores background and
-- homework artifacts.
alter table kid_artifacts drop constraint if exists kid_artifacts_kind_check;
alter table kid_artifacts add constraint kid_artifacts_kind_check
  check (kind in ('tanba', 'canva', 'story', 'background', 'homework'));
