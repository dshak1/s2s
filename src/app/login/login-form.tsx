"use client";

import { useState } from "react";
import { KeyRound, Loader2, Mail, Send } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useIsNativeShell } from "@/lib/native-shell";
import { signInErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";

// Supabase is configured for an 8-digit email OTP (mailer_otp_length).
const CODE_LENGTH = 8;

export function LoginForm({ next }: { next: string }) {
  const isNative = useIsNativeShell();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<"sending" | "verifying" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured in this environment.");
      return;
    }

    setBusy("sending");
    setError(null);

    // The link half of the email only works in the browser that asked for it,
    // so the redirect stays for the web build; the code half is what carries
    // a sign-in that has to finish inside the native WebView.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(null);
    if (err) setError(signInErrorMessage(err));
    else {
      setCode("");
      setStage("code");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowser();
    if (!sb) return;

    setBusy("verifying");
    setError(null);

    const { error: err } = await sb.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (err) {
      setBusy(null);
      setError(signInErrorMessage(err));
      return;
    }

    // verifyOtp wrote the session cookies for this origin, so the server can
    // now do the team_members work that /auth/callback does for a link.
    window.location.assign(`/auth/complete?next=${encodeURIComponent(next)}`);
  }

  if (stage === "code") {
    return (
      <form onSubmit={verifyCode} className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
        <Mail size={32} className="mx-auto mb-3 text-steppe" />
        <p className="text-center font-black text-steppe">Check your email</p>
        <p className="mt-1 text-center text-sm font-semibold text-wolf">
          {isNative
            ? `We sent an ${CODE_LENGTH}-digit code to ${email}. Type it in below.`
            : `We sent a sign-in link and an ${CODE_LENGTH}-digit code to ${email}. Use whichever you like.`}
        </p>

        <label htmlFor="code" className="mt-5 mb-2 block text-sm font-black text-steppe">
          Sign-in code
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          placeholder={"0".repeat(CODE_LENGTH)}
          className="mb-3 w-full rounded-xl border-2 border-felt bg-warm px-3 py-2 text-center font-mono text-xl font-black tracking-[0.3em] text-steppe outline-none focus:border-steppe"
        />
        {error && <p className="mb-3 text-sm font-bold text-terra">{error}</p>}
        <Button
          variant="gold"
          type="submit"
          disabled={busy !== null || code.length < CODE_LENGTH}
          className="w-full"
        >
          {busy === "verifying" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          Sign in
        </Button>
        <button
          type="button"
          onClick={() => {
            setStage("email");
            setError(null);
          }}
          className="mt-3 w-full text-xs font-black text-wolf underline decoration-2 underline-offset-4"
        >
          Use a different email or send a new code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
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
      <Button variant="gold" type="submit" disabled={busy !== null || !email.trim()} className="w-full">
        {busy === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Email me a sign-in code
      </Button>
      <p className="mt-3 text-xs font-semibold text-wolf/70">
        No password. Signing in keeps you signed in for 30 days on this device.
      </p>
    </form>
  );
}
