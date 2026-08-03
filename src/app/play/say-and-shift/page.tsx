"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Ear, Flag, Heart, Mic, MicOff, RotateCcw, Upload, Volume2, WifiOff, X } from "lucide-react";
import { BandPuppet } from "@/components/game/band-puppet";
import { Confetti } from "@/components/game/confetti";
import { DrawingBoard } from "@/components/game/drawing-board";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { ReportQuestion } from "@/components/report-question";
import { Button } from "@/components/ui/button";
import { VOCAB, type VocabItem } from "@/content/vocab";
import { vocabItemId } from "@/lib/items";
import { baseText } from "@/lib/lang";
import { playClip, playCorrect, playWrong } from "@/lib/audio";
import { resizeImageFile } from "@/lib/client-image";
import { scanForTarget } from "@/lib/speech-match";
import { store, useProfile } from "@/lib/store";
import { openRaceChannel } from "@/lib/supabase/sync";
import { logAnswer } from "@/lib/telemetry";

const TOTAL_WALLS = 6;
const START_LIVES = 3;
// How long to keep listening for one wall before giving up and revealing the
// tap fallback — a stand-in for "2 unclear retries" now that there is no
// discrete retry, just continuous listening.
const MAX_LISTEN_MS = 15000;

type WallCandidate = { item: VocabItem };
type Wall = { target: VocabItem; candidates: WallCandidate[] };

// Deterministic picks (index-based, not Math.random) so server and client
// render the same wall list — same trick as SteppeSprint's buildChoices.
function wallFor(pool: VocabItem[], index: number): Wall {
  const target = pool[(index * 11 + 3) % pool.length];
  const others = pool.filter((item) => item.slug !== target.slug);
  const d1 = others[(index * 17 + 5) % others.length];
  let d2 = others[(index * 23 + 9) % others.length];
  if (d2.slug === d1.slug) d2 = others[(index * 23 + 10) % others.length];

  const order: [number, number, number][] = [
    [0, 1, 2], [1, 0, 2], [2, 1, 0], [1, 2, 0], [0, 2, 1], [2, 0, 1],
  ];
  const positions = order[index % order.length];
  const items = [target, d1, d2];
  const candidates: WallCandidate[] = positions.map((itemIndex) => ({ item: items[itemIndex] }));

  return { target, candidates };
}

// Six sky stops, one per wall — the run reads as a day passing, dawn to
// stars, finishing the last wall (and the confetti screen after it) at night.
type SkyStop = { top: string; mid: string; bottom: string; sun: string; sunY: number; night?: boolean };
const SKY_PALETTES: SkyStop[] = [
  { top: "#ffd9b3", mid: "#ffe9cf", bottom: "#fff6e0", sun: "#ffb457", sunY: 70 },
  { top: "#bfe6ff", mid: "#dff3ff", bottom: "#fff6d8", sun: "#ffd75f", sunY: 40 },
  { top: "#8fd0ff", mid: "#cdeeff", bottom: "#fef9e0", sun: "#fff07a", sunY: 12 },
  { top: "#7ec2f2", mid: "#cbe8ff", bottom: "#ffedc2", sun: "#ffd75f", sunY: 30 },
  { top: "#6a5b9e", mid: "#e88a6b", bottom: "#ffce8a", sun: "#ff8a5b", sunY: 62 },
  { top: "#16213b", mid: "#263a5e", bottom: "#3c4f74", sun: "#f4f1de", sunY: 78, night: true },
];

// Sun-with-rays by day, crescent moon by night — same hand-drawn language as
// MountainBackdrop's scene-sun, not a plain CSS circle with a glow filter.
function SkySun({ color, night }: { color: string; night: boolean }) {
  if (night) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <path d="M64 8a42 42 0 1 0 0 84 33 33 0 1 1 0-84Z" fill={color} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeWidth="7">
        <path d="M60 6v14" />
        <path d="M60 100v14" />
        <path d="M6 60h14" />
        <path d="M100 60h14" />
        <path d="M21 21l10 10" />
        <path d="M89 89l10 10" />
        <path d="M99 21l-10 10" />
        <path d="M31 89l-10 10" />
      </g>
      <circle cx="60" cy="60" r="30" fill={color} />
    </svg>
  );
}

