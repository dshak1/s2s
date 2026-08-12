"use client";

import { gameStatsFor, useProfile } from "@/lib/store";

/** "Played 4 · Best 120 · Avg 85" — lifetime progress for one game slug. */
export function GameStatsLine({ slug }: { slug: string }) {
  const profile = useProfile();
  const stats = gameStatsFor(profile, slug);
  if (stats.plays === 0) return null;
  return (
    <div className="flex items-center justify-center gap-3 text-xs font-black text-warm/70">
      <span>Played {stats.plays}×</span>
      <span className="text-warm/30">·</span>
      <span>Best {stats.best}</span>
      <span className="text-warm/30">·</span>
      <span>Avg {stats.average}</span>
    </div>
  );
}
