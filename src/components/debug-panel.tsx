"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Star, Trophy, Unlock, X, Zap } from "lucide-react";
import { store, useProfile } from "@/lib/store";
import { JOURNEY } from "@/content/journey";

export function DebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const profile = useProfile();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const on = params.has("debug") || localStorage.getItem("s2s_debug") === "1";
    setEnabled(on);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Debug panel"
        className="fixed bottom-4 right-4 z-[99] grid h-12 w-12 place-items-center rounded-full bg-terra text-white shadow-xl shadow-terra/50 transition hover:scale-110"
      >
        {open ? <X size={20} /> : <Zap size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-[99] w-72 rounded-2xl bg-steppe-900 p-4 text-warm shadow-2xl ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-gold">⚡ Debug Mode</span>
            <span className="text-xs text-warm/60">XP: {profile.xp.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => store.debugUnlockAll()}
              className="flex w-full items-center gap-2 rounded-xl bg-gold px-3 py-2.5 text-sm font-black text-steppe-700 transition hover:brightness-110"
            >
              <Unlock size={14} /> Max XP + Unlock All Weeks
            </button>
            <button
              onClick={() => store.debugAwardAllBadges()}
              className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-black text-warm transition hover:bg-white/20"
            >
              <Trophy size={14} /> Award All Badges
            </button>
            <button
              onClick={() => store.debugMaxXp()}
              className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-black text-warm transition hover:bg-white/20"
            >
              <Star size={14} /> +99,999 XP
            </button>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-warm/50">
              Jump to week
            </div>
            <div className="flex flex-wrap gap-1.5">
              {JOURNEY.map((stop, i) => (
                <button
                  key={stop.id}
                  onClick={() => store.debugSetWeek(i + 1)}
                  title={stop.name}
                  className={`rounded-full px-2.5 py-1 text-xs font-black transition ${
                    profile.unlockedWeeks === i + 1
                      ? "bg-gold text-steppe-700"
                      : "bg-white/10 text-warm hover:bg-white/25"
                  }`}
                >
                  W{i + 1}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => store.reset()}
            className="mt-3 flex w-full items-center gap-2 rounded-xl bg-terra/80 px-3 py-2.5 text-sm font-black text-white transition hover:bg-terra"
          >
            <RotateCcw size={14} /> Reset Profile
          </button>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs">
            <span className="text-warm/50">Persist debug across sessions</span>
            <button
              onClick={() => {
                const active = localStorage.getItem("s2s_debug") === "1";
                if (active) localStorage.removeItem("s2s_debug");
                else localStorage.setItem("s2s_debug", "1");
              }}
              className="ml-auto font-black text-gold hover:text-gold/80"
            >
              Toggle
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-warm/30">
            Add ?debug to any URL to show this panel
          </p>
        </div>
      )}
    </>
  );
}
