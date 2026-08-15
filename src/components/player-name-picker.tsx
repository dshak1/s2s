"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { matchRoster, WORKSHOP_ROSTER } from "@/content/roster";
import { ANONYMOUS_NAME, store, useProfile } from "@/lib/store";
import { toastBus } from "@/lib/toast";

type RosterEntry = { name: string; known: boolean; xp: number; lastSeen: string | null };

// Signing in by recognising your own name instead of remembering a code.
//
// A six-character recovery code is the wrong interaction for a 5-12 year old on
// a school laptop: they do not have it, will not remember it, and will not go
// looking. So they type a letter or two and pick themselves out of a short
// list — "A" narrows to Alima, Alan, Aimira; "Al" to Alima and Alan.
//
// The list is the curated workshop roster (src/content/roster.ts), never every
// name on the server, so this cannot be used to enumerate accounts.
export function PlayerNamePicker() {
  const profile = useProfile();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/player/lookup")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { roster?: RosterEntry[] } | null) => {
        if (cancelled) return;
        // Falling back to the bare roster keeps the picker usable offline; the
        // kid just does not see who already has points saved.
        setRoster(json?.roster ?? WORKSHOP_ROSTER.map((name) => ({ name, known: false, xp: 0, lastSeen: null })));
      })
      .catch(() => {
        if (!cancelled) {
          setRoster(WORKSHOP_ROSTER.map((name) => ({ name, known: false, xp: 0, lastSeen: null })));
        }
      });
    return () => { cancelled = true; };
  }, []);

  const shown = useMemo(() => {
    const names = matchRoster(query);
    const byName = new Map((roster ?? []).map((entry) => [entry.name, entry]));
    return names.map((name) => byName.get(name) ?? { name, known: false, xp: 0, lastSeen: null });
  }, [query, roster]);

  async function pick(entry: RosterEntry) {
    if (busyName) return;
    setBusyName(entry.name);
    setMessage(null);
    try {
      const res = await fetch("/api/player/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entry.name }),
      });
      const json = (await res.json()) as { profile?: { id: string; xp: number } | null; name?: string };

      if (!res.ok) {
        setMessage("Could not look that name up. Try again in a moment.");
        return;
      }

      // Nobody has played under this name yet, so there is nothing to adopt.
      // What happens next depends on who is already on this device:
      //
      //   anonymous  -> the name lands on this profile and the work stays put
      //   signed in  -> start fresh, because renaming the profile would hand
      //                 the previous kid's points and drawings to this one.
      //                 That is the normal case on a shared classroom laptop.
      if (!json.profile) {
        const anonymousHere = store.get().displayName.trim() === ANONYMOUS_NAME;
        if (anonymousHere) {
          store.claimName(entry.name);
          toastBus.show({
            title: `Hi, ${entry.name}!`,
            body: "This is your player now. Everything you have made stays with you.",
          });
        } else {
          store.startAs(entry.name);
          toastBus.show({
            title: `Hi, ${entry.name}!`,
            body: "Starting a new player. The last one is saved under their own name.",
          });
        }
        router.replace(`/profile/${store.get().id}`);
        return;
      }

      const result = await store.adoptAndMerge(json.profile.id);
      if (!result.ok) {
        setMessage("Could not open that player. Try again in a moment.");
        return;
      }

      toastBus.show({
        title: `Welcome back, ${result.name || entry.name}!`,
        body: result.merged
          ? `Your ${result.xpBefore} points from this device were added on. You now have ${result.xpAfter}.`
          : "Your progress and creations are loading.",
      });
      router.replace(`/profile/${store.get().id}`);
    } catch {
      setMessage("Could not reach the server. Your player code still works.");
    } finally {
      setBusyName(null);
    }
  }

  const carriedXp = profile.xp;

  return (
    <div>
      <label htmlFor="player-name-search" className="sr-only">
        Find your name
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steppe/40" />
        <input
          id="player-name-search"
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type the first letter of your name"
          autoComplete="off"
          className="w-full rounded-lg border-2 border-steppe/15 bg-white py-2 pl-9 pr-3 font-bold text-steppe outline-none focus:border-steppe"
        />
      </div>

      {roster === null ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-steppe/55">
          <Loader2 size={15} className="animate-spin" /> Loading names…
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-steppe/55">
          No name matches that. Check the spelling, or use a player code below.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {shown.map((entry) => (
            <li key={entry.name}>
              <button
                type="button"
                onClick={() => pick(entry)}
                disabled={busyName !== null}
                className="flex w-full items-center gap-3 rounded-lg border-2 border-steppe/10 bg-white px-3 py-2.5 text-left transition hover:border-gold hover:bg-[#fff8df] disabled:opacity-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef7ff] text-steppe">
                  {busyName === entry.name ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserRound size={16} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-black text-steppe">{entry.name}</span>
                  <span className="block text-xs font-bold text-steppe/55">
                    {entry.known ? `${entry.xp.toLocaleString()} points saved` : "New player"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {carriedXp > 0 && (
        <p className="mt-3 rounded-lg bg-[#eef7ff] px-3 py-2 text-xs font-bold leading-5 text-steppe/70">
          The {carriedXp.toLocaleString()} points on this device come with you. Signing in adds them to
          your player, it never replaces what is already there.
        </p>
      )}

      {message && <p className="mt-3 text-sm font-bold text-[#a13c2e]">{message}</p>}
    </div>
  );
}
