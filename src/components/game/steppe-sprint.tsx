"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Gauge,
  Heart,
  MapPin,
  RotateCcw,
  Sparkles,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Confetti } from "@/components/game/confetti";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { VOCAB_CATEGORY_META, type VocabItem } from "@/content/vocab";
import { baseText } from "@/lib/lang";
import { playCorrect, playPop, playWrong, playWin } from "@/lib/audio";
import { store, useProfile } from "@/lib/store";

type Phase = "ready" | "running" | "question" | "rest" | "finished";
type Lane = 0 | 1 | 2;
type Pace = "calm" | "quick";

type TrackEvent = {
  distance: number;
  lane: Lane;
  kind: "star" | "rock";
};

type RouteStop = {
  name: string;
  detail: string;
  background: string;
};

type AnswerFeedback = {
  correct: boolean;
  selectedSlug: string;
};

type TrackFeedback = {
  tone: "good" | "bad";
  title: string;
  detail: string;
};

const GATES = [20, 40, 60, 80];
const EMPTY_VOCAB: VocabItem[] = [];
const LANE_NAMES = ["Left", "Middle", "Right"];
const PACE_MS: Record<Pace, number> = { calm: 190, quick: 125 };

const DISCOVERY_ROUTE: RouteStop[] = [
  { name: "Charyn", detail: "Canyon start", background: "/img/places-photos/charyn.jpg" },
  { name: "Almaty", detail: "Mountain road", background: "/img/places-photos/almaty.webp" },
  { name: "Astana", detail: "City lights", background: "/img/places-photos/astana.webp" },
  { name: "Mangystau", detail: "Desert trail", background: "/img/places-photos/mangystau.jpg" },
  { name: "Turkistan", detail: "Finish landmark", background: "/img/places-photos/turkistan.jpg" },
];

const TRACK_EVENTS: TrackEvent[] = [
  { distance: 5, lane: 1, kind: "star" },
  { distance: 9, lane: 0, kind: "rock" },
  { distance: 13, lane: 2, kind: "star" },
  { distance: 17, lane: 1, kind: "rock" },
  { distance: 24, lane: 0, kind: "star" },
  { distance: 28, lane: 1, kind: "rock" },
  { distance: 32, lane: 2, kind: "star" },
  { distance: 36, lane: 0, kind: "rock" },
  { distance: 44, lane: 2, kind: "star" },
  { distance: 48, lane: 0, kind: "rock" },
  { distance: 52, lane: 1, kind: "star" },
  { distance: 56, lane: 2, kind: "rock" },
  { distance: 64, lane: 0, kind: "star" },
  { distance: 68, lane: 2, kind: "rock" },
  { distance: 72, lane: 1, kind: "star" },
  { distance: 76, lane: 0, kind: "rock" },
  { distance: 84, lane: 1, kind: "star" },
  { distance: 88, lane: 0, kind: "rock" },
  { distance: 92, lane: 2, kind: "star" },
  { distance: 96, lane: 1, kind: "rock" },
];

const WORD_SYMBOLS: Record<string, string> = {
  at: "🐎",
  qoi: "🐑",
  tuie: "🐫",
  it: "🐕",
  mysyq: "🐈",
  qasqyr: "🐺",
  barys: "🐆",
  burkit: "🦅",
  aiu: "🐻",
  tulki: "🦊",
  ui: "🏠",
  qala: "🏙️",
  dala: "🌾",
  tau: "⛰️",
  ozen: "🏞️",
  kol: "💧",
  auyl: "🛖",
  mektep: "🏫",
  nan: "🍞",
  su: "💧",
  sut: "🥛",
  et: "🍖",
  bauyrsaq: "🥯",
  qymyz: "🥛",
  shai: "🍵",
  alma: "🍎",
  bal: "🍯",
};

function symbolFor(item: VocabItem): string {
  return WORD_SYMBOLS[item.slug]
    ?? VOCAB_CATEGORY_META.find((category) => category.key === item.category)?.emoji
    ?? "◆";
}

