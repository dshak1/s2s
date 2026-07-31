-- Human labelling: the dataset layer.
--
-- Learner behaviour tells you a question is hard. It cannot tell you *why* —
-- whether the audio is wrong, the distractors are unfair, the translation is
-- ambiguous, or the word simply isn't used that way in Kazakh. Only an educator
-- or a native speaker can say that, and this is where they say it.

create table if not exists label_tasks (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  -- Why this item is in the queue. 'analytics' means the learner data flagged
  -- it; 'ai' means a generator was explicitly unsure; 'human' means someone
  -- asked for a second opinion.
  origin text not null default 'human' check (origin in ('ai', 'human', 'analytics')),
  uncertainty_reason text,
  priority int not null default 100,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  created_by uuid references team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (item_id, origin, uncertainty_reason)
);

create index if not exists label_tasks_status_idx on label_tasks (status, priority);

create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references label_tasks(id) on delete set null,
  item_id text not null,
  rater_id uuid not null references team_members(id) on delete cascade,
  verdict text not null check (verdict in ('good', 'bad', 'unsure')),
  -- clarity / difficulty / cultural_accuracy / answer_correct / distractor_quality,
  -- each 1-5. jsonb rather than five columns because the rubric will grow.
  axes jsonb not null default '{}'::jsonb,
  -- Required for a 'bad' verdict, enforced below: a rejection without a reason
  -- is not usable as training data and is not usable by the person who wrote
  -- the question either.
  reason_text text,
  voice_path text,
  transcript text,
  rater_confidence int check (rater_confidence between 1 and 5),
  ms_spent int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, rater_id),
  check (verdict <> 'bad' or (reason_text is not null and length(btrim(reason_text)) >= 3))
);

create index if not exists labels_item_idx on labels (item_id);
create index if not exists labels_rater_idx on labels (rater_id, created_at desc);

-- Known-answer items, mixed into the queue so rater reliability is measurable
-- without anyone being told they are being checked.
create table if not exists label_gold (
  item_id text primary key,
  gold_verdict text not null check (gold_verdict in ('good', 'bad')),
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Item quality: expert consensus joined to observed behaviour. This is the
-- table the research questions are actually asking about — do expert judgements
-- predict learner outcomes?
-- ---------------------------------------------------------------------------

create or replace view v_item_quality
with (security_invoker = on) as
select
  s.item_id,
  s.kind,
  s.ref_slug,
  s.game_slug,
  s.payload,
  s.attempts,
  s.p_value,
  s.median_latency_ms,
  count(l.id)                                        as label_count,
  count(l.id) filter (where l.verdict = 'good')      as good_labels,
  count(l.id) filter (where l.verdict = 'bad')       as bad_labels,
  count(l.id) filter (where l.verdict = 'unsure')    as unsure_labels,
  round(avg((l.axes->>'clarity')::numeric), 2)              as avg_clarity,
  round(avg((l.axes->>'difficulty')::numeric), 2)           as avg_difficulty,
  round(avg((l.axes->>'cultural_accuracy')::numeric), 2)    as avg_cultural_accuracy,
  round(avg((l.axes->>'answer_correct')::numeric), 2)       as avg_answer_correct,
  round(avg((l.axes->>'distractor_quality')::numeric), 2)   as avg_distractor_quality
from v_item_stats s
left join labels l on l.item_id = s.item_id
group by s.item_id, s.kind, s.ref_slug, s.game_slug, s.payload, s.attempts,
         s.p_value, s.median_latency_ms;

-- ---------------------------------------------------------------------------
-- The data nominates its own bad questions: anything well outside the healthy
-- difficulty band with enough attempts to mean something. Idempotent — safe to
-- call from a cron or a button.
-- ---------------------------------------------------------------------------

create or replace function refresh_analytics_label_tasks(min_attempts int default 5)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_added int;
begin
  insert into label_tasks (item_id, origin, uncertainty_reason, priority)
  select
    s.item_id,
    'analytics',
    case when s.p_value < 0.20 then 'too_hard_in_practice' else 'too_easy_in_practice' end,
    case when s.p_value < 0.20 then 10 else 40 end
  from v_item_stats s
  where s.attempts >= min_attempts
    and s.p_value is not null
    and (s.p_value < 0.20 or s.p_value > 0.95)
  on conflict (item_id, origin, uncertainty_reason) do nothing;

  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

grant execute on function refresh_analytics_label_tasks(int) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: labelling is a team activity end to end.
-- ---------------------------------------------------------------------------

alter table label_tasks enable row level security;
alter table labels enable row level security;
alter table label_gold enable row level security;

drop policy if exists "tasks team read" on label_tasks;
create policy "tasks team read" on label_tasks for select using (is_team());

drop policy if exists "tasks team write" on label_tasks;
create policy "tasks team write" on label_tasks for all using (is_team()) with check (is_team());

drop policy if exists "labels team read" on labels;
create policy "labels team read" on labels for select using (is_team());

drop policy if exists "labels own write" on labels;
create policy "labels own write" on labels
  for all using (rater_id = auth.uid()) with check (rater_id = auth.uid());

-- Gold answers are staff-only to read: a rater who can see them can game them.
drop policy if exists "gold staff only" on label_gold;
create policy "gold staff only" on label_gold for all using (is_staff()) with check (is_staff());

grant select on v_item_quality to authenticated;

-- Voice notes. Private bucket — these are people thinking out loud, not
-- publishable artifacts.
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

drop policy if exists "voice notes team upload" on storage.objects;
create policy "voice notes team upload" on storage.objects
  for insert with check (bucket_id = 'voice-notes' and is_team());

drop policy if exists "voice notes team read" on storage.objects;
create policy "voice notes team read" on storage.objects
  for select using (bucket_id = 'voice-notes' and is_team());
