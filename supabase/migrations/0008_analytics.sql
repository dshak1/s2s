-- Analytics views behind /dashboard.
--
-- All views are security_invoker so RLS still applies through them — a view is
-- otherwise evaluated as its owner and would hand anon a way around the
-- team-only read policies from 0005_identity.sql.

-- ---------------------------------------------------------------------------
-- Item quality: the "which questions are bad" view.
--
-- p_value is classical item analysis — the share of learners who got it right.
-- Below ~0.20 usually means broken or mistaught; above ~0.95 means it teaches
-- nothing. Both ends are what the labelling queue should look at first.
-- ---------------------------------------------------------------------------

create or replace view v_item_stats
with (security_invoker = on) as
select
  c.id                                          as item_id,
  c.kind,
  c.ref_slug,
  c.game_slug,
  c.status,
  c.payload,
  count(e.id)                                   as attempts,
  count(e.id) filter (where e.is_correct)       as correct,
  case
    when count(e.id) > 0
    then round(count(e.id) filter (where e.is_correct)::numeric / count(e.id), 3)
  end                                           as p_value,
  percentile_cont(0.5) within group (order by e.latency_ms)::int as median_latency_ms,
  round(avg(e.audio_plays)::numeric, 2)         as avg_audio_plays,
  count(distinct e.profile_id)                  as learners,
  max(e.created_at)                             as last_seen_at
from content_items c
left join learning_events e on e.item_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Per-game engagement and difficulty.
-- ---------------------------------------------------------------------------

create or replace view v_game_stats
with (security_invoker = on) as
select
  e.game_slug,
  count(*)                                      as events,
  count(*) filter (where e.is_correct)          as correct,
  round(
    count(*) filter (where e.is_correct)::numeric / nullif(count(*), 0), 3
  )                                             as accuracy,
  percentile_cont(0.5) within group (order by e.latency_ms)::int as median_latency_ms,
  count(distinct e.profile_id)                  as learners,
  count(distinct e.item_id)                     as items_touched,
  max(e.created_at)                             as last_played_at
from learning_events e
group by e.game_slug;

-- ---------------------------------------------------------------------------
-- Weekly activity. Answers "is anyone actually coming back?"
-- ---------------------------------------------------------------------------

create or replace view v_learner_weekly
with (security_invoker = on) as
select
  date_trunc('week', e.created_at)::date        as week,
  count(distinct e.profile_id)                  as active_learners,
  count(*)                                      as events,
  count(*) filter (where e.is_correct)          as correct,
  count(distinct e.game_slug)                   as games_played
from learning_events e
group by 1
order by 1 desc;

create or replace view v_run_weekly
with (security_invoker = on) as
select
  date_trunc('week', r.created_at)::date        as week,
  count(*)                                      as runs,
  count(distinct r.profile_id)                  as learners,
  sum(r.score)                                  as xp_awarded
from game_runs r
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------------
-- Content coverage: what is missing before a game can pass the quality bar.
-- ---------------------------------------------------------------------------

create or replace view v_coverage
with (security_invoker = on) as
select
  kind,
  count(*)                                                        as items,
  count(*) filter (where nullif(payload->>'audio', '') is not null) as with_audio,
  count(*) filter (where nullif(payload->>'image', '') is not null) as with_image,
  count(*) filter (where status = 'live')                          as live,
  count(*) filter (where status = 'draft')                         as draft
from content_items
group by kind
order by kind;

grant select on v_item_stats, v_game_stats, v_learner_weekly, v_run_weekly, v_coverage
  to authenticated;
