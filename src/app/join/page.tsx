"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { store } from "@/lib/store";
import { sessions } from "@/lib/sessions";
import { Button } from "@/components/ui/button";
import { ComingSoon } from "@/components/coming-soon";
import { ONLINE_FEATURES_ENABLED } from "@/lib/online-features";

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [table, setTable] = useState("1");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalCode = code || "DEMO";
    store.joinSession(finalCode, name, table);
    const p = store.get();
    const avatar = p.artifacts.find((a) => a.id === p.avatarArtifactId)?.dataUrl ?? null;
    sessions.registerJoin(finalCode, { id: p.id, name: p.displayName, table, avatar });
    router.push(`/profile/${p.id}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-felt p-6 shadow-lg">
      <label className="text-sm font-bold text-steppe-700">
        Session code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD"
          maxLength={6}
          className="mt-1 w-full rounded-2xl border-2 border-steppe/30 bg-white px-4 py-3 text-center text-2xl font-black tracking-widest uppercase outline-none focus:border-steppe"
        />
      </label>
      <label className="text-sm font-bold text-steppe-700">
        Your first name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Asay"
          className="mt-1 w-full rounded-2xl border-2 border-steppe/30 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-steppe"
        />
      </label>
      <label className="text-sm font-bold text-steppe-700">
        Table number
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="mt-1 w-full rounded-2xl border-2 border-steppe/30 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-steppe"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={String(n)}>Table {n}</option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="gold" size="lg" disabled={!name.trim()}>
        Join live round
      </Button>
    </form>
  );
}

export default function JoinPage() {
  if (!ONLINE_FEATURES_ENABLED) {
    return <ComingSoon title="Live sessions" detail="Facilitator-led group play is on its way. For now, jump into any game solo from Play." />;
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-steppe px-6 py-10 text-warm">
      <p className="text-xs font-black uppercase tracking-wider text-gold">Live group game</p>
      <h1 className="text-3xl font-black">Join a session</h1>
      <p className="max-w-sm text-center text-warm/80">Enter the code on the projector. Your facilitator will start the round.</p>
      <Suspense fallback={<div className="text-warm/70">Loading…</div>}>
        <JoinForm />
      </Suspense>
    </div>
  );
}
