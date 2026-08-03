"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flag, Heart, Trophy } from "lucide-react";
import { useSession } from "@/lib/sessions";
import { openRaceChannel, type RaceProgressPayload } from "@/lib/supabase/sync";

// Projector view for a live Say & Shift race: one lane per table, a runner
// icon at each table's furthest-along progress. Pure broadcast (see
// openRaceChannel) — no table write, so lanes appear the instant a table's
// device sends its first wall, and reordering as tables pull ahead is the
// whole point of putting this on a screen.

type Lane = { table: string; name: string; wallIndex: number; totalWalls: number; lives: number; finished: boolean };

export default function RaceProjector() {
  const { code } = useParams<{ code: string }>();
  const session = useSession(code);
  const [progress, setProgress] = useState<Record<string, RaceProgressPayload>>({});
  const channelRef = useRef<ReturnType<typeof openRaceChannel> | null>(null);

  useEffect(() => {
    const channel = openRaceChannel(code, {
      progress: (payload) => {
        setProgress((prev) => ({ ...prev, [payload.profileId]: payload }));
      },
    });
    channelRef.current = channel;
    return () => channel.close();
  }, [code]);

  // One lane per table that has either joined or reported progress — joining
  // first (via the roster) means a table's lane exists before anyone there
  // has said a word, so the room sees "Table 3 is in" right away.
  const tables = new Set<string>();
  session.members.forEach((m) => tables.add(m.table));
  Object.values(progress).forEach((p) => tables.add(p.table));

  const lanes: Lane[] = [...tables].map((table) => {
    const entries = Object.values(progress).filter((p) => p.table === table);
    const best = entries.reduce<RaceProgressPayload | null>((max, p) => {
      if (!max) return p;
      if (p.finished && !max.finished) return p;
      if (p.finished === max.finished && p.wallIndex > max.wallIndex) return p;
      return max;
    }, null);
    const member = session.members.find((m) => m.table === table);
    return {
      table,
      name: best?.name ?? member?.name ?? `Table ${table}`,
      wallIndex: best?.wallIndex ?? 0,
      totalWalls: best?.totalWalls ?? 6,
      lives: best?.lives ?? 3,
      finished: best?.finished ?? false,
    };
  });

  const ranked = [...lanes].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.wallIndex / b.totalWalls - a.wallIndex / a.totalWalls;
  });

  return (
    <div className="min-h-dvh bg-steppe font-admin text-warm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-5">
        <div>
          <Link href={`/facilitator/${code}/live`} className="mb-1 flex items-center gap-1 text-sm font-bold text-warm/60 hover:text-warm">
            <ArrowLeft size={14} /> Back to console
          </Link>
          <div className="flex items-center gap-2 text-2xl font-black">
            <Flag size={22} className="text-gold" /> Say &amp; Shift — live race
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-gold">Session</div>
          <div className="text-4xl font-black tracking-[0.2em]">{code}</div>
        </div>
      </div>

      <div className="px-8 py-8">
        {ranked.length === 0 ? (
          <p className="text-lg text-warm/60">Waiting for a table to start Say &amp; Shift…</p>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {ranked.map((lane, rank) => {
                const pct = Math.min(100, Math.round((lane.wallIndex / Math.max(1, lane.totalWalls)) * 100));
                return (
                  <motion.div key={lane.table} layout transition={{ type: "spring", stiffness: 260, damping: 30 }}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-lg font-black">
                        {rank === 0 && lane.wallIndex > 0 && <Trophy size={18} className="text-gold" />}
                        Table {lane.table} <span className="font-bold text-warm/60">· {lane.name}</span>
                      </span>
                      <span className="flex items-center gap-3 text-sm font-bold text-warm/70">
                        {[0, 1, 2].map((h) => (
                          <Heart key={h} size={14} className={h < lane.lives ? "fill-terra text-terra" : "text-warm/20"} />
                        ))}
                        {lane.finished ? "Finished!" : `Wall ${Math.min(lane.wallIndex + 1, lane.totalWalls)} / ${lane.totalWalls}`}
                      </span>
                    </div>
                    <div className="relative h-10 overflow-hidden rounded-full bg-white/10">
                      <div className="absolute inset-y-0 right-0 w-1 bg-gold/70" />
                      <motion.div
                        className="absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-gold text-lg shadow-lg"
                        animate={{ left: `calc(${pct}% - ${pct === 100 ? 32 : 16}px)` }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      >
                        🏃
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
