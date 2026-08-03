"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useProfile } from "@/lib/store";
import { fetchRecoveryCode } from "@/lib/supabase/sync";

// Six characters that get a kid's work back on a different device.
//
// Deliberately weak: no password, and anyone holding the code can adopt the
// profile. That matches a supervised workshop and keeps the zero-login promise.
// It is only ever rendered on the kid's own profile screen, never in a list.
export function RecoveryCode() {
  const p = useProfile();
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "off">("loading");

  useEffect(() => {
    let cancelled = false;
    if (p.id === "server-profile") return;

    fetchRecoveryCode(p.id, p.displayName)
      .then((value) => {
        if (cancelled) return;
        if (value) {
          setCode(value);
          setState("idle");
        } else {
          setState("off");
        }
      })
      .catch(() => {
        if (!cancelled) setState("off");
      });

    return () => {
      cancelled = true;
    };
  }, [p.id, p.displayName]);

  if (state === "off") return null;

  return (
    <div className="rounded-lg border-2 border-dashed border-steppe/20 bg-white/70 p-4 text-center">
      <p className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-wolf">
        <KeyRound size={13} /> Your code
      </p>
      {state === "loading" || !code ? (
        <Loader2 size={20} className="mx-auto mt-2 animate-spin text-wolf" />
      ) : (
        <p className="mt-1 font-mono text-3xl font-black tracking-[0.3em] text-steppe">
          {code}
        </p>
      )}
      <p className="mt-2 text-xs font-semibold text-wolf">
        Type this on a different phone or tablet to get your drawings and homework
        back. Keep it to yourself.
      </p>
    </div>
  );
}
