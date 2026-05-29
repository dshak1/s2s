"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TopNav } from "@/components/top-nav";
import { REGIONS } from "@/content/regions";
import { CATEGORY_LABELS } from "@/content/vocab";
import { useProfile } from "@/lib/store";

const KZ_OUTLINE =
  "M120 360 Q90 300 160 280 Q200 200 320 220 Q420 150 540 200 Q640 150 760 210 Q900 200 900 300 Q920 380 820 400 Q760 470 620 450 Q520 520 400 480 Q260 500 200 440 Q140 420 120 360 Z";

export default function DalaQuest() {
  const p = useProfile();
  const unlocked = new Set(p.regionProgress);

  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-3xl font-black text-steppe">Dala Quest</h1>
        <p className="mb-4 text-wolf">
          Explore the steppe. Tap a glowing region to learn its words. Unlock new lands as you go.
        </p>

        <div className="overflow-hidden rounded-3xl bg-steppe shadow-lg">
          <svg viewBox="0 0 1000 600" className="w-full">
            <path d={KZ_OUTLINE} fill="#173c6e" stroke="#FFD700" strokeWidth={4} strokeLinejoin="round" />
            {REGIONS.map((r) => {
              const open = unlocked.has(r.id);
              return (
                <g key={r.id} opacity={open ? 1 : 0.35}>
                  {open && (
                    <motion.circle
                      cx={r.x}
                      cy={r.y}
                      r={34}
                      fill="#FFD700"
                      opacity={0.3}
                      animate={{ r: [30, 44, 30], opacity: [0.35, 0.05, 0.35] }}
                      transition={{ duration: 2.4, repeat: Infinity }}
                    />
                  )}
                  <Link href={open ? `/quest/${r.id}` : "#"} aria-label={r.name}>
                    <circle
                      cx={r.x}
                      cy={r.y}
                      r={22}
                      fill={open ? "#FFD700" : "#5B6770"}
                      stroke="#FAF6E9"
                      strokeWidth={3}
                      className={open ? "cursor-pointer" : "cursor-not-allowed"}
                    />
                    <text x={r.x} y={r.y + 48} textAnchor="middle" fill="#FAF6E9" fontSize={22} fontWeight={800}>
                      {r.name}
                    </text>
                    {!open && (
                      <g stroke="#FAF6E9" strokeWidth={2.5} fill="none">
                        <rect x={r.x - 7} y={r.y - 2} width={14} height={11} rx={2} fill="#FAF6E9" stroke="none" />
                        <path d={`M${r.x - 4} ${r.y - 2} v-3 a4 4 0 0 1 8 0 v3`} />
                      </g>
                    )}
                  </Link>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REGIONS.map((r) => {
            const open = unlocked.has(r.id);
            return (
              <Link
                key={r.id}
                href={open ? `/quest/${r.id}` : "#"}
                className={`rounded-2xl p-4 text-center ${open ? "bg-felt hover:bg-gold/30" : "pointer-events-none bg-felt/50 opacity-60"}`}
              >
                <div className="font-black text-steppe">{r.name}</div>
                <div className="text-xs text-wolf">{CATEGORY_LABELS[r.category]}</div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
