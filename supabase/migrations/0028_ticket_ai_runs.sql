-- One-click AI investigations for tickets.
--
-- Runs are append-only enough to be auditable: the latest row says the current
-- state, and the step/artifact tables keep the case history the ticket card
-- renders for review.

create table if not exists ticket_ai_runs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  actor_id uuid references team_members(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'preview_pending', 'needs_human', 'failed')),
  branch_name text,
  branch_url text,
  commit_sha text,
  preview_url text,
  summary text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ticket_ai_runs_one_active_idx
  on ticket_ai_runs(ticket_id)
  where status in ('queued', 'running', 'preview_pending');

create index if not exists ticket_ai_runs_ticket_idx
  on ticket_ai_runs(ticket_id, created_at desc);

create table if not exists ticket_ai_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references ticket_ai_runs(id) on delete cascade,
  step_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_ai_steps_run_idx
  on ticket_ai_steps(run_id, created_at);

create table if not exists ticket_ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references ticket_ai_runs(id) on delete cascade,
  kind text not null
    check (kind in ('case_file', 'screenshot', 'diff', 'deployment', 'branch', 'test_output', 'note')),
  title text not null,
  url text,
  storage_path text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_ai_artifacts_run_idx
  on ticket_ai_artifacts(run_id, created_at);

alter table ticket_ai_runs enable row level security;
alter table ticket_ai_steps enable row level security;
alter table ticket_ai_artifacts enable row level security;

drop policy if exists "ai runs team read" on ticket_ai_runs;
create policy "ai runs team read" on ticket_ai_runs for select using (is_team());

drop policy if exists "ai runs staff write" on ticket_ai_runs;
create policy "ai runs staff write" on ticket_ai_runs
  for all using (is_staff()) with check (is_staff());

drop policy if exists "ai steps team read" on ticket_ai_steps;
create policy "ai steps team read" on ticket_ai_steps for select using (is_team());

drop policy if exists "ai steps staff write" on ticket_ai_steps;
create policy "ai steps staff write" on ticket_ai_steps
  for all using (is_staff()) with check (is_staff());

drop policy if exists "ai artifacts team read" on ticket_ai_artifacts;
create policy "ai artifacts team read" on ticket_ai_artifacts for select using (is_team());

drop policy if exists "ai artifacts staff write" on ticket_ai_artifacts;
create policy "ai artifacts staff write" on ticket_ai_artifacts
  for all using (is_staff()) with check (is_staff());
