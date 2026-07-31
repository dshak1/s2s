-- The labelling queue.
--
-- SECURITY DEFINER on purpose: gold-standard items have to reach a rater's
-- queue looking exactly like any other item, and label_gold is deliberately
-- unreadable by non-staff (a rater who can see the answers can game them).
-- The function is the only way for a rater to receive them, and it never
-- reveals which rows are gold.

create or replace function label_queue(p_limit int default 25)
returns table (
  item_id text,
  kind text,
  ref_slug text,
  game_slug text,
  payload jsonb,
  attempts bigint,
  p_value numeric,
  task_id uuid,
  origin text,
  uncertainty_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_team() then
    raise exception 'not on the team';
  end if;

  return query
  with already as (
    select l.item_id from labels l where l.rater_id = auth.uid()
  ),
  candidates as (
    -- 1. Explicit tasks: a generator was unsure, or the learner data flagged it.
    select
      t.item_id,
      t.id as task_id,
      t.origin,
      t.uncertainty_reason,
      t.priority as sort_key
    from label_tasks t
    where t.status = 'open'
      and t.item_id not in (select item_id from already)

    union all

    -- 2. Gold checks, indistinguishable from ordinary work in the UI.
    select g.item_id, null::uuid, null::text, null::text, 60
    from label_gold g
    where g.item_id not in (select item_id from already)

    union all

    -- 3. Items real learners have actually answered but nobody has judged.
    select s.item_id, null::uuid, null::text, null::text, 100
    from v_item_stats s
    where s.attempts > 0
      and s.item_id not in (select item_id from already)

    union all

    -- 4. Everything else, so the queue never runs dry.
    select c.id, null::uuid, null::text, null::text, 200
    from content_items c
    where c.status <> 'retired'
      and c.id not in (select item_id from already)
  ),
  ranked as (
    select distinct on (c.item_id)
      c.item_id, c.task_id, c.origin, c.uncertainty_reason, c.sort_key
    from candidates c
    order by c.item_id, c.sort_key
  )
  select
    i.id,
    i.kind,
    i.ref_slug,
    i.game_slug,
    i.payload,
    coalesce(s.attempts, 0),
    s.p_value,
    r.task_id,
    r.origin,
    r.uncertainty_reason
  from ranked r
  join content_items i on i.id = r.item_id
  left join v_item_stats s on s.item_id = r.item_id
  order by r.sort_key, coalesce(s.attempts, 0) desc, i.id
  limit p_limit;
end;
$$;

grant execute on function label_queue(int) to authenticated;

-- Per-rater counters for the labelling leaderboard. Nothing motivates an
-- unmotivated team like seeing their own name attached to finished work.
create or replace view v_rater_stats
with (security_invoker = on) as
select
  l.rater_id,
  count(*)                                          as labels,
  count(*) filter (where l.verdict = 'bad')         as flagged_bad,
  count(*) filter (where l.voice_path is not null)  as voice_notes,
  round(avg(l.ms_spent)::numeric / 1000, 1)         as avg_seconds,
  max(l.created_at)                                 as last_label_at
from labels l
group by l.rater_id;

grant select on v_rater_stats to authenticated;
