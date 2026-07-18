"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { VOCAB, VOCAB_CATEGORY_META, type VocabCategory, type VocabItem } from "@/content/vocab";
import { shuffle } from "@/lib/utils";
import { playCorrect, playWrong, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";
import { Heart, Trophy, Volume2 } from "lucide-react";

// Spotlight Panic — original game design by Almas Bekbolat (workshop design
// contest, 1st place). Your flashlight hunts Kazakh words in the dark while
// ghosts hunt your light.

const FIELD_H = 460;
const MAX_MISS = 3;
const MAX_LEVEL = 10;
const CATCHES_PER_LEVEL = 5;
const GHOST_HIT_COOLDOWN_MS = 1600;

type Phase = "pick" | "play" | "over" | "mastered";

type FieldWord = { item: VocabItem; x: number; y: number; caught: boolean };
type Ghost = { x: number; y: number; wobble: number };

function beamRadius(level: number) {
  return Math.max(84, 150 - (level - 1) * 8);
}

function ghostSpeed(level: number) {
  return 34 + level * 9; // px/sec toward the light
}

function ghostCount(level: number) {
  return level < 3 ? 1 : level < 7 ? 2 : 3;
}

export default function SpotlightPanic() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState<VocabCategory>("animals");
  const [level, setLevel] = useState(1);
  const [catches, setCatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [words, setWords] = useState<FieldWord[]>([]);
  const [target, setTarget] = useState<VocabItem | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [beam, setBeam] = useState({ x: 300, y: 220 });
  const [flash, setFlash] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const lastTs = useRef(0);
  const phaseRef = useRef<Phase>("pick");
  const beamRef = useRef({ x: 300, y: 220 });
  const ghostsRef = useRef<Ghost[]>([]);
  const lastGhostHit = useRef(0);
  const levelRef = useRef(1);
  const missesRef = useRef(0);
  const catchesRef = useRef(0);
  const catchesInLevel = useRef(0);
  const wordsRef = useRef<FieldWord[]>([]);
  const targetRef = useRef<VocabItem | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const correctSet = useRef<Set<string>>(new Set());

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const fieldSize = useCallback(() => {
    const el = fieldRef.current;
    return { w: el?.clientWidth ?? 600, h: FIELD_H };
  }, []);

  // Scatter this level's words across the field, away from the edges.
  const scatter = useCallback((cat: VocabCategory, lvl: number) => {
    const pool = shuffle(VOCAB.filter((w) => w.category === cat));
    const count = Math.min(pool.length, 4 + Math.floor(lvl / 2));
    const placed: FieldWord[] = pool.slice(0, count).map((item) => ({
      item,
      x: 10 + Math.random() * 80,
      y: 12 + Math.random() * 72,
      caught: false,
    }));
    wordsRef.current = placed;
    setWords(placed);
    const first = placed[Math.floor(Math.random() * placed.length)].item;
    targetRef.current = first;
    setTarget(first);
    seen.current.add(first.slug);
    speakWord(first.kk);
  }, []);

  const spawnGhosts = useCallback(
    (lvl: number) => {
      const { w, h } = fieldSize();
      const gs: Ghost[] = Array.from({ length: ghostCount(lvl) }).map((_, i) => ({
        x: i % 2 === 0 ? 20 : w - 20,
        y: i < 2 ? 20 : h - 20,
        wobble: Math.random() * Math.PI * 2,
      }));
      ghostsRef.current = gs;
      setGhosts(gs);
    },
    [fieldSize],
  );

  const finish = useCallback((end: "over" | "mastered") => {
    phaseRef.current = end;
    setPhase(end);
    cancelAnimationFrame(raf.current);
    store.recordGameRun({
      game: "jaryq-hunter",
      score: catchesRef.current * 5 + (end === "mastered" ? 50 : 0),
      vocabSeen: [...seen.current],
      vocabCorrect: [...correctSet.current],
    });
  }, []);

  const loseHeart = useCallback(() => {
    playWrong();
    missesRef.current += 1;
    setMisses(missesRef.current);
    setFlash(true);
    setTimeout(() => setFlash(false), 320);
    if (missesRef.current >= MAX_MISS) finish("over");
  }, [finish]);

  const loopRef = useRef<(ts: number) => void>(() => {});
  const loop = useCallback(
    (ts: number) => {
      if (phaseRef.current !== "play") return;
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      const { w, h } = fieldSize();
      const speed = ghostSpeed(levelRef.current);
      const radius = beamRadius(levelRef.current);
      let hit = false;
      const next = ghostsRef.current.map((g) => {
        const dx = beamRef.current.x - g.x;
        const dy = beamRef.current.y - g.y;
        const dist = Math.hypot(dx, dy) || 1;
        const wobble = g.wobble + dt * 3;
        const nx = g.x + (dx / dist) * speed * dt + Math.cos(wobble) * 14 * dt;
        const ny = g.y + (dy / dist) * speed * dt + Math.sin(wobble) * 14 * dt;
        if (dist < radius * 0.55 && ts - lastGhostHit.current > GHOST_HIT_COOLDOWN_MS) {
          hit = true;
          lastGhostHit.current = ts;
          // The ghost got your light — it retreats to a far corner.
          return {
            x: beamRef.current.x < w / 2 ? w - 24 : 24,
            y: beamRef.current.y < h / 2 ? h - 24 : 24,
            wobble,
          };
        }
        return { x: Math.max(12, Math.min(w - 12, nx)), y: Math.max(12, Math.min(h - 12, ny)), wobble };
      });
      ghostsRef.current = next;
      setGhosts(next);
      if (hit) loseHeart();
      raf.current = requestAnimationFrame(loopRef.current);
    },
    [fieldSize, loseHeart],
  );
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  function start(cat: VocabCategory) {
    setCategory(cat);
    levelRef.current = 1;
    missesRef.current = 0;
    catchesRef.current = 0;
    catchesInLevel.current = 0;
    lastGhostHit.current = 0;
    seen.current = new Set();
    correctSet.current = new Set();
    setLevel(1);
    setMisses(0);
    setCatches(0);
    phaseRef.current = "play";
    setPhase("play");
    scatter(cat, 1);
    spawnGhosts(1);
    lastTs.current = 0;
    raf.current = requestAnimationFrame(loop);
  }

  function nextTarget() {
    const remaining = wordsRef.current.filter((w) => !w.caught);
    if (catchesInLevel.current >= CATCHES_PER_LEVEL || remaining.length === 0) {
      levelRef.current += 1;
      catchesInLevel.current = 0;
      setLevel(levelRef.current);
      if (levelRef.current > MAX_LEVEL) {
        finish("mastered");
        return;
      }
      scatter(category, levelRef.current);
      spawnGhosts(levelRef.current);
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)].item;
    targetRef.current = pick;
    setTarget(pick);
    seen.current.add(pick.slug);
    speakWord(pick.kk);
  }

  function tapWord(fw: FieldWord) {
    if (phaseRef.current !== "play" || fw.caught || !targetRef.current) return;
    if (fw.item.slug === targetRef.current.slug) {
      playCorrect();
      correctSet.current.add(fw.item.slug);
      store.catchWord(true);
      catchesRef.current += 1;
      catchesInLevel.current += 1;
      setCatches(catchesRef.current);
      wordsRef.current = wordsRef.current.map((w) => (w.item.slug === fw.item.slug ? { ...w, caught: true } : w));
      setWords(wordsRef.current);
      nextTarget();
    } else {
      loseHeart();
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    beamRef.current = pos;
    setBeam(pos);
  }

  const meta = VOCAB_CATEGORY_META.find((c) => c.key === category)!;
  const playing = phase === "play";
  const radius = beamRadius(level);

  return (
    <GameShell title="Spotlight Panic" kk="Жарық" right={<Scoreboard label="Lvl" value={level} />}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_MISS }).map((_, i) => (
            <Heart key={i} size={22} className={i < MAX_MISS - misses ? "fill-terra text-terra" : "text-wolf/40"} />
          ))}
        </div>
        {playing && target && (
          <button
            onClick={() => speakWord(target.kk)}
            className="flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 font-black text-steppe-700 shadow-md transition active:scale-95"
          >
            <Volume2 size={16} /> Find: {target.en}
          </button>
        )}
        <span className="font-extrabold text-steppe">Found: {catches}</span>
      </div>

      <div
        ref={fieldRef}
        onPointerMove={onPointerMove}
        className="relative mx-auto touch-none overflow-hidden rounded-3xl bg-[#0c1226]"
        style={{ height: FIELD_H, cursor: playing ? "none" : "auto" }}
      >
        {/* hidden words */}
        {playing &&
          words.map((fw) => (
            <button
              key={fw.item.slug}
              onClick={() => tapWord(fw)}
              disabled={fw.caught}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl px-3 py-1.5 text-lg font-black shadow-lg transition ${
                fw.caught ? "bg-steppe/40 text-warm/30" : "bg-gold text-steppe-700"
              }`}
              style={{ left: `${fw.x}%`, top: `${fw.y}%` }}
            >
              {fw.item.kk}
            </button>
          ))}

        {/* ghosts — faint in the dark, clear in the light */}
        {playing &&
          ghosts.map((g, i) => (
            <div
              key={i}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl"
              style={{
                left: g.x,
                top: g.y,
                opacity: Math.hypot(g.x - beam.x, g.y - beam.y) < radius ? 1 : 0.3,
              }}
            >
              👻
            </div>
          ))}

        {/* darkness with flashlight hole */}
        {playing && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle ${radius}px at ${beam.x}px ${beam.y}px, rgba(6,9,20,0) ${Math.round(
                radius * 0.55,
              )}px, rgba(6,9,20,.72) ${Math.round(radius * 0.85)}px, rgba(6,9,20,.985) ${radius + 40}px)`,
            }}
          />
        )}

        {/* ghost-hit flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 bg-terra"
            />
          )}
        </AnimatePresence>

        {phase === "pick" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center text-warm">
            <p className="text-2xl font-black">Spotlight Panic</p>
            <p className="max-w-sm text-sm text-warm/80">
              The steppe is dark. Move your flashlight to hunt the Kazakh word you hear — and keep your light away from
              the ghosts!
            </p>
            <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
              {VOCAB_CATEGORY_META.map((c) => (
                <button
                  key={c.key}
                  onClick={() => start(c.key)}
                  className="rounded-2xl bg-warm/95 p-3 text-steppe shadow-md transition hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="text-2xl">{c.emoji}</div>
                  <div className="text-sm font-black">{c.kk}</div>
                  <div className="text-[11px] font-bold text-steppe/60">{c.en}</div>
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-warm/50">Original game design: Almas Bekbolat — contest winner 🥇</p>
          </div>
        )}

        {(phase === "over" || phase === "mastered") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c1226]/90 p-4 text-center text-warm">
            {phase === "mastered" ? (
              <>
                <Trophy size={44} className="text-gold" />
                <p className="text-3xl font-black">{meta.kk} mastered!</p>
                <p>
                  You survived all {MAX_LEVEL} levels and found {catches} words.
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black">The ghosts got you!</p>
                <p>
                  {meta.emoji} {meta.en} — you found {catches} words and reached level {level}.
                </p>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="gold" size="lg" onClick={() => start(category)}>
                Play again
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  phaseRef.current = "pick";
                  setPhase("pick");
                }}
              >
                Change pack
              </Button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