// A running horse silhouette, not an emoji — one filled path, side profile.
function HorseSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" className={className} aria-hidden="true">
      <path
        d="M8 46c-3-9 3-16 12-17l3-10c2-6 8-11 15-11 3 0 5 2 5 5l-1 6 9-3c7-2 14 1 17 7l4 8c4 1 7 4 7 8 0 4-3 7-7 7h-3l-2 9h-7l1-8-11 1-3 9h-7l2-9c-6-1-11-4-14-8l-9 2-1 8H9l2-9c-2-1-3-3-3-5Z"
        fill="currentColor"
      />
      <circle cx="70" cy="20" r="2.2" fill="var(--horse-eye, #16213b)" />
    </svg>
  );
}

// How long the runner spends crossing open ground toward each wall — this is
// the "Subway Surfer" stretch: scrolling scenery, an occasional horse, and
// the bonus word's letters revealing one at a time.
const RUN_MS = 3200;

// A themed bonus word to spell out while running, always something that
// isn't one of this run's six answers — collecting it can't leak a wall's
// answer ahead of its prompt.
function themeWordFor(pool: VocabItem[], walls: Wall[]): VocabItem {
  const targetSlugs = new Set(walls.map((w) => w.target.slug));
  return pool.find((item) => !targetSlugs.has(item.slug)) ?? pool[0];
}

type Phase = "ready" | "run" | "wall" | "rest" | "finished";
type Outcome = "correct" | "wrong" | null;
type ListenerStatus = "idle" | "listening" | "checking";

// Continuous mic listener for one wall. Back-to-back, non-overlapping chunks
// (the first cut of this) meant a word spoken right across a chunk boundary
// got clipped on both sides and matched nothing — the exact "I have to say
// it five times" complaint. Fix: overlapping windows. Every SEND_INTERVAL_MS
// a fresh MediaRecorder starts and records for WINDOW_MS, independently of
// any recorder already in flight — several windows are open at once, each
// its own complete, independently-decodable recording (MediaRecorder only
// guarantees a valid file across one full start→stop cycle, so this can't be
// done by trimming one continuous stream's chunks). With a 50% overlap
// (WINDOW_MS = 2x SEND_INTERVAL_MS), any word under ~SEND_INTERVAL_MS long
// falls entirely inside at least one window no matter when it's spoken.
// Scans the target only, never the distractors, so overheard chatter can
// only ever produce a correct match, never an accidental wrong one.
// `onMatch`/`onTimeout` are read through refs rather than the effect's own
// deps so a parent re-render (which recreates them every time) never
// interrupts an in-flight window.
const SEND_INTERVAL_MS = 900;
const WINDOW_MS = 1800;

