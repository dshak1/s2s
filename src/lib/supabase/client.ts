"use client";

import { createBrowserClient } from "@supabase/ssr";

// Returns a browser Supabase client when env vars are configured, else null.
// The app runs fully on the localStorage store without these; wiring them in
// (plus running /supabase/migrations) upgrades it to a real backend.
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
