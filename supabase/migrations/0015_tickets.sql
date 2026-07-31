-- Ideas become tickets.
--
-- The wishlist was a single flat list of "features someone wants". Real intake
-- has shapes: something is broken, something should change, or a specific
-- question in the app is wrong. Only three types — a game bug is a bug with a
-- game attached, not its own species.
--
--   bug       something in the app is broken
--   request   change request / feature (deliberately the same thing)
--   question  a specific content item is wrong: bad answer, bad audio,
--             confusing wording, culturally off
--
-- A 'question' ticket carries the content_items id, so flagging a bad question
-- from anywhere in the app lands on the same object the labelling queue and the
-- item analytics already talk about.

create sequence if not exists tickets_ref_seq;

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null default ('S2S-' || nextval('tickets_ref_seq')),
  type text not null check (type in ('bug', 'request', 'question')),
  title text not null,
  body text,
  status text not null default 'inbox'
    check (status in ('inbox', 'planned', 'building', 'done', 'declined', 'duplicate')),
  priority text not null default 'p2' check (priority in ('p0', 'p1', 'p2', 'p3')),

  author_id uuid references team_members(id) on delete set null,
  assignee_id uuid references team_members(id) on delete set null,

  -- Scope. A bug can name the game it happened in; a question names the item.
  game_slug text,
  item_id text,
  problem text check (problem in (
    'wrong_answer', 'bad_audio', 'poor_question', 'unclear',
    'culturally_wrong', 'too_hard', 'too_easy', 'other'
  )),

  -- The response loop, unchanged in spirit: leaving the inbox costs a reason.
  decision_note text,
  decided_by uuid references team_members(id) on delete set null,
  decided_at timestamptz,

  preview_url text,
  linear_issue_id text,
  linear_issue_url text,

  votes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tickets_decision_note_required check (
    status = 'inbox'
    or (decision_note is not null and length(btrim(decision_note)) >= 10)
  ),
  constraint tickets_question_needs_item check (type <> 'question' or item_id is not null)
);

create index if not exists tickets_status_idx on tickets (status, priority);
create index if not exists tickets_type_idx on tickets (type);
create index if not exists tickets_item_idx on tickets (item_id);

-- Carry the existing wishlist over, ids intact so votes and comments survive.
insert into tickets (id, ref, type, title, body, status, priority, author_id,
                     decision_note, decided_by, decided_at, preview_url,
                     linear_issue_id, linear_issue_url, votes, created_at)
select
  w.id,
  'S2S-' || nextval('tickets_ref_seq'),
  case when w.category = 'bug' then 'bug' else 'request' end,
  w.title,
  w.description,
  case w.status
    when 'idea' then 'inbox'
    when 'planned' then 'planned'
    when 'building' then 'building'
    when 'shipped' then 'done'
    when 'wont-do' then 'declined'
    else 'inbox'
  end,
  case w.priority when 'p1' then 'p1' when 'p3' then 'p3' else 'p2' end,
  w.author_id,
  w.decision_note, w.decided_by, w.decided_at, w.preview_url,
  w.linear_issue_id, w.linear_issue_url, w.votes, w.created_at
from wishlist_items w
on conflict (id) do nothing;

comment on table wishlist_items is
  'ARCHIVED — superseded by tickets in 0015. Kept for recovery; no app code reads it.';

-- Repoint votes / comments / attachments at tickets and rename to match.
alter table idea_votes drop constraint if exists idea_votes_idea_id_fkey;
alter table idea_comments drop constraint if exists idea_comments_idea_id_fkey;
alter table idea_attachments drop constraint if exists idea_attachments_idea_id_fkey;

alter table idea_votes rename column idea_id to ticket_id;
alter table idea_comments rename column idea_id to ticket_id;
alter table idea_attachments rename column idea_id to ticket_id;

alter table idea_votes rename to ticket_votes;
alter table idea_comments rename to ticket_comments;
alter table idea_attachments rename to ticket_attachments;

alter table ticket_votes add constraint ticket_votes_ticket_id_fkey
  foreign key (ticket_id) references tickets(id) on delete cascade;
alter table ticket_comments add constraint ticket_comments_ticket_id_fkey
  foreign key (ticket_id) references tickets(id) on delete cascade;
alter table ticket_attachments add constraint ticket_attachments_ticket_id_fkey
  foreign key (ticket_id) references tickets(id) on delete cascade;

-- Vote counter follows the rename.
drop trigger if exists idea_votes_sync on ticket_votes;
drop function if exists sync_idea_votes();

create or replace function sync_ticket_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket uuid := coalesce(new.ticket_id, old.ticket_id);
begin
  update tickets
     set votes = (select count(*) from ticket_votes where ticket_id = v_ticket)
   where id = v_ticket;
  return null;
end;
$$;

revoke execute on function sync_ticket_votes() from public, anon;

drop trigger if exists ticket_votes_sync on ticket_votes;
create trigger ticket_votes_sync
  after insert or delete on ticket_votes
  for each row execute function sync_ticket_votes();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table tickets enable row level security;

drop policy if exists "tickets team read" on tickets;
create policy "tickets team read" on tickets for select using (is_team());

drop policy if exists "tickets team insert" on tickets;
create policy "tickets team insert" on tickets for insert with check (is_team());

drop policy if exists "tickets team update" on tickets;
create policy "tickets team update" on tickets
  for update using (is_team()) with check (is_team());

-- Policies carried over with the renamed tables still reference the old column
-- name, so restate them.
drop policy if exists "votes own write" on ticket_votes;
create policy "votes own write" on ticket_votes
  for all using (voter_id = auth.uid()) with check (voter_id = auth.uid());

drop policy if exists "comments team insert" on ticket_comments;
create policy "comments team insert" on ticket_comments
  for insert with check (is_team() and author_id = auth.uid());

drop policy if exists "attachments team insert" on ticket_attachments;
create policy "attachments team insert" on ticket_attachments
  for insert with check (is_team() and author_id = auth.uid());
