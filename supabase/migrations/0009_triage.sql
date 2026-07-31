-- Triage board: votes with identity, comments, attachments, and a decision that
-- has to come with a reason.
--
-- The board already existed as wishlist_items with an integer `votes` column and
-- localStorage-based dedup, which anyone could clear and re-vote with. This turns
-- it into something a team can actually be held to.

alter table wishlist_items add column if not exists author_id uuid references team_members(id) on delete set null;
alter table wishlist_items add column if not exists linear_issue_id text;
alter table wishlist_items add column if not exists linear_issue_url text;
alter table wishlist_items add column if not exists preview_url text;
alter table wishlist_items add column if not exists decision_note text;
alter table wishlist_items add column if not exists decided_by uuid references team_members(id) on delete set null;
alter table wishlist_items add column if not exists decided_at timestamptz;
alter table wishlist_items add column if not exists tags text[] not null default '{}';

-- The teeth behind "people feel heard": an idea cannot leave the inbox without
-- a written reason. 10 characters stops "no" from counting as an answer.
alter table wishlist_items drop constraint if exists wishlist_decision_note_required;
alter table wishlist_items add constraint wishlist_decision_note_required
  check (
    status = 'idea'
    or (decision_note is not null and length(btrim(decision_note)) >= 10)
  );

-- The seeded vote counts in 0003 were invented by the planning doc, not cast by
-- anyone. Zero them so the number on screen only ever means real people.
update wishlist_items set votes = 0 where votes > 0 and author_id is null;

create table if not exists idea_votes (
  idea_id uuid not null references wishlist_items(id) on delete cascade,
  voter_id uuid not null references team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, voter_id)
);

create table if not exists idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references wishlist_items(id) on delete cascade,
  author_id uuid references team_members(id) on delete set null,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idea_comments_idea_idx on idea_comments (idea_id, created_at);

create table if not exists idea_attachments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references wishlist_items(id) on delete cascade,
  author_id uuid references team_members(id) on delete set null,
  kind text not null check (kind in ('image', 'link')),
  storage_path text,           -- set for kind='image'
  url text,                    -- set for kind='link'
  title text,
  created_at timestamptz not null default now(),
  check (
    (kind = 'image' and storage_path is not null)
    or (kind = 'link' and url is not null)
  )
);

create index if not exists idea_attachments_idea_idx on idea_attachments (idea_id);

-- Keep wishlist_items.votes as a denormalised counter so ordering stays cheap.
create or replace function sync_idea_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idea uuid := coalesce(new.idea_id, old.idea_id);
begin
  update wishlist_items
     set votes = (select count(*) from idea_votes where idea_id = v_idea)
   where id = v_idea;
  return null;
end;
$$;

drop trigger if exists idea_votes_sync on idea_votes;
create trigger idea_votes_sync
  after insert or delete on idea_votes
  for each row execute function sync_idea_votes();

-- ---------------------------------------------------------------------------
-- RLS. The board is a team tool now — it is no longer readable by anyone
-- holding the anon key, which is what 0003 shipped.
-- ---------------------------------------------------------------------------

alter table idea_votes enable row level security;
alter table idea_comments enable row level security;
alter table idea_attachments enable row level security;

drop policy if exists "wishlist select" on wishlist_items;
drop policy if exists "wishlist insert" on wishlist_items;
drop policy if exists "wishlist update votes" on wishlist_items;

drop policy if exists "ideas team read" on wishlist_items;
create policy "ideas team read" on wishlist_items for select using (is_team());

drop policy if exists "ideas team insert" on wishlist_items;
create policy "ideas team insert" on wishlist_items for insert with check (is_team());

-- Anyone on the team can edit an idea they wrote; only staff can change status,
-- which is enforced in the server action (a policy can't see which column moved
-- without a trigger, and the action is the only write path).
drop policy if exists "ideas author update" on wishlist_items;
create policy "ideas author update" on wishlist_items
  for update using (is_team()) with check (is_team());

drop policy if exists "votes team read" on idea_votes;
create policy "votes team read" on idea_votes for select using (is_team());

drop policy if exists "votes own write" on idea_votes;
create policy "votes own write" on idea_votes
  for all using (voter_id = auth.uid()) with check (voter_id = auth.uid());

drop policy if exists "comments team read" on idea_comments;
create policy "comments team read" on idea_comments for select using (is_team());

drop policy if exists "comments team insert" on idea_comments;
create policy "comments team insert" on idea_comments
  for insert with check (is_team() and author_id = auth.uid());

drop policy if exists "comments own delete" on idea_comments;
create policy "comments own delete" on idea_comments
  for delete using (author_id = auth.uid() or is_staff());

drop policy if exists "attachments team read" on idea_attachments;
create policy "attachments team read" on idea_attachments for select using (is_team());

drop policy if exists "attachments team insert" on idea_attachments;
create policy "attachments team insert" on idea_attachments
  for insert with check (is_team() and author_id = auth.uid());

drop policy if exists "attachments own delete" on idea_attachments;
create policy "attachments own delete" on idea_attachments
  for delete using (author_id = auth.uid() or is_staff());

-- ---------------------------------------------------------------------------
-- Storage for image attachments.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('idea-attachments', 'idea-attachments', true)
on conflict (id) do nothing;

drop policy if exists "idea attachments team upload" on storage.objects;
create policy "idea attachments team upload" on storage.objects
  for insert with check (bucket_id = 'idea-attachments' and is_team());

drop policy if exists "idea attachments read" on storage.objects;
create policy "idea attachments read" on storage.objects
  for select using (bucket_id = 'idea-attachments');
