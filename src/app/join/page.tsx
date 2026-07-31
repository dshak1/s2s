"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { store } from "@/lib/store";
import { sessions } from "@/lib/sessions";
import { Button } from "@/components/ui/button";
import { toastBus } from "@/lib/toast";

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
        Join the steppe!
      </Button>
    </form>
  );
}

// Been here before on a different phone or tablet? Six characters brings the
// whole gallery across.
function RecoverForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "notfound">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setState("busy");
    const result = await store.adoptByCode(code.trim());
    if (!result.ok) {
      setState("notfound");
      return;
    }
    toastBus.show({
      title: `Welcome back, ${result.name || "friend"}!`,
      body: "Your drawings and homework are here.",
      icon: "✨",
    });
    router.push(`/profile/${store.get().id}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border-2 border-warm/25 p-5">
      <p className="text-sm font-bold text-warm">Used a different device before?</p>
      <input
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setState("idle");
        }}
        placeholder="ABC123"
        maxLength={6}
        aria-label="Your code"
        className="w-full rounded-2xl border-2 border-warm/30 bg-white/10 px-4 py-3 text-center font-mono text-2xl font-black uppercase tracking-[0.25em] text-warm outline-none placeholder:text-warm/40 focus:border-warm"
      />
      {state === "notfound" && (
        <p className="text-center text-sm font-bold text-[#ffd0d0]">
          No one has that code. Check it and try again.
        </p>
      )}
      <Button type="submit" variant="outline" disabled={!code.trim() || state === "busy"}>
        {state === "busy" ? "Looking…" : "Get my stuff back"}
      </Button>
    </form>
  );
}

export default function JoinPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-steppe px-6 py-10 text-warm">
      <h1 className="text-3xl font-black">Join a Session</h1>
      <p className="text-warm/80">Type the code on the projector to join your table.</p>
      <Suspense fallback={<div className="text-warm/70">Loading…</div>}>
        <JoinForm />
      </Suspense>
      <RecoverForm />
    </div>
  );
}
