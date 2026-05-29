"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sessions } from "@/lib/sessions";
import { makeSessionCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Recent = { code: string; createdAt: number; count: number };

export default function FacilitatorHome() {
  const router = useRouter();
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    const week = Date.now() - 7 * 24 * 3600 * 1000;
    const list: Recent[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("s2s_session_")) {
        try {
          const s = JSON.parse(localStorage.getItem(k)!);
          if (s.createdAt > week) list.push({ code: s.code, createdAt: s.createdAt, count: s.members?.length ?? 0 });
        } catch {
          /* ignore */
        }
      }
    }
    setRecent(list.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  function startSession() {
    const code = makeSessionCode();
    sessions.create(code);
    router.push(`/facilitator/${code}/live`);
  }

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <header className="bg-steppe px-6 py-4 text-warm">
        <Link href="/" className="text-xl font-black">Steppe to Screen — Facilitator</Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-black text-steppe">Run a workshop</h1>
        <p className="mt-1 text-wolf">Start a session, project the code, and drive the games from here.</p>
        <Button variant="gold" size="lg" className="mt-4" onClick={startSession}>+ Start new session</Button>

        <h2 className="mt-10 mb-2 text-lg font-bold text-steppe">Last 7 days</h2>
        {recent.length === 0 ? (
          <p className="text-wolf">No recent sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <Link
                key={r.code}
                href={`/facilitator/${r.code}/live`}
                className="flex items-center justify-between rounded-2xl bg-felt px-4 py-3 hover:bg-gold/30"
              >
                <span className="text-xl font-black tracking-widest text-steppe">{r.code}</span>
                <span className="text-sm text-wolf">
                  {new Date(r.createdAt).toLocaleDateString()} · {r.count} kids
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
