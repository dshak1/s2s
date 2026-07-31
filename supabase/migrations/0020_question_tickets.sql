-- A flagged question no longer has to know the question's id.
--
-- The constraint assumed every question ticket comes from the labelling queue,
-- where the id is already in hand. In practice the useful reports arrive the
-- other way round: "the audio for Qairly tan is wrong" typed by whoever just
-- heard it, with no id anywhere in sight. Refusing that report is worse than
-- storing it loosely.
--
-- A question ticket now needs *something* to identify it: an item id, or the
-- game it happened in, or a written problem. All three empty is still refused,
-- since that is not a report, it is a shrug.

alter table tickets drop constraint if exists tickets_question_needs_item;
alter table tickets add constraint tickets_question_is_identifiable check (
  type <> 'question'
  or item_id is not null
  or game_slug is not null
  or problem is not null
);
