"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { VOCAB, vocabByCategory, imgFor, CATEGORIES, type VocabCategory, type VocabItem } from "@/content/vocab";
import { sample, shuffle } from "@/lib/utils";
import { playCorrect, playWrong, speakWord, playWin } from "@/lib/audio";
import { store } from "@/lib/store";

type Mode = "image-kk" | "en-kk";
const MODE_LABEL: Record<Mode, string> = {
  "image-kk": "Picture → Kazakh",
  "en-kk": "English → Kazakh",
};
const ROUND_SIZE = 6;

function initialRound(source: VocabItem[]) {
  return source.slice(0, ROUND_SIZE);
}

function cardFace(item: VocabItem, mode: Mode) {
  if (mode === "image-kk") return <img src={imgFor(item)} alt={item.en} className="h-20 w-20" />;
  return <span className="text-xl font-black text-steppe">{item.en}</span>;
}
function labelText(item: VocabItem, mode: Mode) {
  if (mode === "image-kk") return item.kk;
  return item.kk;
}

function pool(cat: string | null): VocabItem[] {
  if (cat && (CATEGORIES as string[]).includes(cat)) {
    const items = vocabByCategory(cat as VocabCategory);
    return items.length >= ROUND_SIZE ? items : VOCAB;
  }
  return VOCAB;
}

function SozdikMatchInner() {
  const cat = useSearchParams().get("cat");
  const source = useMemo(() => pool(cat), [cat]);
  const [mode, setMode] = useState<Mode>("image-kk");
  const [round, setRound] = useState(() => initialRound(source));
  const [labels, setLabels] = useState(() => [...initialRound(source)].reverse());
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [nudge, setNudge] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const done = matched.size === round.length;
  const elapsed = useMemo(() => Math.round((Date.now() - startedAt) / 1000), [done, startedAt]); // recompute on finish

  function reset(newMode = mode) {
    const r = sample(source, ROUND_SIZE);
    setRound(r);
    setLabels(shuffle(r));
    setMatched(new Set());
    setAttempts(0);
    setCorrect(0);
    setStartedAt(Date.now());
    setMode(newMode);
  }

  function handleDrop(item: VocabItem, point: { x: number; y: number }) {
    // find card under the drop point
    let hit: string | null = null;
    for (const [slug, el] of cardRefs.current) {
      const r = el.getBoundingClientRect();
      if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) {
        hit = slug;
        break;
      }
    }
    setAttempts((a) => a + 1);
    if (hit === item.slug) {
      const next = new Set(matched).add(item.slug);
      setMatched(next);
      setCorrect((c) => c + 1);
      setLabels((ls) => ls.filter((l) => l.slug !== item.slug));
      speakWord(item.kk);
      playCorrect();
      if (next.size === round.length) {
        playWin();
        store.recordGameRun({
          game: "sozdik-match",
          score: 50,
          vocabSeen: round.map((r) => r.slug),
          vocabCorrect: round.map((r) => r.slug),
        });
      }
      return true;
    }
    playWrong();
    setNudge(item.slug);
    setTimeout(() => setNudge(null), 400);
    return false;
  }

  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 100;

  return (
    <GameShell
      title="Word Match"
      kk="Сөз сәйкестік"
      right={<Scoreboard label="✓" value={`${matched.size}/${round.length}`} />}
    >
      {done && accuracy === 100 && <Confetti />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => reset(m)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                mode === m ? "bg-steppe text-warm" : "bg-felt text-steppe hover:bg-steppe/10"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-3 text-sm font-extrabold text-wolf">
          <span>Accuracy {accuracy}%</span>
        </div>
      </div>

      {/* Cards (drop targets) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {round.map((item) => {
          const isMatched = matched.has(item.slug);
          return (
            <div
              key={item.slug}
              ref={(el) => {
                if (el) cardRefs.current.set(item.slug, el);
                else cardRefs.current.delete(item.slug);
              }}
              className={`flex h-28 items-center justify-center rounded-3xl border-4 p-2 text-center transition ${
                isMatched
                  ? "border-gold bg-gold/20"
                  : "border-dashed border-steppe/30 bg-felt"
              }`}
            >
              <AnimatePresence>
                {isMatched ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-1"
                  >
                    {cardFace(item, mode)}
                    <span className="text-xs font-black text-steppe-700">{item.kk}</span>
                  </motion.div>
                ) : (
                  cardFace(item, mode)
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Labels (draggable) */}
      <div className="mt-6 flex min-h-[64px] flex-wrap justify-center gap-3">
        {labels.map((item) => (
          <motion.button
            key={item.slug}
            drag
            dragSnapToOrigin
            whileDrag={{ scale: 1.1, zIndex: 30 }}
            onDragEnd={(_, info) => handleDrop(item, info.point)}
            animate={nudge === item.slug ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            className="cursor-grab touch-none rounded-2xl bg-steppe px-5 py-3 text-lg font-black text-warm shadow-md active:cursor-grabbing"
          >
            {labelText(item, mode)}
          </motion.button>
        ))}
      </div>

      {done && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-3xl bg-steppe p-6 text-center text-warm"
        >
          <div className="text-2xl font-black text-gold">Жарайсың! Great job!</div>
          <div className="mt-1">
            {round.length} pairs in {elapsed}s · {accuracy}% accuracy
          </div>
          <Button variant="gold" size="lg" className="mt-4" onClick={() => reset()}>
            Play again
          </Button>
        </motion.div>
      )}
    </GameShell>
  );
}

export default function SozdikMatch() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-warm" />}>
      <SozdikMatchInner />
    </Suspense>
  );
}