function buildChoices(items: VocabItem[], index: number): VocabItem[] {
  if (items.length < 3) return items;
  const target = items[index % items.length];
  const first = items[(index * 3 + 2) % items.length];
  const second = items[(index * 5 + 4) % items.length];
  const unique = [target, first, second];
  for (const item of items) {
    if (unique.length >= 3) break;
    if (!unique.some((choice) => choice.slug === item.slug)) unique.push(item);
  }
  return unique
    .slice(0, 3)
    .sort((a, b) => ((a.slug.charCodeAt(0) + index) % 3) - ((b.slug.charCodeAt(0) + index) % 3));
}

function customRoute(background: string): RouteStop[] {
  return ["Start", "Word gate 1", "Halfway", "Word gate 3", "Finish"].map((name, index) => ({
    name,
    detail: index === 4 ? "Route complete" : "Your world",
    background,
  }));
}

export function SteppeSprint({
  title,
  runKey,
  vocab,
  backgroundUrl,
}: {
  title: string;
  runKey: string;
  vocab: VocabItem[];
  backgroundUrl?: string | null;
}) {
  const profile = useProfile();
  const usableVocab = useMemo(() => (vocab.length >= 3 ? vocab : EMPTY_VOCAB), [vocab]);
  const route = useMemo(() => (backgroundUrl ? customRoute(backgroundUrl) : DISCOVERY_ROUTE), [backgroundUrl]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [pace, setPace] = useState<Pace>("calm");
  const [lane, setLane] = useState<Lane>(1);
  const [distance, setDistance] = useState(0);
  const [gateIndex, setGateIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [stars, setStars] = useState(0);
  const [rocksHit, setRocksHit] = useState(0);
  const [impact, setImpact] = useState<"good" | "bad" | null>(null);
  const [trackFeedback, setTrackFeedback] = useState<TrackFeedback | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [correctSlugs, setCorrectSlugs] = useState<string[]>([]);
  const laneRef = useRef<Lane>(1);
  const distanceRef = useRef(0);
  const energyRef = useRef(3);
  const encounteredRef = useRef(new Set<number>());
  const recordedRef = useRef(false);
  const answerLockedRef = useRef(false);
  const answerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = usableVocab[gateIndex % Math.max(1, usableVocab.length)];
  const choices = useMemo(() => buildChoices(usableVocab, gateIndex), [gateIndex, usableVocab]);
  const currentStopIndex = Math.min(route.length - 1, Math.floor(distance / 20));
  const currentStop = route[currentStopIndex];
  const nextStop = route[Math.min(route.length - 1, gateIndex + 1)];

  function announce(feedback: TrackFeedback) {
    setTrackFeedback(feedback);
    setImpact(feedback.tone);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setTrackFeedback(null);
      setImpact(null);
    }, 900);
  }

  function move(nextLane: Lane) {
    if (phase !== "running") return;
    laneRef.current = nextLane;
    setLane(nextLane);
    playPop();
  }

  function stepLane(direction: -1 | 1) {
    const next = Math.max(0, Math.min(2, laneRef.current + direction)) as Lane;
    move(next);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "running") return;
      const direction = event.key === "ArrowLeft" || event.key.toLowerCase() === "a"
        ? -1
        : event.key === "ArrowRight" || event.key.toLowerCase() === "d"
          ? 1
          : 0;
      if (!direction) return;
      event.preventDefault();
      const next = Math.max(0, Math.min(2, laneRef.current + direction)) as Lane;
      laneRef.current = next;
      setLane(next);
      playPop();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  useEffect(() => () => {
    if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => {
      const next = Math.min(100, distanceRef.current + 1);
      distanceRef.current = next;
      setDistance(next);

      const event = TRACK_EVENTS.find((item) => item.distance === next);
      let exhausted = false;
      if (event && !encounteredRef.current.has(event.distance)) {
        encounteredRef.current.add(event.distance);
        if (event.lane === laneRef.current) {
          if (event.kind === "star") {
            setStars((value) => value + 1);
            setScore((value) => value + 3);
            announce({ tone: "good", title: "+3 star", detail: "Collected" });
            playCorrect();
          } else {
            const nextEnergy = Math.max(0, energyRef.current - 1);
            energyRef.current = nextEnergy;
            setEnergy(nextEnergy);
            setRocksHit((value) => value + 1);
            setScore((value) => Math.max(0, value - 2));
            setStreak(0);
            announce({ tone: "bad", title: "Rock hit", detail: "-1 energy" });
            playWrong();
            exhausted = nextEnergy === 0;
          }
        }
      }

      if (exhausted) {
        window.clearInterval(timer);
        setPhase("rest");
        return;
      }
      if (gateIndex < GATES.length && next >= GATES[gateIndex]) {
        window.clearInterval(timer);
        setPhase("question");
        return;
      }
      if (next >= 100) {
        window.clearInterval(timer);
        setPhase("finished");
        playWin();
      }
    }, PACE_MS[pace]);
    return () => window.clearInterval(timer);
  }, [gateIndex, pace, phase]);

  useEffect(() => {
    if (phase !== "finished" || recordedRef.current) return;
    recordedRef.current = true;
    store.recordGameRun({
      game: runKey,
      score,
      vocabSeen: usableVocab.slice(0, GATES.length).map((item) => item.slug),
      vocabCorrect: correctSlugs,
    });
  }, [correctSlugs, phase, runKey, score, usableVocab]);

  function answer(choice: VocabItem, choiceLane: Lane) {
    if (!question || answerLockedRef.current) return;
    answerLockedRef.current = true;
    setAnswerLocked(true);
    laneRef.current = choiceLane;
    setLane(choiceLane);
    const correct = choice.slug === question.slug;
    setAnswerFeedback({ correct, selectedSlug: choice.slug });

    if (correct) {
      setScore((value) => value + 10 + streak * 2);
      setStreak((value) => value + 1);
      setCorrectSlugs((slugs) => [...slugs, question.slug]);
      setImpact("good");
      playCorrect();
    } else {
      const nextEnergy = Math.max(0, energyRef.current - 1);
      energyRef.current = nextEnergy;
      setEnergy(nextEnergy);
      setScore((value) => Math.max(0, value - 3));
      setStreak(0);
      setImpact("bad");
      playWrong();
    }

    answerTimerRef.current = setTimeout(() => {
      answerLockedRef.current = false;
      setAnswerLocked(false);
      setAnswerFeedback(null);
      setImpact(null);
      setGateIndex((value) => value + 1);
      setPhase(energyRef.current === 0 ? "rest" : "running");
    }, 1450);
  }

  function start() {
    recordedRef.current = false;
    answerLockedRef.current = false;
    setAnswerLocked(false);
    if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    encounteredRef.current.clear();
    laneRef.current = 1;
    distanceRef.current = 0;
    energyRef.current = 3;
    setLane(1);
    setDistance(0);
    setGateIndex(0);
    setScore(0);
    setStreak(0);
    setEnergy(3);
    setStars(0);
    setRocksHit(0);
    setCorrectSlugs([]);
    setTrackFeedback(null);
    setAnswerFeedback(null);
    setImpact(null);
    setPhase("running");
  }

  function continueAfterRest() {
    energyRef.current = 3;
    setEnergy(3);
    setImpact(null);
    setTrackFeedback(null);
    setPhase("running");
  }

  return (
    <GameShell title={title} kk="Дала жарысы" scene="places" right={<Scoreboard label="Score" value={score} />}>
      {phase === "finished" && <Confetti count={70} />}
      <div
        className={`sprint-stage relative mx-auto min-h-[590px] max-w-4xl overflow-hidden rounded-lg border border-steppe/10 bg-[#88c9ec] shadow-inner sm:min-h-[650px] ${
          impact === "bad" ? "sprint-impact" : ""
        }`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`${currentStopIndex}-${currentStop.background}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentStop.background})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,48,73,.05),rgba(18,43,52,.2)_48%,rgba(11,35,38,.48))]" />

        <div className="absolute inset-x-0 top-0 z-10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 rounded-lg bg-white/92 px-3 py-2 text-steppe shadow-sm backdrop-blur">
              <p className="flex items-center gap-1.5 truncate text-sm font-black"><MapPin size={15} /> {currentStop.name}</p>
              <p className="truncate text-[10px] font-bold text-steppe/55">{currentStop.detail}</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-white/92 px-3 py-2 shadow-sm backdrop-blur" aria-label={`${energy} energy remaining`}>
              {[0, 1, 2].map((heart) => (
                <Heart key={heart} size={18} className={heart < energy ? "fill-[#e35f4c] text-[#e35f4c]" : "text-steppe/20"} />
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/88 px-3 py-2 shadow-sm backdrop-blur">
            <Gauge size={16} className="shrink-0 text-steppe" />
            <span className="w-10 text-xs font-black text-steppe">{distance} m</span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-steppe/15 shadow-inner">
              <motion.div className="h-full bg-[#ffd84f]" animate={{ width: `${distance}%` }} />
            </div>
            <span className="flex items-center gap-1 text-xs font-black text-steppe"><Sparkles size={14} /> {streak}</span>
          </div>
        </div>

        <div className="sprint-road absolute inset-x-[7%] bottom-0 top-[13%] overflow-hidden sm:inset-x-[11%]">
          {[0, 1, 2].map((trackLane) => (
            <button
              key={trackLane}
              type="button"
              aria-label={`Move to ${LANE_NAMES[trackLane].toLowerCase()} lane`}
              onClick={() => move(trackLane as Lane)}
              className="absolute bottom-0 top-0 border-x border-dashed border-white/50"
              style={{ left: `${trackLane * 33.333}%`, width: "33.333%" }}
            />
          ))}

          {TRACK_EVENTS.filter((event) => event.distance > distance && event.distance <= distance + 24).map((event) => {
            const approach = 1 - (event.distance - distance) / 24;
            const close = event.distance - distance <= 7;
            return (
              <div
                key={event.distance}
                className={`pointer-events-none absolute z-[5] flex flex-col items-center font-black drop-shadow-lg ${
                  event.kind === "star" ? "text-[#ffd84f]" : "text-white"
                }`}
                style={{
                  left: `${event.lane * 33.333 + 16.666}%`,
                  top: `${15 + approach * 70}%`,
                  opacity: 0.55 + approach * 0.45,
                  transform: `translate(-50%, -50%) scale(${0.62 + approach * 0.65})`,
                }}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-full border-2 shadow-xl ${
                  event.kind === "star"
                    ? "border-white/80 bg-[#1e4d8c] text-2xl"
                    : "border-white/70 bg-[#c8513e] text-2xl"
                } ${close ? "ring-4 ring-white/30" : ""}`}>
                  {event.kind === "star" ? "★" : "🪨"}
                </span>
                {close && <span className="mt-1 rounded bg-black/55 px-1.5 py-0.5 text-[9px] uppercase">{event.kind === "star" ? "+3" : "-1 energy"}</span>}
              </div>
            );
          })}

          <motion.div
            className="absolute bottom-7 z-10 grid place-items-center"
            animate={{ left: `calc(${lane * 33.333 + 16.666}% - 31px)` }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            <div className="rounded-full bg-white/85 p-1.5 shadow-[0_12px_26px_rgba(10,36,58,.38)] ring-4 ring-[#ffd84f]">
              <Avatar size={50} />
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {trackFeedback && phase === "running" && (
            <motion.div
              key={`${trackFeedback.title}-${distance}`}
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              role="status"
              className={`absolute left-1/2 top-[29%] z-30 -translate-x-1/2 rounded-lg border-2 px-4 py-2 text-center shadow-xl ${
                trackFeedback.tone === "good" ? "border-[#ffd84f] bg-steppe text-white" : "border-white bg-[#b44736] text-white"
              }`}
            >
              <p className="font-black">{trackFeedback.title}</p>
              <p className="text-[10px] font-bold uppercase opacity-75">{trackFeedback.detail}</p>
            </motion.div>
          )}

          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-[#133e5a]/68 p-3 backdrop-blur-[3px] sm:p-5"
            >
              <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffd84f] text-steppe"><Flag size={23} /></div>
                  <div>
                    <p className="text-xs font-black uppercase text-[#e35f4c]">How this run works</p>
                    <h2 className="text-2xl font-black text-steppe">Reach Turkistan</h2>
                    <p className="mt-1 text-sm font-bold text-steppe/60">Move lanes before an object reaches your runner. Four word gates connect the landmark trail.</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-[#eef7ff] p-3 text-center">
                    <div className="flex justify-center gap-1 text-steppe"><ArrowLeft size={18} /><ArrowRight size={18} /></div>
                    <p className="mt-1 text-xs font-black text-steppe">Move lanes</p>
                    <p className="text-[10px] font-bold text-steppe/50">Tap, arrows, or A / D</p>
                  </div>
                  <div className="rounded-lg bg-[#fff8df] p-3 text-center">
                    <Star size={20} className="mx-auto fill-[#ffd84f] text-steppe" />
                    <p className="mt-1 text-xs font-black text-steppe">Collect stars</p>
                    <p className="text-[10px] font-bold text-steppe/50">Each star adds 3</p>
                  </div>
                  <div className="rounded-lg bg-[#fff0ed] p-3 text-center">
                    <TriangleAlert size={20} className="mx-auto text-[#c8513e]" />
                    <p className="mt-1 text-xs font-black text-steppe">Dodge rocks</p>
                    <p className="text-[10px] font-bold text-steppe/50">A hit costs 1 energy</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-steppe/10 p-3">
                  <p className="text-xs font-black text-steppe">At a word gate</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-steppe/55">Each answer belongs to a lane. Pick the Kazakh translation for a +10 shortcut. A wrong lane takes a detour and costs 1 energy.</p>
                </div>

                <div className="mt-4 flex items-center gap-1" aria-label="Landmark route">
                  {route.map((stop, index) => (
                    <div key={`${stop.name}-${index}`} className="flex min-w-0 flex-1 items-center last:flex-none">
                      <div className="min-w-0 text-center">
                        <span className={`mx-auto block h-3 w-3 rounded-full ${index === 0 ? "bg-[#e35f4c] ring-4 ring-[#ffe1db]" : "bg-steppe/20"}`} />
                        <span className="mt-1 block max-w-16 truncate text-[9px] font-black text-steppe/60">{stop.name}</span>
                      </div>
                      {index < route.length - 1 && <span className="mx-1 h-0.5 flex-1 bg-steppe/10" />}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-lg bg-[#edf2f5] p-1" aria-label="Trail pace">
                  {(["calm", "quick"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPace(option)}
                      aria-pressed={pace === option}
                      className={`rounded-md px-3 py-2 text-xs font-black transition ${pace === option ? "bg-white text-steppe shadow-sm" : "text-steppe/55"}`}
                    >
                      {option === "calm" ? "Calm pace" : "Quick pace"}
                    </button>
                  ))}
                </div>
                <Button variant="gold" size="lg" className="mt-4 w-full" onClick={start} disabled={usableVocab.length < 3}>
                  Start landmark run
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "question" && question && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="absolute inset-0 z-20 flex flex-col justify-end bg-[#133e5a]/45 p-3 backdrop-blur-[2px] sm:p-5"
            >
              <div className="mx-auto w-full max-w-3xl rounded-lg bg-white p-4 shadow-2xl sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-[#e35f4c]">Word gate {gateIndex + 1} of {GATES.length}</p>
                    <p className="text-xs font-bold text-steppe/50">Correct lane unlocks the shortcut to {nextStop.name}.</p>
                  </div>
                  <div className="flex gap-0.5" aria-label={`${energy} energy remaining`}>
                    {[0, 1, 2].map((heart) => <Heart key={heart} size={16} className={heart < energy ? "fill-[#e35f4c] text-[#e35f4c]" : "text-steppe/20"} />)}
                  </div>
                </div>
                <p className="mt-3 text-center text-xs font-black uppercase text-steppe/45">Choose the Kazakh word for</p>
                <h2 className="text-center text-2xl font-black text-steppe sm:text-3xl">{baseText(question, profile.baseLanguage)}</h2>
                <p className="mt-1 text-center text-xs font-bold text-steppe/50">Your answer moves the runner into that lane.</p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                  {choices.map((choice, index) => {
                    const isCorrect = choice.slug === question.slug;
                    const isSelected = answerFeedback?.selectedSlug === choice.slug;
                    const outcomeClass = answerFeedback
                      ? isCorrect
                        ? "border-[#2f8d47] bg-[#eaf8ed]"
                        : isSelected
                          ? "border-[#c8513e] bg-[#fff0ed]"
                          : "border-steppe/10 bg-[#f4f8fb] opacity-55"
                      : "border-steppe/10 bg-[#f4f8fb] hover:-translate-y-1 hover:border-[#ff9a4f] hover:bg-[#fff8df]";
                    return (
                      <button
                        key={choice.slug}
                        type="button"
                        onClick={() => answer(choice, index as Lane)}
                        disabled={answerLocked}
                        className={`relative min-w-0 rounded-lg border-2 p-2 text-center transition sm:p-3 ${outcomeClass}`}
                      >
                        <span className="block text-[9px] font-black uppercase text-steppe/45">{LANE_NAMES[index]} lane</span>
                        <span className="mt-1 block text-3xl" aria-hidden="true">{symbolFor(choice)}</span>
                        <span className="mt-1 block overflow-hidden text-ellipsis text-base font-black text-steppe sm:text-xl">{choice.kk}</span>
                        {answerFeedback && isCorrect && <Check size={17} className="absolute right-2 top-2 text-[#2f8d47]" />}
                        {answerFeedback && isSelected && !isCorrect && <X size={17} className="absolute right-2 top-2 text-[#c8513e]" />}
                      </button>
                    );
                  })}
                </div>
                {answerFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="status"
                    className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-black ${answerFeedback.correct ? "bg-[#eaf8ed] text-[#236d37]" : "bg-[#fff0ed] text-[#a13c2e]"}`}
                  >
                    {answerFeedback.correct
                      ? `Shortcut unlocked: +${10 + streak * 2} points`
                      : `Detour: ${baseText(question, profile.baseLanguage)} = ${question.kk}. -1 energy`}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {phase === "rest" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 grid place-items-center bg-[#133e5a]/68 p-4 backdrop-blur-[3px]"
            >
              <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0ed] text-[#c8513e]"><Heart size={25} /></div>
                <p className="mt-4 text-xs font-black uppercase text-[#e35f4c]">Rest stop</p>
                <h2 className="text-2xl font-black text-steppe">Catch your breath</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-steppe/60">Your run is not over. Energy refills here so you can keep learning the route.</p>
                <Button variant="gold" size="lg" className="mt-5 w-full" onClick={continueAfterRest}>Refill and continue</Button>
              </div>
            </motion.div>
          )}

          {phase === "finished" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 grid place-items-center bg-[#133e5a]/68 p-4 backdrop-blur-[3px]"
            >
              <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-2xl">
                <p className="text-xs font-black uppercase text-[#e35f4c]">Arrived in Turkistan</p>
                <h2 className="mt-1 text-3xl font-black text-steppe">{score} points</h2>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-[#fff8df] p-3"><p className="text-xl font-black text-steppe">{stars}</p><p className="text-[10px] font-black uppercase text-steppe/50">Stars</p></div>
                  <div className="rounded-lg bg-[#eaf8ed] p-3"><p className="text-xl font-black text-steppe">{correctSlugs.length}/4</p><p className="text-[10px] font-black uppercase text-steppe/50">Words</p></div>
                  <div className="rounded-lg bg-[#fff0ed] p-3"><p className="text-xl font-black text-steppe">{rocksHit}</p><p className="text-[10px] font-black uppercase text-steppe/50">Rock hits</p></div>
                </div>
                <Button variant="gold" size="lg" className="mt-5 w-full" onClick={start}><RotateCcw size={18} /> Run again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-3 left-3 z-20 flex items-end gap-2">
          <button
            type="button"
            title="Move left"
            aria-label="Move left"
            onClick={() => stepLane(-1)}
            disabled={phase !== "running" || lane === 0}
            className="grid h-12 w-12 place-items-center rounded-lg bg-white/92 text-steppe shadow-lg backdrop-blur transition active:scale-95 disabled:opacity-35"
          ><ArrowLeft size={22} /></button>
          <button
            type="button"
            title="Move right"
            aria-label="Move right"
            onClick={() => stepLane(1)}
            disabled={phase !== "running" || lane === 2}
            className="grid h-12 w-12 place-items-center rounded-lg bg-white/92 text-steppe shadow-lg backdrop-blur transition active:scale-95 disabled:opacity-35"
          ><ArrowRight size={22} /></button>
        </div>
        {phase === "running" && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden rounded-lg bg-white/88 px-3 py-2 text-[10px] font-black text-steppe shadow-lg backdrop-blur sm:block">
            ★ +3 &nbsp; 🪨 -1 energy
          </div>
        )}
      </div>
    </GameShell>
  );
}
