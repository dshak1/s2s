import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS, so it is only for server code that has no
// user session to act on behalf of — right now that means the Linear webhook.
// Returns null when the key is absent, like every other client here.
export function getSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