function useWallListener({
  stream,
  active,
  target,
  distractors,
  onMatch,
  onTimeout,
}: {
  stream: MediaStream | null;
  active: boolean;
  target: VocabItem;
  distractors: VocabItem[];
  onMatch: (transcript: string) => void;
  onTimeout: () => void;
}): ListenerStatus {
  const [status, setStatus] = useState<ListenerStatus>("idle");
  const targetRef = useRef(target);
  const distractorsRef = useRef(distractors);
  const onMatchRef = useRef(onMatch);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => { distractorsRef.current = distractors; }, [distractors]);
  useEffect(() => { onMatchRef.current = onMatch; }, [onMatch]);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  useEffect(() => {
    if (!active || !stream) {
      setStatus("idle");
      return;
    }

    let live = true;
    let windowAttempt = 0;
    let inFlight = 0;

    function startWindow() {
      if (!live) return;
      const localChunks: Blob[] = [];
      const mr = new MediaRecorder(stream as MediaStream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };
      mr.onstop = () => {
        if (!live) return;
        void processWindow(new Blob(localChunks, { type: mr.mimeType || "audio/webm" }));
      };
      mr.start();
      setTimeout(() => {
        if (mr.state !== "inactive") mr.stop();
      }, WINDOW_MS);
    }

    async function processWindow(blob: Blob) {
      inFlight += 1;
      setStatus("checking");
      windowAttempt += 1;
      const attemptIndex = windowAttempt;
      try {
        const profile = store.get();
        const form = new FormData();
        form.append("audio", blob, "chunk.webm");
        form.append("profile_id", profile.id === "server-profile" ? "" : profile.id);
        const res = await fetch("/api/say-check", { method: "POST", body: form });
        const json = (await res.json()) as { transcript?: string };
        if (!live) return;
        const transcript = json.transcript ?? "";
        const result = scanForTarget(transcript, targetRef.current, distractorsRef.current);
        logAnswer({
          gameSlug: "say-and-shift",
          itemId: vocabItemId(targetRef.current),
          promptKind: "audio",
          response: transcript,
          isCorrect: result.found ? true : null,
          attemptIndex,
        });
        if (result.found) {
          onMatchRef.current(transcript);
          return;
        }
      } catch {
        // network blip on this window — the overlapping ones keep going
      } finally {
        inFlight -= 1;
      }
      if (live) setStatus(inFlight > 0 ? "checking" : "listening");
    }

    setStatus("listening");
    startWindow();
    const spawnTimer = setInterval(() => {
      if (live) startWindow();
    }, SEND_INTERVAL_MS);
    const timeoutTimer = setTimeout(() => {
      if (live) onTimeoutRef.current();
    }, MAX_LISTEN_MS);

    return () => {
      live = false;
      clearInterval(spawnTimer);
      clearTimeout(timeoutTimer);
      setStatus("idle");
    };
    // target/distractors/onMatch/onTimeout are read through refs above —
    // only target.slug controls whether this restarts for a new wall.
  }, [active, stream, target.slug]);

  return status;
}

