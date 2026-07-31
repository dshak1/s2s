"use client";

import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured in this environment.");
      return;
    }

    setSending(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    setSending(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow ring-1 ring-black/5">
        <Mail size={32} className="mx-auto mb-3 text-steppe" />
        <p className="font-black text-steppe">Check your email</p>
        <p className="mt-1 text-sm font-semibold text-wolf">
          We sent a sign-in link to {email}. It opens straight into the dashboard.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
      <label htmlFor="email" className="mb-2 block text-sm font-black text-steppe">
        Work email
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mb-3 w-full rounded-xl border-2 border-felt bg-warm px-3 py-2 font-bold text-steppe outline-none focus:border-steppe"
      />
      {error && <p className="mb-3 text-sm font-bold text-terra">{error}</p>}
      <Button variant="gold" type="submit" disabled={sending || !email.trim()} className="w-full">
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Send me a sign-in link
      </Button>
      <p className="mt-3 text-xs font-semibold text-wolf/70">
        No password. The link signs you in for 30 days on this device.
      </p>
    </form>
  );
}
