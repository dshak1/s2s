"use client";

import Link from "next/link";
import { useProfile } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { Flame, Star } from "lucide-react";

export function TopNav() {
  const p = useProfile();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-steppe px-4 py-3 text-warm shadow-md">
      <Link href="/play" className="text-xl font-black">
        Steppe<span className="text-gold">2</span>Screen
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-extrabold">
          <Star size={15} className="text-gold" /> {p.xp}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-extrabold">
          <Flame size={15} className="text-gold" /> {p.streakWeeks}
        </span>
        <Link href={`/profile/${p.id}`}>
          <Avatar size={40} />
        </Link>
      </div>
    </header>
  );
}
