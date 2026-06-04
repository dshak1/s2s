"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Confetti } from "@/components/game/confetti";
import { playCorrect, playWin, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";

type FlashWord = {
  kk: string;
  en: string;
  slug: string;
  x: number;
  y: number;
};

const FLASH_WORDS: FlashWord[] = [
  { kk: "ҚАСҚЫР", en: "wolf", slug: "qasqyr", x: 50, y: 46 },
  { kk: "ТҮЛКІ", en: "fox", slug: "tulki", x: 80, y: 30 },
  { kk: "АЮ", en: "bear", slug: "aiu", x: 18, y: 30 },
  { kk: "ҚОЙ", en: "sheep", slug: "qoi", x: 84, y: 74 },
  { kk: "БҮРКІТ", en: "eagle", slug: "burkit", x: 24, y: 72 },
  { kk: "БАРЫС", en: "snow leopard", slug: "barys", x: 62, y: 60 },
  { kk: "ТҮЙЕ", en: "camel", slug: "tuie", x: 40, y: 58 },
  { kk: "АТ", en: "horse", slug: "at", x: 52, y: 82 },
];

const BEAM_PERCENT = 22;

function litWord(pos: { x: number; y: number }, found: string[]) {
  return FLASH_WORDS.find((word) => {
    if (found.includes(word.kk)) return false;
    return Math.hypot(word.x - pos.x * 100, word.y - pos.y * 100) < BEAM_PERCENT * 0.62;
  });
}

export default function FlashlightWords() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [found, setFound] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    });
  }

  function catchActive() {
    const active = litWord(pos, found);
    if (!active || done) return;
    const next = [...found, active.kk];
    setFound(next);
    speakWord(active.kk);
    playCorrect();
    if (next.length === FLASH_WORDS.length) {
      setDone(true);
      playWin();
      store.recordGameRun({
        game: "jaryq-hunter",
        score: FLASH_WORDS.length * 8,
        vocabSeen: FLASH_WORDS.map((word) => word.slug),
        vocabCorrect: FLASH_WORDS.map((word) => word.slug),
      });
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.().catch(() => {});
      return;
    }
    document.exitFullscreen?.();
  }

  function reset() {
    setFound([]);
    setDone(false);
  }

  const active = litWord(pos, found);
  const remaining = FLASH_WORDS.length - found.length;

  return (
    <div className="min-h-dvh bg-[#06101f] p-0 sm:p-4">
      {done && <Confetti />}
      <div
        ref={stageRef}
        onPointerMove={move}
        onPointerDown={(event) => {
          move(event);
          catchActive();
        }}
        className="flashlight-stage relative mx-auto h-dvh max-h-none min-h-[620px] w-full max-w-6xl cursor-none overflow-hidden rounded-none bg-[#06101f] text-warm sm:h-[calc(100dvh-2rem)] sm:rounded-2xl"
        style={{
          background: "radial-gradient(120% 90% at 50% 0%, #16335c 0%, #0c1f3a 55%, #06101f 100%)",
          touchAction: "none",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(circle 150px at ${pos.x * 100}% ${pos.y * 100}%, transparent 0%, transparent 42%, rgba(4,10,20,.88) 74%)`,
          }}
        />

        {FLASH_WORDS.map((word) => {
          const distance = Math.hypot(word.x - pos.x * 100, word.y - pos.y * 100);
          const isFound = found.includes(word.kk);
          const lit = !isFound && distance < BEAM_PERCENT;
          return (
            <div
              key={word.kk}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center transition-opacity"
              style={{
                left: `${word.x}%`,
                top: `${word.y}%`,
                opacity: isFound ? 0.34 : lit ? 1 : 0.07,
              }}
            >
              <div
                className="text-3xl font-black tracking-wide sm:text-4xl"
                style={{
                  color: isFound ? "#82d49d" : lit ? "#3a2a06" : "rgba(255,255,255,.65)",
                  textShadow: lit ? "0 1px 0 rgba(255,236,170,.9)" : "none",
                }}
              >
                {word.kk}
              </div>
              {lit && <div className="text-base font-black text-[#6b5212]">{word.en}</div>}
              {isFound && <div className="text-xl font-black text-[#82d49d]">✓</div>}
              {active?.kk === word.kk && (
                <div className="mt-2 inline-block rounded-full bg-steppe-700 px-3 py-1 text-xs font-black text-gold shadow-lg">
                  Click to catch
                </div>
              )}
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute z-20 rounded-full"
          style={{
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            width: 300,
            height: 300,
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(255,236,170,.42) 0%, rgba(255,221,120,.16) 45%, transparent 68%)",
            mixBlendMode: "screen",
          }}
        />
        <div
          className="pointer-events-none absolute z-30 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70"
          style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
        />

        <div className="absolute left-3 right-3 top-3 z-40 flex items-start justify-between gap-3 sm:left-4 sm:right-4 sm:top-4">
          <div className="flex items-start gap-3">
            <Link
              href="/play"
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/30 bg-white/10 text-warm transition hover:bg-white/20"
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowLeft size={22} />
            </Link>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-gold">Жарық · Flashlight Words</div>
              <h1 className="text-xl font-black sm:text-3xl">
                Find the animals · <span className="text-gold">{found.length}/{FLASH_WORDS.length}</span>
              </h1>
            </div>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleFullscreen();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-black text-warm transition hover:bg-white/20"
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {fullscreen ? "Exit fullscreen" : "Go Fullscreen"}
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-white/75">
            Move the light with mouse or finger. Click inside the beam to catch a word. {remaining > 0 ? `${remaining} to go.` : "Done."}
          </span>
          <div className="ml-auto flex max-w-full flex-wrap justify-end gap-2">
            {found.map((word) => (
              <span key={word} className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-black text-gold">
                ✓ {word}
              </span>
            ))}
          </div>
        </div>

        {done && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-steppe/85 p-6 text-center">
            <div className="text-4xl font-black text-gold">All words found!</div>
            <p className="max-w-md text-lg font-bold text-warm/90">+{FLASH_WORDS.length * 8} points · replay for more practice.</p>
            <button
              onClick={(event) => {
                event.stopPropagation();
                reset();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-black text-steppe-700"
            >
              <RotateCcw size={18} /> Replay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
