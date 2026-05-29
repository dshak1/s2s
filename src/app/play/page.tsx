"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GAMES } from "@/content/games";
import { TopNav } from "@/components/top-nav";

export default function PlayHub() {
  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-1 text-3xl font-black text-steppe">Pick a game</h1>
        <p className="mb-6 text-wolf">Ten ways to learn Kazakh. Tap any tile to play.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {GAMES.map((g, i) => (
            <motion.div
              key={g.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={g.href}
                className={`group flex h-40 flex-col justify-between rounded-3xl ${g.accent} p-4 text-warm shadow-md transition hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="text-xs font-bold text-gold">{g.kk}</div>
                <div>
                  <div className="text-lg font-black leading-tight">{g.title}</div>
                  <div className="text-sm text-warm/80">{g.blurb}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
