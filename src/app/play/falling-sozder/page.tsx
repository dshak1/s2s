"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { VOCAB, VOCAB_CATEGORY_META, type VocabCategory, type VocabItem } from "@/content/vocab";
import { shuffle } from "@/lib/utils";
import { playCorrect, playWrong, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { vocabItemId } from "@/lib/items";
import { Heart, Trophy } from "lucide-react";

const FIELD = 380; // px fall distance before "ground"
const MAX_MISS = 3;
const MAX_LEVEL = 10;
const CATCHES_PER_LEVEL = 6; // catches to advance a level, no pause between
const WORDS_AT_START = 3;
const WORDS_PER_LEVEL = 2; // new words layered in at each level-up
const BASE_SPEED = 62; // px/sec, every level starts here…
const RAMP_PER_CATCH = 11; // …and ramps as you catch words within the level
const RAMP_LEVEL_BONUS = 1.5; // higher levels ramp a little steeper

const BEST_KEY = "s2s.falling.best.v2";

// All the vocab packs plus a mixed pack that draws from every category.
type PackKey = VocabCategory | "random";
const PACKS: Array<{ key: PackKey; kk: string; en: string; emoji: string }> = [
  { key: "random", kk: "Аралас", en: "Random Mix", emoji: "🎲" },
  ...VOCAB_CATEGORY_META,
];

function readBests(): Partial<Record<PackKey, number>> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

type Phase = "pick" | "play" | "over" | "mastered";

export default function FallingSozder() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState<PackKey>("family");
  const [bests, setBests] = useState<Partial<Record<PackKey, number>>>({});
  const [catches, setCatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [level, setLevel] = useState(1);
  const [baskets, setBaskets] = useState<VocabItem[]>([]);
  const [current, setCurrent] = useState<VocabItem | null>(null);
  const [banner, setBanner] = useState<{ level: number; words: string[] } | null>(null);
  const [y, setY] = useState(0);
  const [x, setX] = useState(50);

  const raf = useRef(0);
  const yRef = useRef(0);
  const lastTs = useRef(0);
  // Telemetry: when the current word started falling.
  const spawnedAt = useRef(0);
  const phaseRef = useRef<Phase>("pick");
  const currentRef = useRef<VocabItem | null>(null);
  const lastSlug = useRef<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Level/word-pool state lives in refs so the rAF loop reads fresh values.
  const deck = useRef<VocabItem[]>([]); // full category deck, in intro order
  const pool = useRef<VocabItem[]>([]); // words active at the current level
  const freshSlugs = useRef<Set<string>>(new Set()); // introduced this level → spawn more often
  const wrongCount = useRef<Map<string, number>>(new Map());
  const rightCount = useRef<Map<string, number>>(new Map());
  const seen = useRef<Set<string>>(new Set());
  const correctSet = useRef<Set<string>>(new Set());
  const catchesRef = useRef(0);
  const missesRef = useRef(0);
  const levelRef = useRef(1);
  const catchesInLevel = useRef(0);

  useEffect(() => {
    setBests(readBests());
    return () => {
      cancelAnimationFrame(raf.current);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  // Weighted pick: fresh words show up often, words you missed come back,
  // mastered words fade — and the same word never falls twice in a row.
  const pickTarget = useCallback(() => {
    const candidates = pool.current.filter((w) => pool.current.length === 1 || w.slug !== lastSlug.current);
    const weights = candidates.map((w) => {
      if (freshSlugs.current.has(w.slug)) return 3;
      const wrong = wrongCount.current.get(w.slug) ?? 0;
      const right = rightCount.current.get(w.slug) ?? 0;
      if (wrong > 0) return 1 + 1.5 * wrong;
      return right >= 3 ? 0.5 : 1;
    });
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }, []);

  const spawn = useCallback(() => {
    const target = pickTarget();
    const distractors = shuffle(pool.current.filter((w) => w.slug !== target.slug)).slice(0, 2);
    setBaskets(shuffle([target, ...distractors]));
    currentRef.current = target;
    setCurrent(target);
    lastSlug.current = target.slug;
    seen.current.add(target.slug);
    yRef.current = 0;
    setY(0);
    setX(15 + Math.random() * 70);
    spawnedAt.current = Date.now();
  }, [pickTarget]);

  const saveBest = useCallback(
    (cat: PackKey, reached: number) => {
      const next = { ...readBests() };
      if ((next[cat] ?? 0) < reached) {
        next[cat] = reached;
        try {
          localStorage.setItem(BEST_KEY, JSON.stringify(next));
        } catch {}
      }
      setBests(next);
    },
    [],
  );

  const finish = useCallback(
    (end: "over" | "mastered") => {
      phaseRef.current = end;
      setPhase(end);
      cancelAnimationFrame(raf.current);
      saveBest(category, levelRef.current);
      store.recordGameRun({
        game: "falling-sozder",
        score: catchesRef.current * 5 + (end === "mastered" ? 50 : 0),
        vocabSeen: [...seen.current],
        vocabCorrect: [...correctSet.current],
      });
    },
    [category, saveBest],
  );

  const loopRef = useRef<(ts: number) => void>(() => {});
  const loop = useCallback(
    (ts: number) => {
      if (phaseRef.current !== "play") return;
      if (!lastTs.current) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      // Every level starts at BASE_SPEED and ramps per catch; the ramp gets a
      // touch steeper at higher levels so late levels end harder.
      const ramp = RAMP_PER_CATCH + RAMP_LEVEL_BONUS * (levelRef.current - 1);
      const speed = BASE_SPEED + ramp * catchesInLevel.current;
      yRef.current += speed * dt;
      setY(yRef.current);
      if (yRef.current >= FIELD) {
        playWrong();
        if (currentRef.current) {
          logAnswer({
            gameSlug: "falling-sozder",
            itemId: vocabItemId(currentRef.current),
            promptKind: "text",
            response: null, // ran out of time rather than picking wrong
            isCorrect: false,
            latencyMs: spawnedAt.current ? Date.now() - spawnedAt.current : null,
            attemptIndex: catchesRef.current + missesRef.current + 1,
          });
        }
        missesRef.current += 1;
        setMisses(missesRef.current);
        if (missesRef.current >= MAX_MISS) {
          finish("over");
          return;
        }
        spawn();
        lastTs.current = ts;
      }
      raf.current = requestAnimationFrame(loopRef.current);
    },
    [finish, spawn],
  );
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  function start(cat: PackKey) {
    const catDeck = cat === "random" ? VOCAB : VOCAB.filter((w) => w.category === cat);
    deck.current = shuffle(catDeck);
    pool.current = deck.current.slice(0, WORDS_AT_START);
    freshSlugs.current = new Set(pool.current.map((w) => w.slug));
    wrongCount.current = new Map();
    rightCount.current = new Map();
    seen.current = new Set();
    correctSet.current = new Set();
    catchesRef.current = 0;
    missesRef.current = 0;
    levelRef.current = 1;
    catchesInLevel.current = 0;
    lastSlug.current = null;
    setCategory(cat);
    setCatches(0);
    setMisses(0);
    setLevel(1);
    setBanner(null);
    phaseRef.current = "play";
    setPhase("play");
    spawn();
    lastTs.current = 0;
    raf.current = requestAnimationFrame(loop);
  }

  function levelUp() {
    levelRef.current += 1;
    catchesInLevel.current = 0;
    setLevel(levelRef.current);
    if (levelRef.current > MAX_LEVEL) {
      finish("mastered");
      return false;
    }
    // Layer in new words; once the deck is exhausted the level-ups are pure speed.
    const nextWords = deck.current.slice(pool.current.length, pool.current.length + WORDS_PER_LEVEL);
    pool.current = [...pool.current, ...nextWords];
    freshSlugs.current = new Set(nextWords.map((w) => w.slug));
    setBanner({ level: levelRef.current, words: nextWords.map((w) => w.kk) });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 2400);
    return true;
  }

  function tapBasket(item: VocabItem) {
    if (phaseRef.current !== "play" || !currentRef.current) return;
    const target = currentRef.current;
    logAnswer({
      gameSlug: "falling-sozder",
      itemId: vocabItemId(target),
      promptKind: "text",
      response: item.slug,
      isCorrect: item.slug === target.slug,
      latencyMs: spawnedAt.current ? Date.now() - spawnedAt.current : null,
      attemptIndex: catchesRef.current + missesRef.current + 1,
    });
    if (item.slug === target.slug) {
      playCorrect();
      speakWord(item.kk);
      correctSet.current.add(item.slug);
      rightCount.current.set(item.slug, (rightCount.current.get(item.slug) ?? 0) + 1);
      freshSlugs.current.delete(item.slug);
      store.catchWord(true);
      catchesRef.current += 1;
      catchesInLevel.current += 1;
      setCatches(catchesRef.current);
      if (catchesRef.current === 8) store.awardWordCatcher();
      if (catchesInLevel.current >= CATCHES_PER_LEVEL) {
        if (!levelUp()) return; // category mastered
      }
      spawn();
      lastTs.current = 0;
    } else {
      playWrong();
      wrongCount.current.set(target.slug, (wrongCount.current.get(target.slug) ?? 0) + 1);
      missesRef.current += 1;
      setMisses(missesRef.current);
      if (missesRef.current >= MAX_MISS) finish("over");
    }
  }

  const meta = PACKS.find((c) => c.key === category)!;
  const playing = phase === "play";

  return (
    <GameShell
      title="Falling Words"
      kk="Құлайтын сөздер"
      right={<Scoreboard label="Lvl" value={level} />}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_MISS }).map((_, i) => (
            <Heart key={i} size={22} className={i < MAX_MISS - misses ? "fill-terra text-terra" : "text-wolf/40"} />
          ))}
        </div>
        {playing && (
          <span className="rounded-full bg-warm/90 px-3 py-1 text-xs font-black text-steppe shadow-sm">
            {meta.emoji} {meta.kk}
          </span>
        )}
        <span className="font-extrabold text-steppe">Caught: {catches}</span>
      </div>

      <div className="relative mx-auto overflow-hidden rounded-3xl bg-gradient-to-b from-steppe to-steppe-700" style={{ height: FIELD + 90 }}>
        {/* falling word */}
        <AnimatePresence>
          {playing && current && (
            <div
              className="absolute -translate-x-1/2 rounded-2xl bg-gold px-4 py-2 text-xl font-black text-steppe-700 shadow-lg"
              style={{ top: y, left: `${x}%` }}
            >
              {current.en}
            </div>
          )}
        </AnimatePresence>

        {/* level-up banner, floats over play without pausing the game */}
        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-16 z-10 mx-auto w-fit rounded-2xl bg-gold px-5 py-2 text-center shadow-lg"
            >
              <div className="text-lg font-black text-steppe-700">Деңгей {banner.level}!</div>
              {banner.words.length > 0 && (
                <div className="text-sm font-bold text-steppe-700/80">New words: {banner.words.join(" · ")}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* baskets, regenerated every drop: the answer + 2 words from the pool */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 p-3">
          {(playing ? baskets : []).map((b) => (
            <button
              key={b.slug}
              onClick={() => tapBasket(b)}
              className="rounded-2xl border-4 border-gold/60 bg-warm/95 py-3 text-center text-base font-black text-steppe shadow-md transition active:scale-95"
            >
              {b.kk}
            </button>
          ))}
        </div>

        {phase === "pick" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-steppe/85 p-4 text-center text-warm">
            <p className="text-2xl font-black">Pick a word pack</p>
            <p className="max-w-sm text-sm text-warm/85">
              Each pack starts with 3 words and adds more as you level up. Catch the Kazakh basket before the English word lands!
            </p>
            <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
              {PACKS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => start(c.key)}
                  className="rounded-2xl bg-warm/95 p-3 text-steppe shadow-md transition hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="text-2xl">{c.emoji}</div>
                  <div className="text-sm font-black">{c.kk}</div>
                  <div className="text-[11px] font-bold text-steppe/60">{c.en}</div>
                  {(bests[c.key] ?? 0) > 0 && (
                    <div className="mt-1 text-[11px] font-black text-terra">Best: Lvl {bests[c.key]}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === "over" || phase === "mastered") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-steppe/85 p-4 text-center text-warm">
            {phase === "mastered" ? (
              <>
                <Trophy size={44} className="text-gold" />
                <p className="text-3xl font-black">{meta.kk} mastered!</p>
                <p>You beat all {MAX_LEVEL} levels and caught {catches} words.</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black">Game over!</p>
                <p>
                  {meta.emoji} {meta.en}, you caught {catches} words and reached level {level}.
                </p>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="gold" size="lg" onClick={() => start(category)}>
                Play again
              </Button>
              <Button size="lg" onClick={() => { phaseRef.current = "pick"; setPhase("pick"); }}>
                Change pack
              </Button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
