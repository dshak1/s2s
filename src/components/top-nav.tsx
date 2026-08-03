"use client";

import Link from "next/link";
import { useProfile } from "@/lib/store";
import { IS_LITE } from "@/lib/lite";
import { Avatar } from "@/components/avatar";
import { BookOpenCheck, Flame, Star } from "lucide-react";

export function TopNav() {
  const p = useProfile();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/70 bg-white/75 px-3 py-3 text-steppe shadow-[0_10px_26px_rgba(30,77,140,.12)] backdrop-blur-md sm:px-4">
      <Link href="/play" className="flex items-center gap-1.5 text-base font-black sm:text-xl">
        <span>Steppe</span>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-xs font-black text-steppe-700 shadow-[2px_2px_0_0_#b8960a] sm:h-7 sm:w-7 sm:text-sm">2</span>
        <span>Screen</span>
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-3">
        {!IS_LITE && (
          <>
            <Link
              href="/homework"
              title="Turn in homework"
              className="flex items-center gap-1 rounded-lg border border-steppe/10 bg-white/80 px-2 py-1 text-sm font-extrabold shadow-sm hover:bg-[#fff3cf] sm:px-3"
            >
              <BookOpenCheck size={15} className="text-steppe" />
            </Link>
          </>
        )}
        <span className="flex items-center gap-1 rounded-lg border border-steppe/10 bg-white/80 px-2 py-1 text-sm font-extrabold shadow-sm sm:px-3">
          <Star size={15} className="text-[#ff9a4f]" /> {p.xp}
        </span>
        {!IS_LITE && (
          <span className="flex items-center gap-1 rounded-lg border border-steppe/10 bg-white/80 px-2 py-1 text-sm font-extrabold shadow-sm sm:px-3">
            <Flame size={15} className="text-[#ff6f9f]" /> {p.streakWeeks}
          </span>
        )}
        {IS_LITE ? (
          <Avatar size={36} />
        ) : (
          <Link href={`/profile/${p.id}`} aria-label="Open player profile" title="Player profile">
            <Avatar size={36} />
          </Link>
        )}
      </div>
    </header>
  );
}
