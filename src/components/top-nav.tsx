"use client";

import Link from "next/link";
import { useProfile } from "@/lib/store";
import { IS_LITE } from "@/lib/lite";
import { Avatar } from "@/components/avatar";
import { Flame, Lightbulb, Star } from "lucide-react";

export function TopNav() {
  const p = useProfile();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/70 bg-white/75 px-4 py-3 text-steppe shadow-[0_10px_26px_rgba(30,77,140,.12)] backdrop-blur-md">
      <Link href="/play" className="text-xl font-black">
        Steppe<span className="text-[#ff8f4f]">2</span>Screen
      </Link>
      <div className="flex items-center gap-3">
        {!IS_LITE && (
          <Link
            href="/wishlist"
            title="Feature wishlist"
            className="hidden items-center gap-1 rounded-lg border border-steppe/10 bg-white/80 px-3 py-1 text-sm font-extrabold shadow-sm hover:bg-[#fff3cf] sm:flex"
          >
            <Lightbulb size={15} className="text-[#ff9a4f]" />
          </Link>
        )}
        <span className="flex items-center gap-1 rounded-lg border border-steppe/10 bg-white/80 px-3 py-1 text-sm font-extrabold shadow-sm">
          <Star size={15} className="text-[#ff9a4f]" /> {p.xp}
        </span>
        {!IS_LITE && (
          <span className="flex items-center gap-1 rounded-lg border border-steppe/10 bg-white/80 px-3 py-1 text-sm font-extrabold shadow-sm">
            <Flame size={15} className="text-[#ff6f9f]" /> {p.streakWeeks}
          </span>
        )}
        {IS_LITE ? (
          <Avatar size={40} />
        ) : (
          <Link href={`/profile/${p.id}`}>
            <Avatar size={40} />
          </Link>
        )}
      </div>
    </header>
  );
}
