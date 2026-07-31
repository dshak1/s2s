"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { VOCAB, VOCAB_CATEGORY_META, type VocabCategory, type VocabItem } from "@/content/vocab";
import { shuffle } from "@/lib/utils";
import { playCorrect, playWrong, playWin, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { vocabItemId } from "@/lib/items";
import { Heart, Timer, Trophy, Volume2 } from "lucide-react";

// Spotlight Panic — original game design by Almas Bekbolat (workshop design
// contest, 1st place). Your flashlight hunts Kazakh words in the dark while
// ghosts hunt your light. Each level scatters a fixed set of words: find them
// all before the clock runs out, and the clock shrinks every level.

const FIELD_H = 460;
const MAX_MISS = 3;
const MAX_LEVEL = 10;
const WORDS_PER_LEVEL = 5;
const GHOST_HIT_COOLDOWN_MS = 1600;
const BEST_KEY = "s2s.spotlight.best.v1";

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

// Seconds to clear a level — starts roomy, tightens every level.
function levelTime(level: number) {
  return Math.max(25, 60 - (level - 1) * 5);
}

function readBests(): Partial<Record<VocabCategory, number>> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function SpotlightPanic() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState<VocabCategory>("animals");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bests, setBests] = useState<Partial<Record<VocabCategory, number>>>({});
  const [newBest, setNewBest] = useState(false);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(levelTime(1));
  const [words, setWords] = useState<FieldWord[]>([]);
  const [target, setTarget] = useState<VocabItem | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [beam, setBeam] = useState({ x: 300, y: 220 });
  const [flash, setFlash] = useState(false);
  const [banner, setBanner] = useState<{ level: number; bonus: number } | null>(null);

  const fieldRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const lastTs = useRef(0);
  const phaseRef = useRef<Phase>("pick");
  const beamRef = useRef({ x: 300, y: 220 });
  const ghostsRef = useRef<Ghost[]>([]);
  const lastGhostHit = useRef(0);
  const levelRef = useRef(1);
  const missesRef = useRef(0);
  const scoreRef = useRef(0);
  const deadline = useRef(0); // rAF-timebase ms when the level's clock hits zero
  const shownSec = useRef(levelTime(1));
  const overReason = useRef<"hearts" | "time">("hearts");
  const wordsRef = useRef<FieldWord[]>([]);
  const targetRef = useRef<VocabItem | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const correctSet = useRef<Set<string>>(new Set());
  // Telemetry: when the current target word was announced.
  const targetShownAt = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setBests(readBests());
    return () => {
      cancelAnimationFrame(raf.current);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  // rAF (and the game) freezes while the tab is hidden, but the deadline is
  // wall-clock — push it forward by the hidden time so returning players
  // aren't greeted with an instant "Time's up".
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt) {
        if (phaseRef.current === "play") deadline.current += performance.now() - hiddenAt;
        hiddenAt = 0;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const fieldSize = useCallback(() => {
    const el = fieldRef.current;
    return { w: el?.clientWidth ?? 600, h: FIELD_H };
  }, []);

  // Scatter this level's word set across the field, away from the edges. The
  // set stays put for the whole level — you hunt targets one by one until the
  // field is cleared.
  const scatter = useCallback((cat: VocabCategory) => {
    const pool = shuffle(VOCAB.filter((w) => w.category === cat));
    const count = Math.min(pool.length, WORDS_PER_LEVEL);
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

  const saveBest = useCallback((cat: VocabCategory, finalScore: number): boolean => {
    const next = { ...readBests() };
    const isNew = finalScore > (next[cat] ?? 0);
    if (isNew) {
      next[cat] = finalScore;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {}
    }
    setBests(next);
    return isNew;
  }, []);

  const finish = useCallback(
    (end: "over" | "mastered") => {
      phaseRef.current = end;
      setPhase(end);
      cancelAnimationFrame(raf.current);
      if (end === "mastered") {
        scoreRef.current += 100;
        setScore(scoreRef.current);
        playWin();
      }
      setNewBest(saveBest(category, scoreRef.current));
      store.recordGameRun({
        game: "jaryq-hunter",
        score: scoreRef.current,
        vocabSeen: [...seen.current],
        vocabCorrect: [...correctSet.current],
      });
    },
    [category, saveBest],
  );

  const loseHeart = useCallback(() => {
    playWrong();
    missesRef.current += 1;
    setMisses(missesRef.current);
    setFlash(true);
    setTimeout(() => setFlash(false), 320);
    if (missesRef.current >= MAX_MISS) {
      overReason.current = "hearts";
      finish("over");
    }
  }, [finish]);

  const loopRef = useRef<(ts: number) => void>(() => {});
  const loop = useCallback(
    (ts: number) => {
      if (phaseRef.current !== "play") return;
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;

      // level clock
      const remaining = deadline.current - ts;
      if (remaining <= 0) {
        overReason.current = "time";
        setTimeLeft(0);
        finish("over");
        return;
      }
      const sec = Math.ceil(remaining / 1000);
      if (sec !== shownSec.current) {
        shownSec.current = sec;
        setTimeLeft(sec);
      }

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
    [fieldSize, finish, loseHeart],
  );
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const startClock = useCallback((lvl: number) => {
    const secs = levelTime(lvl);
    deadline.current = performance.now() + secs * 1000;
    shownSec.current = secs;
    setTimeLeft(secs);
  }, []);

  function start(cat: VocabCategory) {
    setCategory(cat);
    levelRef.current = 1;
    missesRef.current = 0;
    scoreRef.current = 0;
    lastGhostHit.current = 0;
    seen.current = new Set();
    correctSet.current = new Set();
    setLevel(1);
    setMisses(0);
    setScore(0);
    setNewBest(false);
    setBanner(null);
    phaseRef.current = "play";
    setPhase("play");
    scatter(cat);
    spawnGhosts(1);
    startClock(1);
    lastTs.current = 0;
    raf.current = requestAnimationFrame(loop);
  }

  function nextTarget() {
    const remaining = wordsRef.current.filter((w) => !w.caught);
    if (remaining.length === 0) {
      // Level cleared — bank the leftover seconds as bonus points.
      const bonus = Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)) * 2;
      scoreRef.current += bonus;
      setScore(scoreRef.current);
      levelRef.current += 1;
      setLevel(levelRef.current);
      if (levelRef.current > MAX_LEVEL) {
        finish("mastered");
        return;
      }
      setBanner({ level: levelRef.current, bonus });
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), 2200);
      scatter(category);
      spawnGhosts(levelRef.current);
      startClock(levelRef.current);
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)].item;
    targetRef.current = pick;
    setTarget(pick);
    seen.current.add(pick.slug);
    targetShownAt.current = Date.now();
    speakWord(pick.kk);
  }

  function tapWord(fw: FieldWord) {
    if (phaseRef.current !== "play" || fw.caught || !targetRef.current) return;
    logAnswer({
      gameSlug: "jaryq-hunter",
      itemId: vocabItemId(targetRef.current),
      // The target is spoken aloud, so this is an audio comprehension check.
      promptKind: "audio",
      response: fw.item.slug,
      isCorrect: fw.item.slug === targetRef.current.slug,
      latencyMs: targetShownAt.current ? Date.now() - targetShownAt.current : null,
    });
    if (fw.item.slug === targetRef.current.slug) {
      playCorrect();
      correctSet.current.add(fw.item.slug);
      store.catchWord(true);
      scoreRef.current += 10 * levelRef.current;
      setScore(scoreRef.current);
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
  const found = words.filter((w) => w.caught).length;

  return (
    <GameShell title="Spotlight Panic" kk="Жарық" right={<Scoreboard label="Lvl" value={level} />}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        <div className="flex items-center gap-3">
          {playing && (
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1 font-black shadow-sm ${
                timeLeft <= 10 ? "bg-terra text-white" : "bg-warm/90 text-steppe"
              }`}
            >
              <Timer size={16} /> {timeLeft}s
            </span>
          )}
          <span className="font-extrabold text-steppe">Score: {score}</span>
        </div>
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

        {/* ghosts, faint in the dark, clear in the light */}
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

        {/* level-clear banner */}
        <AnimatePresence>
          {playing && banner && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-6 z-10 mx-auto w-fit rounded-2xl bg-gold px-5 py-2 text-center shadow-lg"
            >
              <div className="text-lg font-black text-steppe-700">Деңгей {banner.level}!</div>
              <div className="text-sm font-bold text-steppe-700/80">
                +{banner.bonus} time bonus · {levelTime(banner.level)}s on the clock
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* found progress */}
        {playing && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-warm/15 px-3 py-1 text-xs font-black text-warm/80">
            {found} / {words.length} found
          </div>
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
              The steppe is dark. Find every hidden word before the clock runs out, each level gives you less time, and
              the ghosts hunt your light!
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
                  {(bests[c.key] ?? 0) > 0 && (
                    <div className="mt-1 text-[11px] font-black text-terra">Best: {bests[c.key]}</div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-warm/50">Original game design: Almas Bekbolat, contest winner 🥇</p>
          </div>
        )}

        {(phase === "over" || phase === "mastered") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c1226]/90 p-4 text-center text-warm">
            {phase === "mastered" ? (
              <>
                <Trophy size={44} className="text-gold" />
                <p className="text-3xl font-black">{meta.kk} mastered!</p>
                <p>You beat all {MAX_LEVEL} levels, final score {score} (+100 mastery bonus).</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black">
                  {overReason.current === "time" ? "Time's up!" : "The ghosts got you!"}
                </p>
                <p>
                  {meta.emoji} {meta.en}, score {score}, reached level {level}.
                </p>
              </>
            )}
            {newBest ? (
              <p className="rounded-full bg-gold px-4 py-1 font-black text-steppe-700">🏆 New personal best!</p>
            ) : (
              (bests[category] ?? 0) > 0 && (
                <p className="text-sm font-bold text-warm/70">Personal best: {bests[category]}</p>
              )
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
