-- Content items + learning events.
--
-- Until now a "question" only existed at render time: the games assembled one
-- from src/content/vocab.ts and friends, scored it, and threw it away. That
-- leaves nothing to attach a quality label or a difficulty score to.
--
-- content_items gives every question a stable, human-readable id
-- ('vocab:ake:v1'). Ids are DERIVED, not generated, so the client can compute
-- one offline with no round trip — see src/lib/items.ts.

create table if not exists content_items (
  id text primary key,                       -- '<kind>:<ref_slug>:v<version>'
  item_key text not null,                    -- '<kind>:<ref_slug>', stable across versions
  version int not null default 1,
  kind text not null
    check (kind in ('vocab', 'letter', 'greeting', 'phrase', 'place', 'generated')),
  ref_slug text not null,
  game_slug text,                            -- null when the item is reused across games
  payload jsonb not null default '{}'::jsonb,
  locale text not null default 'kk',
  source text not null default 'seed' check (source in ('seed', 'ai', 'human')),
  status text not null default 'live' check (status in ('draft', 'live', 'retired')),
  created_by uuid references team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (item_key, version)
);

create index if not exists content_items_kind_idx on content_items (kind);
create index if not exists content_items_status_idx on content_items (status);
create index if not exists content_items_key_idx on content_items (item_key);

-- ---------------------------------------------------------------------------
-- learning_events — one row per question answered, by anyone, ever.
--
-- Deliberately NO foreign key on item_id: telemetry must never fail a write
-- because content drifted ahead of the items table. Orphan ids are visible in
-- the coverage panel and are a signal worth seeing, not an error worth losing
-- the event over.
-- ---------------------------------------------------------------------------

create table if not exists learning_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  session_id uuid references sessions(id) on delete set null,
  game_slug text not null,
  item_id text,
  prompt_kind text check (prompt_kind in ('audio', 'text', 'image', 'map')),
  response text,
  is_correct boolean,
  latency_ms int,
  attempt_index int not null default 1,
  hint_used boolean not null default false,
  audio_plays int not null default 0,
  client_ts timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_item_idx on learning_events (item_id);
create index if not exists learning_events_profile_idx on learning_events (profile_id, created_at desc);
create index if not exists learning_events_game_idx on learning_events (game_slug, created_at desc);
create index if not exists learning_events_created_idx on learning_events (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — same shape as 0005: anon writes, team reads.
-- ---------------------------------------------------------------------------

alter table content_items enable row level security;
alter table learning_events enable row level security;

drop policy if exists "items team read" on content_items;
create policy "items team read" on content_items for select using (is_team());

drop policy if exists "items staff write" on content_items;
create policy "items staff write" on content_items
  for all using (is_staff()) with check (is_staff());

drop policy if exists "events anon insert" on learning_events;
create policy "events anon insert" on learning_events for insert with check (true);

drop policy if exists "events team read" on learning_events;
create policy "events team read" on learning_events for select using (is_team());
