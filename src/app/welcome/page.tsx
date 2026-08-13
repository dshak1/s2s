"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Volume2 } from "lucide-react";
import { MountainBackdrop } from "@/components/game/mountain-backdrop";
import { Button } from "@/components/ui/button";
import { KID_COVERS } from "@/content/kid-covers";
import { playClip, playPop, playWin } from "@/lib/audio";
import { markOnboarded } from "@/lib/onboarding";
import { store } from "@/lib/store";

// First run. Four screens, one decision each, and a kid can leave at any point
// with the "Skip" link — an intro nobody can escape is a wall, not a welcome.
//
// It teaches while it asks: the first screen is a real Kazakh greeting with the
// real recorded clip, so the very first thing that happens is the kid hearing
// the language rather than reading about it.

const STEPS = ["hello", "name", "cover", "ready"] as const;
type Step = (typeof STEPS)[number];

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function Welcome() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("hello");
  const [name, setName] = useState("");
  const [coverId, setCoverId] = useState<string | null>(null);
  const [dir, setDir] = useState(1);

  const index = STEPS.indexOf(step);

  function go(next: Step) {
    setDir(STEPS.indexOf(next) >= index ? 1 : -1);
    setStep(next);
  }

  function finish() {
    const trimmed = name.trim();
    if (trimmed) store.setDisplayName(trimmed.slice(0, 24));
    if (coverId) store.setHomeCover(coverId);
    markOnboarded();
    router.replace("/play");
  }

  function leave() {
    markOnboarded();
    router.replace("/play");
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <MountainBackdrop scene="home" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,.34)_48%,rgba(255,246,206,.18))]" />

      {/* Soft drifting light so the first viewport feels alive without clutter */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#fff6c8]/55 blur-3xl"
        animate={{ x: [0, 36, 0], y: [0, 18, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-24 h-72 w-72 rounded-full bg-[#9ed8ff]/40 blur-3xl"
        animate={{ x: [0, -28, 0], y: [0, -22, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((id, i) => (
              <motion.span
                key={id}
                layout
                className={`h-2 rounded-full ${
                  i === index ? "bg-steppe" : i < index ? "bg-steppe/60" : "bg-steppe/20"
                }`}
                animate={{ width: i === index ? 28 : 8 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            ))}
          </div>
          {step !== "ready" && (
            <button
              onClick={leave}
              className="text-sm font-bold text-steppe/55 underline-offset-4 transition hover:text-steppe hover:underline"
            >
              Skip
            </button>
          )}
        </header>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: 32 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 * dir }}
            transition={{ duration: 0.32, ease: easeOut }}
            className="flex flex-1 flex-col justify-center py-6"
          >
            {step === "hello" && <Hello onNext={() => go("name")} />}
            {step === "name" && (
              <NameStep name={name} setName={setName} onNext={() => go("cover")} />
            )}
            {step === "cover" && (
              <CoverStep
                coverId={coverId}
                setCoverId={setCoverId}
                onNext={() => {
                  playWin();
                  go("ready");
                }}
              />
            )}
            {step === "ready" && <Ready name={name.trim()} onFinish={finish} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Hello({ onNext }: { onNext: () => void }) {
  const [heard, setHeard] = useState(false);

  function say() {
    playClip("/audio/greetings/salem.mp3", "Сәлем");
    setHeard(true);
  }

  // Kids tap the big word before reading anything, so the whole thing is the
  // button. Autoplay is not an option — every mobile browser blocks audio until
  // a gesture, and a greeting that stays silent is worse than no greeting.
  return (
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="text-sm font-black tracking-[0.18em] text-steppe/55 uppercase"
      >
        Steppe to Screen
      </motion.p>

      <motion.button
        onClick={say}
        whileTap={{ scale: 0.96 }}
        className="mx-auto mt-4 block rounded-[2rem] px-6 py-4"
      >
        <motion.span
          animate={heard ? { scale: [1, 1.04, 1] } : { scale: [1, 1.02, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="block text-6xl font-black tracking-tight sm:text-7xl"
        >
          Сәлем!
        </motion.span>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-steppe/15 bg-white/80 px-4 py-2 text-sm font-black text-steppe">
          <Volume2 size={16} /> {heard ? "Again!" : "Tap to hear it"}
        </span>
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mx-auto mt-6 max-w-md text-xl font-extrabold leading-8 text-steppe/80"
      >
        That is hello in Kazakh. You just learned your first word.
      </motion.p>

      <Button variant="gold" size="lg" className="mt-7" onClick={onNext}>
        Next <ArrowRight size={20} />
      </Button>
    </div>
  );
}

function NameStep({
  name,
  setName,
  onNext,
}: {
  name: string;
  setName: (value: string) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
      className="text-center"
    >
      <p className="text-sm font-black tracking-[0.18em] text-steppe/55 uppercase">
        Steppe to Screen
      </p>
      <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Атың кім?</h1>
      <p className="mt-3 text-xl font-extrabold text-steppe/80">What should we call you?</p>

      <input
        ref={inputRef}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={24}
        placeholder="Айгүл"
        autoComplete="off"
        className="mx-auto mt-7 block w-full max-w-sm rounded-2xl border-4 border-white bg-white/85 px-5 py-4 text-center text-2xl font-black text-steppe shadow-[0_10px_0_rgba(30,77,140,.08)] outline-none placeholder:text-steppe/25 focus:border-gold"
      />
      <p className="mt-3 text-sm font-bold text-steppe/55">
        Just a first name, or a nickname. Nobody outside the room sees it.
      </p>

      <Button variant="gold" size="lg" type="submit" className="mt-7">
        {name.trim() ? `Jaqsy, ${name.trim()}!` : "I'll pick later"} <ArrowRight size={20} />
      </Button>
    </form>
  );
}

function CoverStep({
  coverId,
  setCoverId,
  onNext,
}: {
  coverId: string | null;
  setCoverId: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-black leading-tight sm:text-5xl">Pick your screen</h1>
      <p className="mt-3 text-lg font-extrabold text-steppe/80">
        Kids at the workshop drew these. One of them is yours now.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {KID_COVERS.map((cover, i) => {
          const picked = cover.id === coverId;
          return (
            <motion.button
              key={cover.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28, ease: easeOut }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playPop();
                setCoverId(cover.id);
              }}
              className={`relative overflow-hidden rounded-2xl border-4 transition ${
                picked ? "border-gold shadow-[0_8px_0_rgba(184,150,10,.35)]" : "border-white/80"
              }`}
              aria-pressed={picked}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.image}
                alt={cover.alt}
                className="aspect-[4/3] w-full object-cover"
                draggable={false}
              />
              {picked && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1.5 top-1.5 rounded-full bg-gold p-1 text-steppe-700"
                >
                  <Check size={14} strokeWidth={3} />
                </motion.span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-steppe/70 px-1 py-0.5 text-[10px] font-black text-warm">
                {cover.artist ?? "A workshop designer"}
              </span>
            </motion.button>
          );
        })}
      </div>

      <Button variant="gold" size="lg" className="mt-7" onClick={onNext}>
        {coverId ? "That one" : "Keep the mountains"} <ArrowRight size={20} />
      </Button>
    </div>
  );
}

function Ready({ name, onFinish }: { name: string; onFinish: () => void }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="mx-auto w-fit rounded-[2rem] border-4 border-steppe/10 bg-white px-7 py-5 shadow-[0_14px_0_rgba(30,77,140,.08)]"
      >
        <div className="text-5xl font-black leading-none text-steppe">Кеттік!</div>
        <div className="mt-2 text-base font-extrabold text-steppe/60">Let&apos;s go!</div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
        className="mx-auto mt-7 max-w-md text-xl font-extrabold leading-8 text-steppe/80"
      >
        {name ? `${name}, ` : ""}every game in Steppe to Screen teaches Kazakh. Nothing to
        lose, nothing to sign up for — play whichever one looks fun.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.35 }}
      >
        <Button variant="gold" size="lg" className="mt-7" onClick={onFinish}>
          Ойнау <ArrowRight size={20} />
        </Button>
      </motion.div>
    </div>
  );
}
