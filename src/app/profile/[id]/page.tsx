"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TopNav } from "@/components/top-nav";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui/card";
import { YurtSVG, YURT_TOTAL } from "@/components/yurt";
import { VOCAB, CATEGORIES, CATEGORY_LABELS, vocabByCategory, type VocabCategory } from "@/content/vocab";
import { BADGES } from "@/content/badges";
import { GAMES } from "@/content/games";
import { useProfile, masteredLetterCount, isVocabMastered } from "@/lib/store";
import { Snowflake } from "lucide-react";

export default function ProfilePage() {
  const p = useProfile();
  const masteredVocab = VOCAB.filter((v) => isVocabMastered(p, v.slug)).length;
  const letters = masteredLetterCount(p);
  const earned = new Set(p.badges);

  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* header */}
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-steppe p-6 text-warm sm:flex-row sm:items-center">
          <Avatar size={88} />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-black">{p.displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="rounded-full bg-gold px-3 py-1 font-black text-steppe-700">{p.xp} XP</span>
              <span className="flex items-center gap-1 font-bold">
                Streak:
                {Array.from({ length: Math.max(1, p.streakWeeks) }).map((_, i) => (
                  <Snowflake key={i} size={18} className="text-gold" />
                ))}
                <span className="text-warm/70">({p.streakWeeks} wks)</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/play" className="rounded-full bg-gold px-5 py-2.5 font-black text-steppe-700">Play games</Link>
            <Link href={`/profile/${p.id}/certificate`} className="rounded-full bg-white/20 px-5 py-2.5 font-black text-warm">🏅 Certificate</Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* mastery */}
          <Card>
            <h2 className="mb-1 text-lg font-black text-steppe">Word mastery</h2>
            <p className="mb-3 text-sm text-wolf">{masteredVocab} / {VOCAB.length} words mastered</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat: VocabCategory) => {
                const total = vocabByCategory(cat).length;
                const done = vocabByCategory(cat).filter((v) => isVocabMastered(p, v.slug)).length;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-bold text-steppe-700">
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <span>{done}/{total}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-steppe/15">
                      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* yurt */}
          <Card>
            <h2 className="mb-1 text-lg font-black text-steppe">Yurt builder</h2>
            <p className="mb-2 text-sm text-wolf">{letters} / {YURT_TOTAL} letters mastered</p>
            <YurtSVG mastered={letters} className="mx-auto w-full max-w-xs" />
          </Card>
        </div>

        {/* badge case */}
        <Card>
          <h2 className="mb-3 text-lg font-black text-steppe">Badge case</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {BADGES.map((b) => {
              const got = earned.has(b.id);
              return (
                <div key={b.id} className={`rounded-2xl p-3 text-center ${got ? "bg-gold/25" : "bg-black/5 opacity-60"}`} title={got ? b.name : b.hint}>
                  <div className={`text-3xl ${got ? "text-gold" : "text-wolf/40 grayscale"}`}>{b.symbol}</div>
                  <div className="mt-1 text-[11px] font-bold leading-tight text-steppe-700">{got ? b.name : "Locked"}</div>
                  {!got && <div className="mt-0.5 text-[10px] leading-tight text-wolf">{b.hint}</div>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* last played */}
        <div>
          <h2 className="mb-3 text-lg font-black text-steppe">Jump back in</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {GAMES.map((g) => (
              <Link key={g.slug} href={g.href} className={`min-w-[160px] rounded-2xl ${g.accent} p-4 text-warm`}>
                <div className="text-xs font-bold text-gold">{g.kk}</div>
                <div className="font-black">{g.title}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* gallery */}
        <Card>
          <h2 className="mb-3 text-lg font-black text-steppe">My gallery</h2>
          {p.artifacts.length === 0 ? (
            <p className="text-sm text-wolf">
              Nothing yet — design an avatar or make a comic and it&apos;ll appear here.{" "}
              <Link href="/play/tanba-studio" className="font-bold text-steppe underline">Start drawing →</Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {p.artifacts.map((a) => (
                <motion.div key={a.id} whileHover={{ scale: 1.05 }} className="overflow-hidden rounded-2xl border-2 border-steppe/20 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.dataUrl} alt={a.kind} className="aspect-square w-full object-cover" />
                  <div className="bg-felt py-0.5 text-center text-[10px] font-bold text-steppe-700">{a.kind}</div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <p className="pb-6 text-center text-xs text-wolf">
          Want this to follow you to a new device?{" "}
          <Link href={`/profile/${p.id}/parent`} className="font-bold text-steppe underline">Add a parent email →</Link>
        </p>
      </main>
    </div>
  );
}
