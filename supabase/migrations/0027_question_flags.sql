-- Phase 2 of docs/next-plan.md: report a question, the Duolingo way.
--
-- Flagging needs two things tickets didn't carry: who flagged it (to rate
-- limit a bored kid filing two hundred) and a way into the labelling queue
-- ahead of everything unflagged, since a real kid hitting a real wrong
-- answer is the highest-signal thing in the queue.

alter table tickets add column if not exists reporter_profile_id uuid;

-- 'kid_flag': a specific kid tapped a specific wrong answer, mid-game.
-- Distinct from 'analytics' (aggregate learner stats) and 'human' (a team
-- member asked for a second opinion) — this is neither, it is a report.
alter table label_tasks drop constraint if exists label_tasks_origin_check;
alter table label_tasks add constraint label_tasks_origin_check
  check (origin in ('ai', 'human', 'analytics', 'kid_flag'));
