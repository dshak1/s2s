-- Phase A: the ticket board becomes a workflow.
--
-- Six statuses collapse to a lifecycle plus a resolution, so "closed" always
-- says how. Reviews become a real object rather than a comment convention.
-- Every edit is recorded. Priority stops being jargon.

-- ---------------------------------------------------------------------------
-- A1. Lifecycle + resolution
-- ---------------------------------------------------------------------------

alter table tickets add column if not exists resolution text
  check (resolution in ('implemented', 'declined', 'duplicate', 'cant_reproduce'));

alter table tickets drop constraint if exists tickets_status_check;
alter table tickets drop constraint if exists tickets_decision_note_required;

update tickets set status = 'in_progress'                          where status = 'building';
update tickets set status = 'closed', resolution = 'implemented'   where status = 'done';
update tickets set status = 'closed', resolution = 'declined'      where status = 'declined';
update tickets set status = 'closed', resolution = 'duplicate'     where status = 'duplicate';

alter table tickets add constraint tickets_status_check
  check (status in ('inbox', 'planned', 'in_progress', 'needs_review', 'closed'));

-- Leaving the inbox still costs a written reason. That rule is the whole point
-- of the board and it survives the status rework.
alter table tickets add constraint tickets_decision_note_required check (
  status = 'inbox'
  or (decision_note is not null and length(btrim(decision_note)) >= 10)
);

-- A closed ticket has to say how it was closed.
alter table tickets drop constraint if exists tickets_closed_needs_resolution;
alter table tickets add constraint tickets_closed_needs_resolution
  check (status <> 'closed' or resolution is not null);

-- ---------------------------------------------------------------------------
-- A4. Urgency instead of P0/P1/P2
-- ---------------------------------------------------------------------------

alter table tickets add column if not exists urgent boolean not null default false;
update tickets set urgent = true where priority in ('p0', 'p1');
alter table tickets drop column if exists priority;

-- ---------------------------------------------------------------------------
-- A2. Reviews
-- ---------------------------------------------------------------------------

create table if not exists ticket_reviews (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  requested_by uuid references team_members(id) on delete set null,
  reviewer_id uuid references team_members(id) on delete set null,
  note text,
  requested_at timestamptz not null default now(),
  closed_by uuid references team_members(id) on delete set null,
  closed_at timestamptz,
  outcome text check (outcome in ('looks_good', 'needs_work', 'cancelled'))
);

create index if not exists ticket_reviews_open_idx
  on ticket_reviews (ticket_id) where closed_at is null;

-- ---------------------------------------------------------------------------
-- A3. Every edit is kept
-- ---------------------------------------------------------------------------

create table if not exists ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  actor_id uuid references team_members(id) on delete set null,
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists ticket_events_ticket_idx on ticket_events (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- A6. Likes on comments
-- ---------------------------------------------------------------------------

create table if not exists comment_likes (
  comment_id uuid not null references ticket_comments(id) on delete cascade,
  member_id uuid not null references team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

-- ---------------------------------------------------------------------------
-- RLS. Everyone on the team is trusted to edit; that was explicit.
-- ---------------------------------------------------------------------------

alter table ticket_reviews enable row level security;
alter table ticket_events enable row level security;
alter table comment_likes enable row level security;

drop policy if exists "reviews team read" on ticket_reviews;
create policy "reviews team read" on ticket_reviews for select using (is_team());

drop policy if exists "reviews team write" on ticket_reviews;
create policy "reviews team write" on ticket_reviews
  for all using (is_team()) with check (is_team());

drop policy if exists "events team read" on ticket_events;
create policy "events team read" on ticket_events for select using (is_team());

drop policy if exists "events team insert" on ticket_events;
create policy "events team insert" on ticket_events
  for insert with check (is_team() and actor_id = auth.uid());

drop policy if exists "likes team read" on comment_likes;
create policy "likes team read" on comment_likes for select using (is_team());

drop policy if exists "likes own write" on comment_likes;
create policy "likes own write" on comment_likes
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());
