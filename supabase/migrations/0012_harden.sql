-- Hardening pass against the Supabase security advisor.
--
-- Two classes of finding are fixed here. The remaining advisor warnings are the
-- anon insert/update policies, which are inherent to anonymous kid accounts and
-- are written up honestly in docs/security.md rather than papered over.

-- 1. Public buckets don't need a SELECT policy for their public object URLs to
--    resolve — that path bypasses RLS entirely. The policy only enables the
--    authenticated list/download API, which nothing in this app uses, and it
--    let any client enumerate every file in the bucket. For kid-art that means
--    listing children's drawings and homework photos.
drop policy if exists "kid-art public read" on storage.objects;
drop policy if exists "idea attachments read" on storage.objects;

-- 2. SECURITY DEFINER functions are executable by PUBLIC by default, which
--    exposes them as REST RPC endpoints. Only the roles that actually need each
--    one keep EXECUTE.
--
--    is_team/is_staff/current_team_role deliberately keep the anon grant: RLS
--    policy expressions are evaluated as the calling role, so anon needs EXECUTE
--    for its own write policies to be checkable. Calling them directly as anon
--    just returns false.

--    Note: revoking from PUBLIC is not sufficient on Supabase. Its default
--    privileges hand `anon` a direct EXECUTE grant on every new function, so
--    anon has to be revoked by name as well.
revoke execute on function sync_idea_votes() from public, anon;
revoke execute on function label_queue(int) from public, anon;
revoke execute on function refresh_analytics_label_tasks(int) from public, anon;
revoke execute on function ensure_team_member(text) from public, anon;

grant execute on function label_queue(int) to authenticated;
grant execute on function refresh_analytics_label_tasks(int) to authenticated;
grant execute on function ensure_team_member(text) to authenticated;
