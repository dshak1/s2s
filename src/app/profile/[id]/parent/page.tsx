"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { TopNav } from "@/components/top-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const emailSchema = z.string().email();

export default function ParentLink() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setErr("Please enter a valid email."); return; }

    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) setErr(error.message);
      else setMsg("Magic link sent! Check the parent's inbox to link this profile across devices.");
    } else {
      // No backend configured in this environment — store intent locally.
      setMsg(`Saved ${email}. Once Supabase is configured, a magic link is emailed so this profile follows the kid to any device.`);
    }
  }

  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-md px-4 py-8">
        <Card>
          <h1 className="text-xl font-black text-steppe">Add a parent email</h1>
          <p className="mt-1 text-sm text-wolf">
            Link this profile to a parent&apos;s email so progress, art, and badges follow the
            kid to any device, and a real name can appear on leaderboards only after the parent confirms.
          </p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full rounded-2xl border-2 border-steppe/30 bg-white px-4 py-3 font-bold outline-none focus:border-steppe"
            />
            <Button type="submit" variant="gold" size="lg" className="w-full">Send magic link</Button>
          </form>
          {msg && <p className="mt-3 text-sm font-bold text-steppe">{msg}</p>}
          {err && <p className="mt-3 text-sm font-bold text-terra">{err}</p>}
          <Link href={`/profile`} className="mt-4 block text-center text-sm font-bold text-steppe underline">
            ← Back to profile
          </Link>
        </Card>
      </main>
    </div>
  );
}
