"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function GameShell({
  title,
  kk,
  children,
  right,
}: {
  title: string;
  kk?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-warm">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-steppe px-4 py-3 text-warm shadow-md">
        <Link href="/play" className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25">
          <ArrowLeft size={18} /> Games
        </Link>
        <div className="text-center leading-tight">
          <div className="text-lg font-extrabold sm:text-xl">{title}</div>
          {kk && <div className="text-xs text-gold sm:text-sm">{kk}</div>}
        </div>
        <div className="min-w-[80px] text-right">{right}</div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export function Scoreboard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-extrabold">
      <span className="text-gold">{label} </span>
      {value}
    </div>
  );
}
