-- Steppe to Screen — initial schema.
-- Mirrors the client-side store shape so the app can move from localStorage to
-- a real backend by setting the Supabase env vars and running these migrations.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Kid',
  parent_email text,
  avatar_artifact_id uuid,
  xp int not null default 0,
  streak_weeks int not null default 1,
  region_progress jsonb not null default '["almaty"]'::jsonb,
  vocab_correct jsonb not null default '{}'::jsonb,
  letter_stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  facilitator text,
  active boolean not null default true,
  current_region text,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  table_no text,
  paw_prints int not null default 0,
  joined_at timestamptz not null default now(),
  unique (session_id, profile_id)
);

create table if not exists vocab (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kk text not null,
  latin text not null,
  en text not null,
  category text not null
);

create table if not exists badges (
  id text primary key,
  name text not null,
  kk text not null,
  symbol text not null,
  hint text not null
);

create table if not exists profile_badges (
  profile_id uuid references profiles(id) on delete cascade,
  badge_id text references badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

create table if not exists kid_artifacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  kind text not null check (kind in ('tanba', 'canva', 'story')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists game_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  game text not null,
  score int not null default 0,
  vocab_seen text[] not null default '{}',
  vocab_correct text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Realtime for the facilitator live view.
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table game_runs;

-- Row Level Security. Demo-friendly: anon can read/write its own rows.
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table attendance enable row level security;
alter table kid_artifacts enable row level security;
alter table game_runs enable row level security;
alter table profile_badges enable row level security;
alter table vocab enable row level security;
alter table badges enable row level security;

-- Public reference data is readable by everyone.
create policy "vocab readable" on vocab for select using (true);
create policy "badges readable" on badges for select using (true);

-- For the in-person workshop demo we allow anon full access to gameplay tables.
-- Tighten these before any public launch with parent-confirmed accounts.
create policy "profiles anon" on profiles for all using (true) with check (true);
create policy "sessions anon" on sessions for all using (true) with check (true);
create policy "attendance anon" on attendance for all using (true) with check (true);
create policy "artifacts anon" on kid_artifacts for all using (true) with check (true);
create policy "runs anon" on game_runs for all using (true) with check (true);
create policy "pbadges anon" on profile_badges for all using (true) with check (true);

-- Storage bucket for kid art (tańba, canva imports, story comics).
insert into storage.buckets (id, name, public)
values ('kid-art', 'kid-art', true)
on conflict (id) do nothing;
