"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, LogIn, Mail, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerNamePicker } from "@/components/player-name-picker";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  fetchLinkedPlayerProfiles,
  fetchRecoveryCode,
  linkPlayerProfile,
  type LinkedPlayerProfile,
} from "@/lib/supabase/sync";
import { store, useProfile } from "@/lib/store";
import { toastBus } from "@/lib/toast";

const PENDING_PLAYER_LINK = "s2s_pending_player_link_v1";

type EmailMode = "save" | "find";

export function PlayerAccountPanel() {
  const profile = useProfile();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<EmailMode>("save");
  const [linkedProfiles, setLinkedProfiles] = useState<LinkedPlayerProfile[]>([]);
  const [switchCode, setSwitchCode] = useState("");
  const [busy, setBusy] = useState<"email" | "link" | "code" | "switch" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile.id === "server-profile") return;
    let cancelled = false;
    const sb = getSupabaseBrowser();

    fetchRecoveryCode(profile.id, profile.displayName).then((value) => {
      if (!cancelled) setCode(value);
    });

    if (!sb) return () => { cancelled = true; };

    sb.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      setAccountEmail(data.user.email ?? null);

      const pending = localStorage.getItem(PENDING_PLAYER_LINK);
      if (pending === profile.id) {
        const recoveryCode = await fetchRecoveryCode(profile.id, profile.displayName);
        if (recoveryCode) {
          try {
            await linkPlayerProfile(profile.id, recoveryCode);
            localStorage.removeItem(PENDING_PLAYER_LINK);
            if (!cancelled) setMessage("This player is now saved to your email.");
          } catch {
            if (!cancelled) setMessage("Email is signed in, but this player could not be linked yet.");
          }
        }
      }

      try {
        const profiles = await fetchLinkedPlayerProfiles();
        if (!cancelled) setLinkedProfiles(profiles);
      } catch {
        if (!cancelled) setLinkedProfiles([]);
      }
    });

    return () => { cancelled = true; };
  }, [profile.id, profile.displayName]);

  async function sendEmailLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sb = getSupabaseBrowser();
    if (!sb) {
      setMessage("Email accounts need an internet connection. Your player code still works.");
      return;
    }
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    setBusy("email");
    setMessage(null);
    if (emailMode === "save") localStorage.setItem(PENDING_PLAYER_LINK, profile.id);
    else localStorage.removeItem(PENDING_PLAYER_LINK);

    const next = `/profile/${profile.id}`;
    const redirectTo = `${window.location.origin}/auth/player-callback?next=${encodeURIComponent(next)}`;
    const { error } = await sb.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Check ${normalizedEmail} for your player link.`);
  }

  async function linkCurrentPlayer() {
    if (!code) return;
    setBusy("link");
    try {
      await linkPlayerProfile(profile.id, code);
      setLinkedProfiles(await fetchLinkedPlayerProfiles());
      setMessage("This player is now saved to your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not link this player.");
    }
    setBusy(null);
  }

  async function switchWithCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!switchCode.trim()) return;
    setBusy("code");
    const result = await store.adoptByCode(switchCode);
    setBusy(null);
    if (!result.ok) {
      setMessage("That player code was not found.");
      return;
    }
    toastBus.show({
      title: `Welcome back, ${result.name || "player"}`,
      body: "Your progress and creations are loading.",
      icon: "✓",
    });
    router.replace(`/profile/${store.get().id}`);
  }

  async function switchToProfile(linked: LinkedPlayerProfile) {
    if (linked.id === profile.id) return;
    setBusy("switch");
    const result = await store.adoptById(linked.id);
    setBusy(null);
    if (!result.ok) {
      setMessage("That player could not be loaded.");
      return;
    }
    router.replace(`/profile/${linked.id}`);
  }

  const currentIsLinked = linkedProfiles.some((linked) => linked.id === profile.id);

  return (
    <section className="overflow-hidden rounded-lg border border-steppe/10 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-steppe/10 bg-[#eef7ff] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-steppe/55">Player account</p>
          <h2 className="text-xl font-black text-steppe">Keep this adventure with you</h2>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-steppe/10">
          <KeyRound size={18} className="text-[#e35f4c]" />
          <div>
            <p className="text-[10px] font-black uppercase text-steppe/50">Player code</p>
            <p className="min-w-[9ch] font-mono text-xl font-black tracking-[0.18em] text-steppe">
              {code ?? "------"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-steppe/10">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-steppe">
            <Mail size={18} />
            <h3 className="font-black">Email recovery</h3>
          </div>

          {accountEmail ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-[#f4f8fb] px-3 py-2 text-sm font-bold text-steppe">
                <Check size={16} className="text-[#2f8d47]" /> {accountEmail}
              </div>
              {!currentIsLinked && (
                <Button variant="gold" size="sm" onClick={linkCurrentPlayer} disabled={!code || busy === "link"}>
                  {busy === "link" ? <Loader2 size={15} className="animate-spin" /> : <UserRound size={15} />}
                  Save this player
                </Button>
              )}
              {linkedProfiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-steppe/50">Players on this email</p>
                  {linkedProfiles.map((linked) => (
                    <button
                      key={linked.id}
                      type="button"
                      onClick={() => switchToProfile(linked)}
                      disabled={linked.id === profile.id || busy === "switch"}
                      className="flex w-full items-center justify-between rounded-lg border border-steppe/10 px-3 py-2 text-left transition hover:bg-[#fff8df] disabled:bg-[#eef7ff]"
                    >
                      <span>
                        <span className="block font-black text-steppe">{linked.displayName}</span>
                        <span className="block text-xs font-bold text-steppe/55">{linked.xp} points</span>
                      </span>
                      {linked.id === profile.id ? <Check size={17} /> : <RefreshCw size={17} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={sendEmailLink} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 rounded-lg bg-[#edf2f5] p-1" aria-label="Email account action">
                {(["save", "find"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEmailMode(mode)}
                    aria-pressed={emailMode === mode}
                    className={`rounded-md px-3 py-2 text-xs font-black transition ${
                      emailMode === mode ? "bg-white text-steppe shadow-sm" : "text-steppe/60"
                    }`}
                  >
                    {mode === "save" ? "Save this player" : "Find my player"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="min-w-0 flex-1 rounded-lg border-2 border-steppe/15 bg-white px-3 py-2 font-bold text-steppe outline-none focus:border-steppe"
                />
                <Button variant="gold" size="sm" type="submit" disabled={busy === "email" || !email.trim()}>
                  {busy === "email" ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                  Send link
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-steppe">
            <UserRound size={18} />
            <h3 className="font-black">I&apos;ve played before</h3>
          </div>
          <p className="mt-1 text-xs font-bold text-steppe/55">
            Find your name. No code to remember.
          </p>
          <div className="mt-3">
            <PlayerNamePicker />
          </div>

          {/* The code path stays, quieter, underneath. It is still the only way
              in for a kid who is not on the workshop roster. */}
          <details className="mt-4 border-t border-steppe/10 pt-3">
            <summary className="cursor-pointer text-xs font-black uppercase text-steppe/50">
              Or use a player code
            </summary>
          <form onSubmit={switchWithCode} className="mt-3 flex gap-2">
            <input
              value={switchCode}
              onChange={(event) => setSwitchCode(event.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              aria-label="Another player code"
              className="min-w-0 flex-1 rounded-lg border-2 border-steppe/15 bg-white px-3 py-2 text-center font-mono text-lg font-black uppercase tracking-[0.18em] text-steppe outline-none focus:border-steppe"
            />
            <Button variant="outline" size="sm" type="submit" disabled={busy === "code" || switchCode.length < 6}>
              {busy === "code" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Switch
            </Button>
          </form>
          <p className="mt-3 text-xs font-semibold leading-5 text-steppe/60">
            Use the code for a workshop device. Use email when you want the same player on several devices.
          </p>
          </details>
        </div>
      </div>

      {message && <p className="border-t border-steppe/10 bg-[#fff8df] px-4 py-3 text-sm font-bold text-steppe">{message}</p>}
    </section>
  );
}
