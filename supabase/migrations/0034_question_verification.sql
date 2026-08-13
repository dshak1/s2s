-- Question verification: the one-pass sweep over everything the games ask.
--
-- This is deliberately not the same thing as `labels` (0010_labelling.sql).
-- Labelling is a research instrument: many raters judge the same item on a
-- five-axis rubric, and the disagreement between them is the interesting part.
-- Verification is a checklist. Every generated clip and every translation gets
-- listened to or read exactly once by one person on the team, so three people
-- can split 161 items between them and know the moment the list is covered.
--
-- "Exactly once" is the primary key, not application logic. Two people
-- reviewing at the same time cannot both write a row for the same item; the
-- second insert loses, and the queue hands that person the next item instead.
--
-- item_id is not a foreign key to content_items on purpose. Some of what needs
-- checking was never seeded there (the Snow Leopard clues, the Aitys couplets),
-- and a checklist that silently skips content is worse than useless. The ids
-- still come from src/lib/items.ts, so they join to content_items and
-- learning_events wherever a row does exist.
create table if not exists question_verifications (
  item_id text primary key,
  kind text not null,
  verdict text not null check (verdict in ('approved', 'needs_work')),
  -- Required for 'needs_work', enforced below. Approving is meant to be one
  -- click with nothing to type — that is the only way a 161-item sweep gets
  -- finished — but "this one is wrong" is not actionable without saying how.
  comment text,
  reviewed_by uuid not null references team_members(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  check (verdict <> 'needs_work' or length(btrim(coalesce(comment, ''))) >= 3)
);

create index if not exists question_verifications_reviewer_idx
  on question_verifications (reviewed_by, reviewed_at desc);
create index if not exists question_verifications_verdict_idx
  on question_verifications (verdict, reviewed_at desc);

-- Who has covered how much. The point of showing this is coordination, not
-- ranking: if the remaining count is 40 and one person has done 60, everyone
-- can see where the work actually is.
create or replace view v_verification_stats
with (security_invoker = on) as
select
  v.reviewed_by,
  count(*)                                            as reviewed,
  count(*) filter (where v.verdict = 'approved')      as approved,
  count(*) filter (where v.verdict = 'needs_work')    as needs_work,
  max(v.reviewed_at)                                  as last_reviewed_at
from question_verifications v
group by v.reviewed_by;

alter table question_verifications enable row level security;

-- The whole team reads everything: you need to see what is already covered to
-- know what is left, and a flagged item is a message to whoever can fix it.
drop policy if exists "verifications team read" on question_verifications;
create policy "verifications team read" on question_verifications
  for select using (is_team());

-- You review as yourself. No updates: a review is a record of what one person
-- heard on one day, and editing someone else's would quietly break that.
drop policy if exists "verifications own insert" on question_verifications;
create policy "verifications own insert" on question_verifications
  for insert with check (is_team() and reviewed_by = auth.uid());

-- Reopening is a staff delete, which puts the item back in the queue for a
-- fresh pair of ears — the normal path after someone regenerates a bad clip.
drop policy if exists "verifications staff delete" on question_verifications;
create policy "verifications staff delete" on question_verifications
  for delete using (is_staff());

grant select on v_verification_stats to authenticated;