export default function SayAndShiftPage() {
  const profile = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // State, not a ref: useWallListener needs this value during render, and a
  // ref read during render isn't guaranteed to reflect the latest value.
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const walls = useMemo(() => Array.from({ length: TOTAL_WALLS }, (_, i) => wallFor(VOCAB, i)), []);

  const [phase, setPhase] = useState<Phase>("ready");
  const [wallIndex, setWallIndex] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctSlugs, setCorrectSlugs] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [startingMic, setStartingMic] = useState(false);
  const [wallTimedOut, setWallTimedOut] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);
  const [drawMode, setDrawMode] = useState<"draw" | "upload">("draw");
  const [pendingRunner, setPendingRunner] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [themeMode, setThemeMode] = useState<"auto" | "day" | "night">("auto");

  const recordedRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wall = walls[Math.min(wallIndex, walls.length - 1)];
  const targetCandidate = wall.candidates.find((c) => c.item.slug === wall.target.slug) ?? wall.candidates[0];
  const distractorItems = wall.candidates.filter((c) => c.item.slug !== wall.target.slug).map((c) => c.item);
  const skyIndex = themeMode === "day" ? 2 : themeMode === "night" ? 5 : Math.min(wallIndex, SKY_PALETTES.length - 1);
  const sky = SKY_PALETTES[skyIndex];
  const customBackground = profile.gameBackgrounds["say-and-shift"] ?? null;
  const themeWord = useMemo(() => themeWordFor(VOCAB, walls), [walls]);
  const themeLetters = useMemo(() => [...themeWord.kk].filter((ch) => ch !== " "), [themeWord]);
  // One new letter reveals per wall's run — always includes the current
  // wall's own letter once its "run" segment has started.
  const revealedLetterCount = Math.min(wallIndex + (phase === "ready" ? 0 : 1), themeLetters.length);
  const savedRunner = profile.artifacts.find((a) => a.id === profile.runnerArtifactId)?.dataUrl ?? null;
  const runnerImage = pendingRunner ?? savedRunner;
  const showTapFallback = !online || micPermission === "denied" || wallTimedOut || manualFallback;
  // Keeps listening even once the tap-fallback grid is showing (after a
  // timeout, or the kid tapped "Tap instead" themselves) — saying the word
  // out loud should still resolve it, not require abandoning the mic entirely.
  const listenActive = phase === "wall" && outcome === null && online && micPermission === "granted";

  useEffect(() => {
    function goOnline() { setOnline(true); }
    function goOffline() { setOnline(false); }
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Live multi-table race (projector view at /facilitator/[code]/race).
  // Broadcast-only, and only when actually in a facilitator session — solo
  // play off a session code sends nothing, nobody's listening.
  const raceChannelRef = useRef<ReturnType<typeof openRaceChannel> | null>(null);
  useEffect(() => {
    if (!profile.sessionCode) return;
    const channel = openRaceChannel(profile.sessionCode);
    raceChannelRef.current = channel;
    return () => channel.close();
  }, [profile.sessionCode]);

  useEffect(() => {
    if (!profile.sessionCode) return;
    raceChannelRef.current?.send({
      profileId: profile.id,
      name: profile.displayName,
      table: profile.table ?? "?",
      wallIndex,
      totalWalls: TOTAL_WALLS,
      lives,
      finished: phase === "finished",
    });
    // Fires on wall advance and on finishing, not on every phase flicker in
    // between — profile fields and lives are read at trigger time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallIndex, phase === "finished", profile.sessionCode]);

  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (phase !== "finished" || recordedRef.current) return;
    recordedRef.current = true;
    store.recordGameRun({
      game: "say-and-shift",
      score,
      vocabSeen: walls.map((w) => w.target.slug),
      vocabCorrect: correctSlugs,
    });
  }, [correctSlugs, phase, score, walls]);

  function resolveCandidate(candidate: WallCandidate) {
    if (phase !== "wall") return;
    const isTarget = candidate.item.slug === wall.target.slug;

    if (isTarget) {
      setOutcome("correct");
      setScore((v) => v + 10 + streak * 2);
      setStreak((v) => v + 1);
      setCorrectSlugs((slugs) => [...slugs, wall.target.slug]);
      playCorrect();
      advanceTimerRef.current = setTimeout(goToNextWallOrFinish, 1300);
    } else {
      setOutcome("wrong");
      setStreak(0);
      playWrong();
      playClip(`/audio/vocab/${wall.target.slug}.mp3`, wall.target.kk);
      setMessage(`${baseText(wall.target, profile.baseLanguage)} = ${wall.target.kk}`);
      const remaining = Math.max(0, lives - 1);
      setLives(remaining);
      advanceTimerRef.current = setTimeout(() => {
        if (remaining === 0) {
          setPhase("rest");
        } else {
          goToNextWallOrFinish();
        }
      }, 1700);
    }
  }

  const listenerStatus = useWallListener({
    stream: micStream,
    active: listenActive,
    target: wall.target,
    distractors: distractorItems,
    onMatch: () => resolveCandidate(targetCandidate),
    onTimeout: () => setWallTimedOut(true),
  });

  async function startRun() {
    recordedRef.current = false;
    setWallIndex(0);
    setLives(START_LIVES);
    setScore(themeLetters.length > 0 ? 2 : 0);
    setStreak(0);
    setCorrectSlugs([]);
    setOutcome(null);
    setMessage(null);
    setWallTimedOut(false);
    setManualFallback(false);

    if (micPermission === "unknown") {
      setStartingMic(true);
      try {
        setMicStream(await navigator.mediaDevices.getUserMedia({ audio: true }));
        setMicPermission("granted");
      } catch {
        setMicPermission("denied");
      }
      setStartingMic(false);
    }

    setPhase("run");
    advanceTimerRef.current = setTimeout(() => setPhase("wall"), RUN_MS);
  }

  function goToNextWallOrFinish() {
    const next = wallIndex + 1;
    if (next >= TOTAL_WALLS) {
      setPhase("finished");
      return;
    }
    setWallIndex(next);
    if (next < themeLetters.length) setScore((v) => v + 2);
    setOutcome(null);
    setMessage(null);
    setWallTimedOut(false);
    setManualFallback(false);
    setPhase("run");
    advanceTimerRef.current = setTimeout(() => setPhase("wall"), RUN_MS);
  }

  function tapCandidate(candidate: WallCandidate) {
    if (phase !== "wall") return;
    resolveCandidate(candidate);
  }

  function continueAfterRest() {
    setLives(START_LIVES);
    goToNextWallOrFinish();
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Choose an image smaller than 12 MB.");
      return;
    }
    setUploadError(null);
    try {
      setPendingRunner(await resizeImageFile(file));
    } catch {
      setUploadError("That image could not be prepared. Try a PNG, JPG, or WebP file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function saveRunner() {
    if (!pendingRunner || pendingRunner === savedRunner) return;
    store.addArtifact("runner", pendingRunner);
    setPendingRunner(null);
  }

  const passingThrough = outcome === "correct" && phase === "wall";

  return (
    <GameShell title="Say & Shift" kk="Айт та өт" right={<Scoreboard label="Score" value={score} />}>
      {phase === "finished" && <Confetti count={70} />}

      <motion.div
        className="relative mx-auto min-h-[560px] max-w-4xl overflow-hidden rounded-lg border border-steppe/10 shadow-inner sm:min-h-[600px]"
        animate={customBackground ? {} : { background: `linear-gradient(180deg, ${sky.top}, ${sky.mid} 55%, ${sky.bottom})` }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
        style={customBackground ? { backgroundImage: `url(${customBackground})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {customBackground && (
          <div className="pointer-events-none absolute inset-0 bg-black/15" />
        )}

        {!customBackground && sky.night && (
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 15% 20%, white, transparent), radial-gradient(1.5px 1.5px at 35% 12%, white, transparent), radial-gradient(1px 1px at 55% 25%, white, transparent), radial-gradient(1.5px 1.5px at 75% 15%, white, transparent), radial-gradient(1px 1px at 90% 30%, white, transparent), radial-gradient(1px 1px at 25% 8%, white, transparent), radial-gradient(1.5px 1.5px at 65% 6%, white, transparent)" }} />
        )}

        {!customBackground && !sky.night && (
          <div
            className="mountain-clouds pointer-events-none opacity-80"
            style={{ "--scene-cloud": "rgba(255,255,255,.92)", "--mountain-speed": "26s" } as React.CSSProperties}
          >
            <span />
            <span />
            <span />
          </div>
        )}

        {!customBackground && (
        <motion.div
          className="pointer-events-none absolute z-0 h-16 w-16"
          animate={{ left: "82%", top: `${sky.sunY}%` }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{ marginLeft: -32, marginTop: -32, filter: `drop-shadow(0 0 18px ${sky.sun}99)` }}
        >
          <SkySun color={sky.sun} night={Boolean(sky.night)} />
        </motion.div>
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
          <div className="rounded-lg bg-white/92 px-3 py-2 text-xs font-black text-steppe shadow-sm backdrop-blur">
            Wall {Math.min(wallIndex + 1, TOTAL_WALLS)} of {TOTAL_WALLS}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white/92 px-3 py-2 shadow-sm backdrop-blur" aria-label={`${lives} lives remaining`}>
            {[0, 1, 2].map((heart) => (
              <Heart key={heart} size={18} className={heart < lives ? "fill-[#c8513e] text-[#c8513e]" : "text-steppe/20"} />
            ))}
          </div>
        </div>

        {phase !== "ready" && (
          <div className="absolute inset-x-0 top-14 z-10 flex flex-wrap items-center justify-center gap-1">
            {themeLetters.map((ch, i) =>
              i < revealedLetterCount ? (
                <motion.span
                  key={`revealed-${i}`}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="grid h-6 w-6 place-items-center rounded-md bg-[#ffd84f] text-xs font-black text-steppe-700 shadow sm:h-7 sm:w-7 sm:text-sm"
                >
                  {ch}
                </motion.span>
              ) : (
                <span key={`hidden-${i}`} className="grid h-6 w-6 place-items-center rounded-md bg-white/35 text-xs text-white/50 sm:h-7 sm:w-7">•</span>
              ),
            )}
            {revealedLetterCount >= themeLetters.length && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-black text-steppe shadow-sm"
              >
                {baseText(themeWord, profile.baseLanguage)}!
              </motion.span>
            )}
          </div>
        )}

        {/* Ground + runner */}
        <div className="absolute inset-x-0 bottom-0 top-[15%] overflow-hidden">
          <div className="runner-hills-far absolute inset-x-0 bottom-16 top-0 opacity-70" />
          <div className="runner-hills-near absolute inset-x-0 bottom-16 h-16 opacity-90" />
          <div className="runner-ground absolute inset-x-0 bottom-0 h-16" />

          {phase === "run" && wallIndex % 2 === 0 && (
            <motion.div
              className="absolute bottom-16 z-10 w-16 text-steppe-700 opacity-35 sm:w-20"
              initial={{ left: "-15%" }}
              animate={{ left: "120%" }}
              transition={{ duration: RUN_MS / 1000, ease: "linear" }}
            >
              <HorseSilhouette className="w-full" />
            </motion.div>
          )}

          <motion.div
            key={`runner-${wallIndex}`}
            className="absolute bottom-14 z-20 flex flex-col items-center"
            initial={{ left: "6%" }}
            animate={{ left: phase === "ready" ? "6%" : passingThrough ? "94%" : "58%" }}
            transition={{ duration: passingThrough ? 0.7 : phase === "run" ? RUN_MS / 1000 : 0.4, ease: "easeOut" }}
          >
            <motion.div
              animate={phase === "wall" ? { y: [0, -5, 0] } : { y: 0 }}
              transition={phase === "wall" ? { repeat: Infinity, duration: 0.42, ease: "easeInOut" } : undefined}
              className={outcome === "wrong" ? "sprint-impact" : ""}
            >
              <div className="relative">
                {phase === "wall" && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2">
                    {outcome === "correct" ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[#2f8d47] text-white shadow"
                      >
                        <Check size={18} strokeWidth={3} />
                      </motion.div>
                    ) : outcome === "wrong" ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[#c8513e] text-white shadow"
                      >
                        <X size={18} strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <span className="block h-3 w-3 animate-pulse rounded-full bg-white/70 shadow" />
                    )}
                  </div>
                )}
                <BandPuppet src={runnerImage} size={72} running={phase === "run" || phase === "wall"} />
              </div>
            </motion.div>
          </motion.div>
        </div>

        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-[#133e5a]/68 p-3 backdrop-blur-[3px] sm:p-5"
            >
              <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffd0c8] text-[#c8513e]">
                    <Mic size={23} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-[#e35f4c]">How this run works</p>
                    <h2 className="text-2xl font-black text-steppe">Just say the word out loud</h2>
                    <p className="mt-1 text-sm font-bold text-steppe/60">The game is always listening — no button to hold. Say the Kazakh word out loud and your runner slips through the wall. {TOTAL_WALLS} walls, {START_LIVES} lives.</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-[#fff0ed] p-3 text-center">
                    <Mic size={20} className="mx-auto text-[#c8513e]" />
                    <p className="mt-1 text-xs font-black text-steppe">Just talk</p>
                    <p className="text-[10px] font-bold text-steppe/50">No button, anytime</p>
                  </div>
                  <div className="rounded-lg bg-[#eaf8ed] p-3 text-center">
                    <Check size={20} className="mx-auto text-[#2f8d47]" strokeWidth={3} />
                    <p className="mt-1 text-xs font-black text-steppe">Straight through</p>
                    <p className="text-[10px] font-bold text-steppe/50">Right word, wall gone</p>
                  </div>
                  <div className="rounded-lg bg-[#fff8df] p-3 text-center">
                    <Ear size={20} className="mx-auto text-[#c99a1a]" />
                    <p className="mt-1 text-xs font-black text-steppe">Chatting is fine</p>
                    <p className="text-[10px] font-bold text-steppe/50">It only listens for the word</p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-steppe/10 p-3">
                  <p className="text-xs font-black text-steppe">Sky</p>
                  <p className="mt-1 text-xs font-bold text-steppe/55">
                    {customBackground
                      ? "You've set a custom background from the button in the corner — it's used instead of the sky below."
                      : "Auto shifts from dawn to night as you play. Or pin it."}
                  </p>
                  <div className="mt-2 grid grid-cols-3 rounded-lg bg-[#edf2f5] p-1" aria-label="Sky theme">
                    {(["auto", "day", "night"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={themeMode === mode}
                        onClick={() => setThemeMode(mode)}
                        className={`rounded-md px-2 py-1.5 text-xs font-black capitalize transition ${
                          themeMode === mode ? "bg-white text-steppe shadow-sm" : "text-steppe/55"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-steppe/10 p-3">
                  <p className="text-xs font-black text-steppe">Your runner (optional)</p>
                  <p className="mt-1 text-xs font-bold text-steppe/55">Draw or upload a character. Skip it and a default runner plays instead.</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="shrink-0 self-center rounded-lg bg-[#f4f8fb] p-2">
                      <BandPuppet src={runnerImage} size={64} running={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-2 rounded-lg bg-[#edf2f5] p-1" aria-label="Runner art source">
                        {(["draw", "upload"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={drawMode === mode}
                            onClick={() => setDrawMode(mode)}
                            className={`rounded-md px-2 py-1.5 text-xs font-black capitalize transition ${
                              drawMode === mode ? "bg-white text-steppe shadow-sm" : "text-steppe/55"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2">
                        {drawMode === "draw" ? (
                          <DrawingBoard canvasRef={canvasRef} onChange={setPendingRunner} transparent aspect="portrait" />
                        ) : (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOver(false);
                              onUpload(e.dataTransfer.files?.[0]);
                            }}
                            onPaste={(e) => {
                              const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
                              if (item) onUpload(item.getAsFile() ?? undefined);
                            }}
                            tabIndex={0}
                          >
                            <input
                              ref={fileRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              hidden
                              onChange={(event) => onUpload(event.target.files?.[0])}
                            />
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className={`grid aspect-[3/4] w-full max-w-40 place-items-center rounded-lg border-2 border-dashed text-steppe transition ${
                                dragOver ? "border-gold bg-gold/10" : "border-steppe/25 bg-[#f4f8fb]"
                              }`}
                            >
                              <span className="text-center text-xs font-black"><Upload size={22} className="mx-auto mb-1" />Drop, paste, or choose</span>
                            </button>
                            {uploadError && <p role="alert" className="mt-2 text-xs font-bold text-[#b44736]">{uploadError}</p>}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={saveRunner}
                        disabled={!pendingRunner || pendingRunner === savedRunner}
                      >
                        Use this runner
                      </Button>
                    </div>
                  </div>
                </div>

                <Button variant="gold" size="lg" className="mt-5 w-full" onClick={startRun} disabled={startingMic}>
                  {startingMic ? "One sec…" : "Start"}
                </Button>
                {micPermission === "denied" && (
                  <p className="mt-2 text-center text-xs font-bold text-steppe/50">Mic access is off — you can still play by tapping the right word.</p>
                )}
              </div>
            </motion.div>
          )}

          {phase === "wall" && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="absolute inset-x-0 top-24 z-30 p-3 sm:top-28 sm:p-5"
            >
              <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-4 text-center shadow-2xl sm:p-5">
                <p className="text-xs font-black uppercase text-[#e35f4c]">How do you say</p>
                <h2 className="text-2xl font-black text-steppe sm:text-3xl">{baseText(wall.target, profile.baseLanguage)}?</h2>

                {outcome === null && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {!showTapFallback ? (
                      <>
                        <div className="flex items-center gap-2 rounded-full bg-[#fff0ed] px-4 py-2 text-sm font-black text-[#c8513e]">
                          <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
                            {[0, 1, 2].map((bar) => (
                              <motion.span
                                key={bar}
                                className="w-1 rounded-full bg-[#c8513e]"
                                animate={{ height: [4, 15, 4] }}
                                transition={{ repeat: Infinity, duration: 0.7, delay: bar * 0.15, ease: "easeInOut" }}
                              />
                            ))}
                          </span>
                          <span className="inline-block h-3.5">{listenerStatus === "checking" ? "Checking…" : "Listening… say it whenever"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualFallback(true)}
                          className="text-xs font-bold text-steppe/45 underline decoration-dotted"
                        >
                          Tap instead
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-xs font-bold text-steppe/55">
                          {!online ? <WifiOff size={14} /> : micPermission === "denied" ? <MicOff size={14} /> : <Ear size={14} />}
                          {!online
                            ? "No connection — tap the right word instead."
                            : micPermission === "denied"
                              ? "Mic is off — tap the right word instead."
                              : "Still listening for it — tap the right word instead."}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {wall.candidates.map((candidate) => (
                            <button
                              key={candidate.item.slug}
                              type="button"
                              onClick={() => tapCandidate(candidate)}
                              className="rounded-lg border-2 border-steppe/10 bg-[#f4f8fb] px-2 py-4 text-center transition hover:-translate-y-0.5 hover:border-[#ff9a4f] hover:bg-[#fff8df]"
                            >
                              <span className="block text-base font-black text-steppe">{candidate.item.kk}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {outcome === "correct" && (
                  <p className="mt-4 text-sm font-black text-[#236d37]">
                    {wall.target.kk} — through the wall! +{10 + Math.max(0, streak - 1) * 2}
                  </p>
                )}
                {outcome === "wrong" && (
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-black text-[#a13c2e]">
                    <Volume2 size={16} /> {message}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-center">
                  <ReportQuestion itemId={vocabItemId(wall.target)} gameSlug="say-and-shift" />
                </div>
              </div>
            </motion.div>
          )}

          {phase === "rest" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 grid place-items-center bg-[#133e5a]/68 p-4 backdrop-blur-[3px]"
            >
              <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0ed] text-[#c8513e]"><Heart size={25} /></div>
                <p className="mt-4 text-xs font-black uppercase text-[#e35f4c]">Rest stop</p>
                <h2 className="text-2xl font-black text-steppe">Catch your breath</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-steppe/60">Your run is not over. Lives refill here so you can keep going.</p>
                <Button variant="gold" size="lg" className="mt-5 w-full" onClick={continueAfterRest}>Refill and continue</Button>
              </div>
            </motion.div>
          )}

          {phase === "finished" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-40 grid place-items-center bg-[#133e5a]/68 p-4 backdrop-blur-[3px]"
            >
              <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-2xl">
                <p className="text-xs font-black uppercase text-[#e35f4c]">Run complete</p>
                <h2 className="mt-1 text-3xl font-black text-steppe">{score} points</h2>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#eaf8ed] p-3"><p className="text-xl font-black text-steppe">{correctSlugs.length}/{TOTAL_WALLS}</p><p className="text-[10px] font-black uppercase text-steppe/50">Words said</p></div>
                  <div className="rounded-lg bg-[#fff8df] p-3"><p className="text-xl font-black text-steppe">{lives}</p><p className="text-[10px] font-black uppercase text-steppe/50">Lives left</p></div>
                </div>
                <Button variant="gold" size="lg" className="mt-5 w-full" onClick={startRun}><RotateCcw size={18} /> Run again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase !== "ready" && phase !== "finished" && phase !== "rest" && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden items-center gap-1 rounded-lg bg-white/88 px-3 py-2 text-[10px] font-black text-steppe shadow-lg backdrop-blur sm:flex">
            <Flag size={12} /> Wall {Math.min(wallIndex + 1, TOTAL_WALLS)} / {TOTAL_WALLS}
          </div>
        )}
      </motion.div>
    </GameShell>
  );
}
