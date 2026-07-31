# Research

The project has something genuinely uncommon: learner interaction data and
expert quality judgements, on the same items, for a **low-resource language**,
collected from people who are actually in the room — educators, native speakers,
and the learners themselves.

Each question below names the tables that answer it. None of them need data the
system won't already have.

## RQ1 — Which interaction signals predict retention of a vocabulary item?

Given response latency, replay count, audio replays, and error patterns, can we
predict whether a learner will still get an item right in a later session?

- Data: `learning_events` grouped by `(profile_id, item_id)` over time.
- Outcome: a scheduler that decides what to show next per learner, instead of
  the current fixed order.
- Status: needs a few workshops of data. The events are being collected now.

## RQ2 — Do expert quality labels predict learner outcomes?

If educator and native-speaker ratings correlate with observed p-value and
retention, then item quality becomes **auto-scorable** — new content can be
triaged before it reaches a child.

- Data: `v_item_quality` (labels ⋈ `v_item_stats`).
- Test: correlation between `avg_clarity` / `avg_distractor_quality` and
  `p_value`; regression of retention on expert axes.
- This is the load-bearing question. If the answer is no, the labelling effort
  is still useful for fixing content but stops being a predictive asset.

## RQ3 — Can an LLM match a human expert panel on item quality for Kazakh?

Take items with ≥3 independent expert labels, hold them out, ask a model to rate
the same five axes, and measure agreement against the human consensus — against
the same inter-rater agreement ceiling the humans themselves achieve.

- Data: `labels`, `label_gold`.
- Output: **KazBench-Learn v0** — a held-out set of Kazakh learning items with
  expert consensus labels and a published agreement baseline.
- This is the publishable artifact, and the honest version of the "benchmarks
  for AI in online learning" idea: a narrow, real, verifiable benchmark for one
  low-resource language, not a claim about learning in general.

## RQ4 — Does ML-personalised item ordering beat a fixed order?

A/B the RQ1 scheduler against the current fixed sequence.

- Metrics: session completion, items attempted per session, week-over-week
  return rate.
- Data: `learning_events`, `v_learner_weekly`, `attendance`.
- This is the direct analogue of targetable-objective work in games: use the
  interaction data to decide what each user should see next.

## Measuring agreement

Percent agreement is easy and misleading — two raters who both say "good" 90% of
the time agree 82% by chance alone. Report **Cohen's κ** for pairs and **Fleiss' κ**
for the group, alongside raw agreement and per-rater accuracy on `label_gold`.

Rough reading: κ < 0.4 means the rubric is ambiguous and needs rewriting before
the data is worth modelling; 0.4–0.6 is usable; > 0.6 is strong for subjective
quality judgements.

## Ethics and data handling

- Learners are anonymous by construction. There is no name, email, or device
  identifier in `learning_events` — only a random profile id generated on the
  device.
- Kid artwork and homework photos live in a separate bucket and are **not** part
  of any exported dataset.
- Any published dataset ships a datasheet: how items were sourced, who the
  raters were and what they were told, the rubric verbatim, agreement figures,
  and known gaps.
- Workshop consent covers classroom use. Publishing anything beyond aggregate
  item statistics needs that consent revisited first — the burden is on us to
  ask again, not on families to object.
