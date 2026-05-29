"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { VOCAB, type VocabItem } from "@/content/vocab";
import { sample } from "@/lib/utils";
import { playCorrect, playWrong, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";
import { Heart } from "lucide-react";

const FIELD = 380; // px fall distance before "ground"
const MAX_MISS = 3;

export default function FallingSozder() {
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [catches, setCatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [level, setLevel] = useState(1);
  const [baskets, setBaskets] = useState<VocabItem[]>([]);
  const [current, setCurrent] = useState<VocabItem | null>(null);
  const [y, setY] = useState(0);
  const [x, setX] = useState(50);

  const raf = useRef(0);
  const yRef = useRef(0);
  const lastTs = useRef(0);
  const runningRef = useRef(false);
  const currentRef = useRef<VocabItem | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const correctSet = useRef<Set<string>>(new Set());
  const catchesRef = useRef(0);
  const missesRef = useRef(0);
  const levelRef = useRef(1);

  const spawn = useCallback(() => {
    const trio = baskets.length ? baskets : sample(VOCAB, 3);
    const pick = trio[Math.floor(Math.random() * trio.length)];
    currentRef.current = pick;
    setCurrent(pick);
    seen.current.add(pick.slug);
    yRef.current = 0;
    setY(0);
    setX(15 + Math.random() * 70);
  }, [baskets]);

  const endGame = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    setOver(true);
    cancelAnimationFrame(raf.current);
    store.recordGameRun({
      game: "falling-sozder",
      score: catchesRef.current * 5,
      vocabSeen: [...seen.current],
      vocabCorrect: [...correctSet.current],
    });
  }, []);

  const loop = useCallback(
    (ts: number) => {
      if (!runningRef.current) return;
      if (!lastTs.current) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      const speed = 70 + levelRef.current * 26; // px/sec
      yRef.current += speed * dt;
      setY(yRef.current);
      if (yRef.current >= FIELD) {
        // missed
        playWrong();
        missesRef.current += 1;
        setMisses(missesRef.current);
        if (missesRef.current >= MAX_MISS) {
          endGame();
          return;
        }
        spawn();
        lastTs.current = ts;
      }
      raf.current = requestAnimationFrame(loop);
    },
    [endGame, spawn],
  );

  function start() {
    const trio = sample(VOCAB, 3);
    setBaskets(trio);
    setCatches(0);
    setMisses(0);
    setLevel(1);
    catchesRef.current = 0;
    missesRef.current = 0;
    levelRef.current = 1;
    seen.current = new Set();
    correctSet.current = new Set();
    setOver(false);
    runningRef.current = true;
    setRunning(true);
    // spawn first word from the new trio
    const pick = trio[Math.floor(Math.random() * trio.length)];
    currentRef.current = pick;
    setCurrent(pick);
    seen.current.add(pick.slug);
    yRef.current = 0;
    setY(0);
    setX(15 + Math.random() * 70);
    lastTs.current = 0;
    raf.current = requestAnimationFrame(loop);
  }

  function tapBasket(item: VocabItem) {
    if (!runningRef.current || !currentRef.current) return;
    if (item.slug === currentRef.current.slug) {
      playCorrect();
      speakWord(item.kk);
      correctSet.current.add(item.slug);
      store.catchWord(true);
      catchesRef.current += 1;
      setCatches(catchesRef.current);
      if (catchesRef.current === 8) store.awardWordCatcher();
      if (catchesRef.current % 8 === 0) {
        levelRef.current += 1;
        setLevel(levelRef.current);
        setBaskets(sample(VOCAB, 3));
      }
      spawn();
      lastTs.current = 0;
    } else {
      playWrong();
      missesRef.current += 1;
      setMisses(missesRef.current);
      if (missesRef.current >= MAX_MISS) endGame();
    }
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <GameShell
      title="Falling Sözder"
      kk="Құлайтын сөздер"
      right={<Scoreboard label="Lvl" value={level} />}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_MISS }).map((_, i) => (
            <Heart key={i} size={22} className={i < MAX_MISS - misses ? "fill-terra text-terra" : "text-wolf/40"} />
          ))}
        </div>
        <span className="font-extrabold text-steppe">Caught: {catches}</span>
      </div>

      <div className="relative mx-auto overflow-hidden rounded-3xl bg-gradient-to-b from-steppe to-steppe-700" style={{ height: FIELD + 90 }}>
        {/* falling word */}
        <AnimatePresence>
          {running && current && (
            <div
              className="absolute -translate-x-1/2 rounded-2xl bg-gold px-4 py-2 text-xl font-black text-steppe-700 shadow-lg"
              style={{ top: y, left: `${x}%` }}
            >
              {current.kk}
            </div>
          )}
        </AnimatePresence>

        {/* baskets */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 p-3">
          {baskets.map((b) => (
            <button
              key={b.slug}
              onClick={() => tapBasket(b)}
              disabled={!running}
              className="rounded-2xl border-4 border-gold/60 bg-warm/95 py-3 text-center text-base font-black text-steppe shadow-md transition active:scale-95 disabled:opacity-60"
            >
              {b.en}
            </button>
          ))}
        </div>

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-steppe/80 text-center text-warm">
            {over ? (
              <>
                <p className="text-3xl font-black">Game over!</p>
                <p>You caught {catches} words and reached level {level}.</p>
              </>
            ) : (
              <p className="max-w-xs text-warm/90">Tap the basket that matches the falling Kazakh word before it lands!</p>
            )}
            <Button variant="gold" size="lg" onClick={start}>{over ? "Play again" : "Start"}</Button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
