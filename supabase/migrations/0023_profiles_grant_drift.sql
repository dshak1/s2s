-- The table-level grant, not just the policy.
--
-- 0022 re-asserted "profiles anon update" and it still didn't take: verified
-- with `Prefer: count=exact`, anon UPDATE against profiles still matches zero
-- rows (`content-range: */0`). RLS policies only gate rows on top of the base
-- table privilege; if UPDATE was revoked from anon at the grant level, no
-- policy can undo that. Nothing in this repo's migrations revokes it, so this
-- was a manual dashboard change (plausibly the same "fix" pass that broke the
-- policy in 0022). Grants are idempotent, so this is safe to run regardless
-- of whether it turns out to be the actual cause.

grant update on profiles to anon;
