"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Ear, Flag, Heart, Mic, MicOff, RotateCcw, Share2, SkipForward, Trash2, Upload, Volume2, WifiOff, X } from "lucide-react";
import { BandPuppet } from "@/components/game/band-puppet";
import { Confetti } from "@/components/game/confetti";
import { DrawingBoard } from "@/components/game/drawing-board";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { ReportQuestion } from "@/components/report-question";
import { Waves } from "@/components/reactbits/waves";
import { Button } from "@/components/ui/button";
import { type VocabItem } from "@/content/vocab";
import { vocabItemId } from "@/lib/items";
import { baseText } from "@/lib/lang";
import { playClip, playCorrect, playWrong } from "@/lib/audio";
import { deleteSharedCharacter, fetchGalleryCharacters, shareCharacterToGallery, toggleCharacterLike, type GalleryCharacter } from "@/lib/character-gallery";
import { resizeImageFile } from "@/lib/client-image";
import { scanForTarget } from "@/lib/speech-match";
import { store, useProfile } from "@/lib/store";
import { openRaceChannel } from "@/lib/supabase/sync";
import { logAnswer } from "@/lib/telemetry";
import { currentLevel, poolForLevel, totalWallsForLevel } from "@/lib/vocab-levels";
import { useVocab } from "@/lib/vocab-packs";

const START_LIVES = 3;

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

// The wall itself, redrawn as a steppe shrub — three overlapping leaf-clumps
// on one woody stem, same hand-drawn line language as the horse. The runner
// hops it on a correct answer instead of just sliding through empty air.
function Bush({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 60" className={className} aria-hidden="true">
      <path d="M38 58 V38" stroke="#5b3a22" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="24" cy="30" rx="17" ry="15" fill="currentColor" />
      <ellipse cx="56" cy="30" rx="17" ry="15" fill="currentColor" />
      <ellipse cx="40" cy="18" rx="19" ry="16" fill="currentColor" />
    </svg>
  );
}

// A handful of little fragments bursting off the runner on a wrong answer —
// "crumbles into pieces" — instead of just the shake. Pure CSS/motion, no
// image slicing; purely decorative so it can use Math.random freely (only
// ever mounts after a client interaction, never during the initial render).
function CrumblePieces() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 90,
        dy: 20 + Math.random() * 50,
        rot: (Math.random() - 0.5) * 300,
        delay: Math.random() * 0.06,
        size: 5 + Math.random() * 6,
      })),
    [],
  );
  return (
    <>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm bg-[#8a97a3]"
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, rotate: p.rot }}
          transition={{ duration: 0.65, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </>
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

type Phase = "ready" | "run" | "wall" | "rest" | "levelup" | "finished";
type Outcome = "correct" | "wrong" | null;

// Once the level's calibration walls (totalWallsForLevel — 4 at level 1) are
// cleared, the run doesn't just end: it keeps going, forever, against a
// shrinking per-wall timer instead of the untimed "listen whenever" pace —
// the calibration walls exist to get a kid comfortable with the mic before
// the clock starts. No rest-stop refill once the timer's live either; 3
// lives and you're done, same as the calibration phase's forgiving refill
// stops applying.
const INFINITE_START_TIMER_MS = 5000;
const INFINITE_MIN_TIMER_MS = 2200;
const INFINITE_TIMER_STEP_MS = 150;
// "unavailable" is the speech-to-text service being down, not the mic being
// off — the kid's mic is fine, there is just nothing on the other end to
// transcribe with. It gets its own state because the recovery is different:
// mic-off tells them to grant permission, this one silently switches the wall
// to tap-to-answer so the run keeps going.
type ListenerStatus = "idle" | "listening" | "checking" | "unavailable";

// Continuous mic listener for one wall.
//
// THIS IS SEGMENTED BY SPEECH, NOT BY A CLOCK. The previous design started a
// fresh MediaRecorder every SEND_INTERVAL_MS and uploaded every window, which
// made the call rate a function of wall-clock time rather than of anyone
// talking: ~43 transcription calls a minute per kid, whether the room was
// silent or not. Production numbers over one hour, with one person testing:
// 2241 of 3286 requests rejected by our own rate limiter, 743 more with both
// providers benched, and 171 actually transcribed. Five percent. A kid saying
// "Он" perfectly had a one-in-twenty chance of the window carrying it being
// one that got through, which is indistinguishable from "the mic is broken".
//
// So: an idle recorder is recycled every PREROLL_SEGMENT_MS and thrown away
// (cheap, local, never uploaded). The moment the level crosses the speech
// threshold that recorder is adopted mid-flight — so it already contains the
// word's onset, which a start-on-detection design would clip — and it keeps
// running until the room has been quiet for SPEECH_HANGOVER_MS or the clip
// hits MAX_UTTERANCE_MS. Then, and only then, one clip goes up.
//
// That makes the worst case bounded rather than constant: a silent room sends
// nothing at all, and a room so loud the gate never closes still sends only
// one clip per MAX_UTTERANCE_MS (~13/min, under Groq's 20/min free limit).
//
// Scans the target only, never the distractors, so overheard chatter can only
// ever produce a correct match, never an accidental wrong one. `onMatch` is
// read through a ref rather than the effect's own deps so a parent re-render
// (which recreates it every time) never interrupts an in-flight clip.
const LEVEL_SAMPLE_MS = 50;
const PREROLL_SEGMENT_MS = 600;
const SPEECH_HANGOVER_MS = 600;
const MAX_UTTERANCE_MS = 4000;
// Shorter than this is a cough, a chair, a tap on the desk — not a word.
const MIN_UTTERANCE_MS = 320;

// Speech has to clear both an absolute floor and a margin over the room's own
// noise. The absolute floor alone fails in a workshop room: twenty kids talking
// sits permanently above any fixed threshold, so the gate never closes and the
// clip cap becomes the only thing limiting uploads. The noise floor tracks the
// quiet moments (drops instantly, creeps back up) so "louder than this room" is
// what actually triggers, not "louder than a recording studio".
const ABS_SILENCE_RMS = 0.012;
const SPEECH_OVER_NOISE = 2.2;

// Consecutive failed clips before the game stops asking. Three is enough to
// ride out one bad response without leaving a kid talking to a dead service.
const MAX_CONSECUTIVE_FAILURES = 3;

// One retry for a clip the service was too busy to take. Under the old design
// a throttled window was no loss — several others overlapped it. Now a clip is
// the whole utterance, so dropping it drops the kid's answer.
const BUSY_RETRY_MS = 1500;

type Segment = {
  mr: MediaRecorder;
  chunks: Blob[];
  startedAt: number;
  /** Speech was detected inside this segment, so it is an utterance, not pre-roll. */
  capturing: boolean;
  send: boolean;
};

function useWallListener({
  stream,
  active,
  target,
  distractors,
  onMatch,
}: {
  stream: MediaStream | null;
  active: boolean;
  target: VocabItem;
  distractors: VocabItem[];
  onMatch: (transcript: string) => void;
}): { status: ListenerStatus; levelRef: React.RefObject<number> } {
  const [status, setStatus] = useState<ListenerStatus>("idle");
  const targetRef = useRef(target);
  const distractorsRef = useRef(distractors);
  const onMatchRef = useRef(onMatch);
  // Live mic loudness, 0-1ish. A ref, not state: this updates 20x a second and
  // the meter reads it on its own animation frame, so the whole game scene does
  // not re-render at 20fps to move three little bars.
  const levelRef = useRef(0);
  // Outlives the effect, which restarts on every wall. Without it a dead
  // service would be re-probed (and re-fail) three clips at a time, once per
  // wall, for the rest of the run — the kid would watch "Listening…" flicker
  // back on and mean nothing. One outage, one switch to tap-to-answer.
  const outageRef = useRef(false);

  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => { distractorsRef.current = distractors; }, [distractors]);
  useEffect(() => { onMatchRef.current = onMatch; }, [onMatch]);

  useEffect(() => {
    if (outageRef.current) {
      setStatus("unavailable");
      return;
    }
    if (!active || !stream) {
      setStatus("idle");
      levelRef.current = 0;
      return;
    }

    let live = true;
    let attempt = 0;
    let inFlight = 0;
    let consecutiveFailures = 0;
    let stoppedForOutage = false;

    const audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream as MediaStream).connect(analyser);
    const sampleBuffer = new Float32Array(analyser.fftSize);

    let noiseFloor = ABS_SILENCE_RMS;
    let lastLoudAt = 0;
    let segment: Segment | null = null;

    function openSegment() {
      if (!live) return;
      let mr: MediaRecorder;
      try {
        mr = new MediaRecorder(stream as MediaStream);
      } catch {
        return; // stream ended under us; the effect's cleanup will follow
      }
      const seg: Segment = { mr, chunks: [], startedAt: Date.now(), capturing: false, send: false };
      mr.ondataavailable = (event) => {
        if (event.data.size > 0) seg.chunks.push(event.data);
      };
      mr.onstop = () => {
        if (!live || !seg.send || seg.chunks.length === 0) return;
        void sendUtterance(new Blob(seg.chunks, { type: mr.mimeType || "audio/webm" }));
      };
      mr.start();
      segment = seg;
    }

    // Closes the open segment. `send: false` is the pre-roll case — the clip is
    // dropped locally and never costs a request.
    function closeSegment(send: boolean) {
      const seg = segment;
      if (!seg) return;
      seg.send = send;
      segment = null;
      if (seg.mr.state !== "inactive") seg.mr.stop();
    }

    function noteFailure() {
      consecutiveFailures += 1;
      if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) return;
      stoppedForOutage = true;
      outageRef.current = true;
      live = false;
      setStatus("unavailable");
    }

    async function sendUtterance(blob: Blob, isRetry = false) {
      inFlight += 1;
      setStatus("checking");
      attempt += 1;
      const attemptIndex = attempt;
      try {
        const profile = store.get();
        const form = new FormData();
        form.append("audio", blob, "utterance.webm");
        form.append("profile_id", profile.id === "server-profile" ? "" : profile.id);
        const res = await fetch("/api/say-check", { method: "POST", body: form });
        const json = (await res.json()) as { transcript?: string; code?: string };
        if (!live) return;
        if (!res.ok || typeof json.transcript !== "string") {
          const transient = json.code === "rate_limited" || json.code === "busy";
          // Transient means the service is fine, this clip just did not get
          // through — never an outage, so it must not trip the breaker. It is
          // worth one retry now that a lost clip is a lost answer.
          if (!transient) noteFailure();
          else if (!isRetry) {
            setTimeout(() => { if (live) void sendUtterance(blob, true); }, BUSY_RETRY_MS);
          }
          return;
        }
        consecutiveFailures = 0;
        const transcript = json.transcript;
        const result = scanForTarget(transcript, targetRef.current, distractorsRef.current);
        logAnswer({
          gameSlug: "say-and-shift",
          itemId: vocabItemId(targetRef.current),
          promptKind: "audio",
          response: transcript,
          isCorrect: result.found ? true : null,
          attemptIndex,
        });
        if (result.found) onMatchRef.current(transcript);
      } catch {
        if (live) noteFailure();
      } finally {
        inFlight -= 1;
        // In `finally`, because every path above returns early — the previous
        // version reset the status only on fall-through, so any clip that came
        // back busy or matched left the UI stuck on "Checking…" forever.
        if (live && !stoppedForOutage) setStatus(inFlight > 0 ? "checking" : "listening");
      }
    }

    // One timer owns every state transition: level, noise floor, and whether
    // the open segment is pre-roll, an utterance, or finished.
    const tick = setInterval(() => {
      if (!live) return;
      analyser.getFloatTimeDomainData(sampleBuffer);
      let sum = 0;
      for (const sample of sampleBuffer) sum += sample * sample;
      const rms = Math.sqrt(sum / sampleBuffer.length);
      levelRef.current = rms;

      // Falls to a new quiet instantly, recovers slowly, so one loud moment
      // does not deafen the gate for the rest of the wall.
      noiseFloor = rms < noiseFloor ? rms : Math.min(noiseFloor * 1.02 + 0.0002, 0.15);
      const speaking = rms > Math.max(ABS_SILENCE_RMS, noiseFloor * SPEECH_OVER_NOISE);

      const now = Date.now();
      if (speaking) lastLoudAt = now;

      if (!segment) {
        openSegment();
        return;
      }
      const age = now - segment.startedAt;

      if (!segment.capturing) {
        // Adopt this recorder mid-flight; it already holds the word's onset.
        if (speaking) segment.capturing = true;
        else if (age >= PREROLL_SEGMENT_MS) closeSegment(false);
        return;
      }

      if (now - lastLoudAt >= SPEECH_HANGOVER_MS || age >= MAX_UTTERANCE_MS) {
        closeSegment(age >= MIN_UTTERANCE_MS);
      }
    }, LEVEL_SAMPLE_MS);

    setStatus("listening");
    openSegment();

    return () => {
      live = false;
      clearInterval(tick);
      levelRef.current = 0;
      const seg = segment;
      segment = null;
      if (seg && seg.mr.state !== "inactive") seg.mr.stop();
      void audioCtx.close().catch(() => {});
      // Leave "unavailable" standing: it is a real outage the wall is still
      // rendering around, not the idle state of a torn-down listener.
      if (!stoppedForOutage) setStatus("idle");
    };
    // target/distractors/onMatch are read through refs above — only
    // target.slug controls whether this restarts for a new wall.
  }, [active, stream, target.slug]);

  return { status, levelRef };
}

export default function SayAndShiftPage() {
  const profile = useProfile();
  const allVocab = useVocab();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // State, not a ref: useWallListener needs this value during render, and a
  // ref read during render isn't guaranteed to reflect the latest value.
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Level, pool, and wall count are derived fresh each render from mastery in
  // profile.vocabCorrect — never stored, so this stays consistent with the
  // existing cross-device max-wins merge. Recomputing every render is cheap
  // (small arrays) and sidesteps store.ts's Profile object never changing
  // reference on mutation. Values only actually change between runs: mastery
  // updates once, in the phase === "finished" effect below, not mid-run.
  const level = currentLevel(profile, allVocab);
  const pool = poolForLevel(profile, allVocab, level);
  const totalWalls = totalWallsForLevel(level);
  // wallFor's own index math is deterministic on purpose (hydration-safe),
  // which meant wall 0 always landed on the same pool entry every single
  // playthrough — the first walls never varied. wallSeed shifts every
  // index by a per-session random offset; it starts at 0 (matches the
  // server-rendered pass) and only randomizes after mount, so there's no
  // hydration mismatch — just a same-frame reshuffle before "ready" phase
  // is ever interactive.
  const [wallSeed, setWallSeed] = useState(0);
  useEffect(() => {
    setWallSeed(Math.floor(Math.random() * 10_000));
  }, []);
  const walls = Array.from({ length: totalWalls }, (_, i) => wallFor(pool, i + wallSeed));

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
  const [drawMode, setDrawMode] = useState<"draw" | "upload" | "gallery">("draw");
  const [pendingRunner, setPendingRunner] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [galleryCharacters, setGalleryCharacters] = useState<GalleryCharacter[] | null>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "shared" | "error">("idle");
  const [themeMode, setThemeMode] = useState<"auto" | "day" | "night">("auto");
  const [seenSlugs, setSeenSlugs] = useState<string[]>([]);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  const recordedRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const infiniteMode = wallIndex >= totalWalls;
  const infiniteWallNumber = infiniteMode ? wallIndex - totalWalls + 1 : 0;
  const infiniteTimerMs = Math.max(INFINITE_MIN_TIMER_MS, INFINITE_START_TIMER_MS - infiniteWallNumber * INFINITE_TIMER_STEP_MS);
  const wall = infiniteMode ? wallFor(pool, wallIndex + wallSeed) : walls[wallIndex];
  const targetCandidate = wall.candidates.find((c) => c.item.slug === wall.target.slug) ?? wall.candidates[0];
  const distractorItems = wall.candidates.filter((c) => c.item.slug !== wall.target.slug).map((c) => c.item);
  const skyIndex = themeMode === "day" ? 2 : themeMode === "night" ? 5 : Math.min(wallIndex, SKY_PALETTES.length - 1);
  const sky = SKY_PALETTES[skyIndex];
  const customBackground = profile.gameBackgrounds["say-and-shift"] ?? null;
  const themeWord = themeWordFor(pool, walls);
  const themeLetters = [...themeWord.kk].filter((ch) => ch !== " ");
  // One new letter reveals per wall's run — always includes the current
  // wall's own letter once its "run" segment has started.
  const revealedLetterCount = Math.min(wallIndex + (phase === "ready" ? 0 : 1), themeLetters.length);
  const popularCharacters = useMemo(
    () => (galleryCharacters ?? []).filter((c) => c.likeCount > 0).sort((a, b) => b.likeCount - a.likeCount).slice(0, 5),
    [galleryCharacters],
  );
  const savedRunner = profile.artifacts.find((a) => a.id === profile.runnerArtifactId)?.dataUrl ?? null;
  const runnerImage = pendingRunner ?? savedRunner;
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
      totalWalls,
      lives,
      finished: phase === "finished",
    });
    // Fires on wall advance and on finishing, not on every phase flicker in
    // between — profile fields and lives are read at trigger time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallIndex, phase === "finished", profile.sessionCode]);

  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);

  useEffect(() => {
    if (drawMode !== "gallery" || galleryCharacters !== null) return;
    fetchGalleryCharacters(profile.id).then(setGalleryCharacters);
  }, [drawMode, galleryCharacters, profile.id]);

  async function toggleLike(characterId: string) {
    const liked = await toggleCharacterLike(characterId, profile.id);
    if (liked === null) return;
    setGalleryCharacters((current) =>
      current?.map((c) => (c.id === characterId ? { ...c, liked, likeCount: c.likeCount + (liked ? 1 : -1) } : c)) ?? current,
    );
  }

  // A new drawing/upload/gallery-pick means "Sent for review!" no longer
  // describes what's on screen — drop it back to idle so sharing this one
  // isn't blocked by a stale success state from a previous character.
  useEffect(() => {
    setShareState("idle");
  }, [pendingRunner]);

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
      vocabSeen: seenSlugs,
      vocabCorrect: correctSlugs,
    });
  }, [correctSlugs, phase, score, seenSlugs]);

  async function startRun() {
    recordedRef.current = false;
    setWallIndex(0);
    setLives(START_LIVES);
    setScore(themeLetters.length > 0 ? 2 : 0);
    setStreak(0);
    setCorrectSlugs([]);
    setSeenSlugs([]);
    setOutcome(null);
    setMessage(null);

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
    setWallIndex(next);
    if (next < themeLetters.length) setScore((v) => v + 2);
    setOutcome(null);
    setMessage(null);

    if (next === totalWalls) {
      // Calibration walls just finished — infinite mode starts on the wall
      // after this one. Show the transition, then run into it same as any
      // other wall.
      setPhase("levelup");
      advanceTimerRef.current = setTimeout(() => {
        setPhase("run");
        advanceTimerRef.current = setTimeout(() => setPhase("wall"), RUN_MS);
      }, 1800);
      return;
    }
    setPhase("run");
    advanceTimerRef.current = setTimeout(() => setPhase("wall"), RUN_MS);
  }

  // Shared tail end for both a resolved answer and a timer running out: life
  // loss, and whether that means "rest and refill" (calibration walls) or
  // "run over" (infinite mode, no refill once the clock's live).
  function afterLifeLoss(remaining: number) {
    advanceTimerRef.current = setTimeout(() => {
      if (remaining === 0) {
        setPhase(infiniteMode ? "finished" : "rest");
      } else {
        goToNextWallOrFinish();
      }
    }, 1700);
  }

  function resolveCandidate(candidate: WallCandidate) {
    if (phase !== "wall" || outcome !== null) return;
    const isTarget = candidate.item.slug === wall.target.slug;
    setSeenSlugs((s) => [...s, wall.target.slug]);

    if (isTarget) {
      setOutcome("correct");
      setScore((v) => v + 10 + streak * 2 + (infiniteMode ? infiniteWallNumber : 0));
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
      afterLifeLoss(remaining);
    }
  }

  // The infinite-mode timer ran out before the mic or a tap resolved
  // anything — same as guessing wrong, just nobody guessed.
  function resolveMiss() {
    if (phase !== "wall" || outcome !== null) return;
    setSeenSlugs((s) => [...s, wall.target.slug]);
    setOutcome("wrong");
    setStreak(0);
    playWrong();
    playClip(`/audio/vocab/${wall.target.slug}.mp3`, wall.target.kk);
    setMessage(`Time's up! ${baseText(wall.target, profile.baseLanguage)} = ${wall.target.kk}`);
    const remaining = Math.max(0, lives - 1);
    setLives(remaining);
    afterLifeLoss(remaining);
  }

  const { status: listenerStatus, levelRef: micLevelRef } = useWallListener({
    stream: micStream,
    active: listenActive,
    target: wall.target,
    distractors: distractorItems,
    onMatch: () => resolveCandidate(targetCandidate),
  });

  // Infinite mode's per-wall countdown. Only ticks while a wall is actually
  // waiting on an answer; resolveMiss handles what happens at zero.
  useEffect(() => {
    if (!infiniteMode || phase !== "wall" || outcome !== null) {
      setTimeLeftMs(null);
      return;
    }
    const startedAt = Date.now();
    setTimeLeftMs(infiniteTimerMs);
    const tick = setInterval(() => {
      const left = infiniteTimerMs - (Date.now() - startedAt);
      if (left <= 0) {
        clearInterval(tick);
        setTimeLeftMs(0);
        resolveMiss();
      } else {
        setTimeLeftMs(left);
      }
    }, 100);
    return () => clearInterval(tick);
    // infiniteTimerMs is derived from wallIndex, already a dep via infiniteMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infiniteMode, phase, outcome, wallIndex]);

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

  async function shareRunner() {
    if (!runnerImage || shareState === "sharing") return;
    setShareState("sharing");
    const ok = await shareCharacterToGallery(profile.id, profile.displayName, runnerImage);
    setShareState(ok ? "shared" : "error");
  }

  async function removeFromGallery(characterId: string) {
    setGalleryCharacters((current) => current?.filter((c) => c.id !== characterId) ?? current);
    await deleteSharedCharacter(characterId, profile.id);
  }

  const passingThrough = outcome === "correct" && phase === "wall";
  // Three different ways the mic can be no help: offline, permission denied,
  // or the speech service itself being down. All three land in the same place
  // — tap the right word — so the wall branches on one flag and only the
  // explanation above the tiles differs.
  const canAnswerByVoice = online && micPermission !== "denied" && listenerStatus !== "unavailable";

  return (
    <GameShell title="Nomad Run" kk="Айт та өт" right={<Scoreboard label="Score" value={score} />} showBackgroundControl wide>
      {phase === "finished" && <Confetti count={70} />}

      <motion.div
        // Grows into whatever height GameShell's card has left rather than
        // sitting at a fixed 560px inside a full-height card — on a desktop
        // window that pinned the whole game to a band in the middle of a lot
        // of empty white (issue #28). The min-height is now only a floor for
        // short windows, not the size it always is.
        className="relative mx-auto min-h-[480px] w-full flex-1 overflow-hidden rounded-lg border border-steppe/10 shadow-inner"
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

        {!customBackground && (
          <Waves
            className="z-0"
            lineColor={sky.night ? "rgba(255, 216, 79, 0.12)" : "rgba(255, 255, 255, 0.28)"}
            waveAmpX={22}
            waveAmpY={10}
            xGap={16}
            yGap={40}
            waveSpeedX={0.008}
            waveSpeedY={0.003}
          />
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
          <div className="rounded-lg bg-white/92 px-3 py-2 text-xs font-black text-steppe shadow-sm backdrop-blur">
            {infiniteMode ? `⚡ Infinite · wall ${infiniteWallNumber}` : `Wall ${wallIndex + 1} of ${totalWalls}`}
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

          {(phase === "run" || phase === "wall") && (
            <div key={`bush-${wallIndex}`} className="absolute bottom-14 z-10 w-14 text-[#2f8d47] sm:w-16" style={{ left: "58%" }}>
              <Bush className="w-full" />
            </div>
          )}

          <motion.div
            key={`runner-${wallIndex}`}
            className="absolute bottom-14 z-20 flex flex-col items-center"
            initial={{ left: "6%" }}
            animate={{ left: phase === "ready" ? "6%" : passingThrough ? "94%" : "48%" }}
            transition={{ duration: passingThrough ? 0.7 : phase === "run" ? RUN_MS / 1000 : 0.4, ease: "easeOut" }}
          >
            <motion.div
              // The bush sits at 58%, the runner starts this leg at 48% and
              // ends at 94% — it's over the bush about a fifth of the way
              // through, so the jump's peak is timed to land there (`times`)
              // instead of the animation's natural midpoint.
              animate={passingThrough ? { y: [0, -46, 0] } : phase === "wall" ? { y: [0, -5, 0] } : { y: 0 }}
              transition={
                passingThrough
                  ? { duration: 0.7, times: [0, 0.25, 1], ease: "easeOut" }
                  : phase === "wall"
                    ? { repeat: Infinity, duration: 0.42, ease: "easeInOut" }
                    : undefined
              }
              className={outcome === "wrong" ? "sprint-impact" : ""}
            >
              <div className="relative">
                <AnimatePresence>{outcome === "wrong" && <CrumblePieces />}</AnimatePresence>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase text-[#e35f4c]">How this run works</p>
                      <span className="rounded-full bg-[#ffd84f] px-2.5 py-0.5 text-[10px] font-black uppercase text-steppe shadow-sm">Level {level}</span>
                    </div>
                    <h2 className="text-2xl font-black text-steppe">Just say the word out loud</h2>
                    <p className="mt-1 text-sm font-bold text-steppe/60">The game is always listening, no button to hold. Say the Kazakh word out loud and your runner slips through the wall. {totalWalls} untimed walls to warm up, then it&apos;s infinite: a shrinking clock, {START_LIVES} lives, no refills.</p>
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
                      ? "You've set a custom background from the button in the corner. It's used instead of the sky below."
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
                  <p className="mt-1 text-xs font-bold text-steppe/55">Draw, upload, or pick one from the gallery. Skip it and a default runner plays instead.</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex shrink-0 flex-col items-center gap-1.5 self-center">
                      <div className="rounded-lg bg-[#f4f8fb] p-2">
                        <BandPuppet src={runnerImage} size={64} running={false} />
                      </div>
                      <button
                        type="button"
                        onClick={shareRunner}
                        disabled={!runnerImage || shareState === "sharing"}
                        title="Share this runner to the gallery for other kids to use"
                        className="flex items-center gap-1 text-[10px] font-black text-steppe/55 underline decoration-dotted disabled:opacity-40"
                      >
                        <Share2 size={11} />
                        {shareState === "shared" ? "Sent for review!" : shareState === "sharing" ? "Sharing…" : "Share to gallery"}
                      </button>
                      {shareState === "error" && <p className="text-[10px] font-bold text-[#b44736]">Could not share. Try again.</p>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-3 rounded-lg bg-[#edf2f5] p-1" aria-label="Runner art source">
                        {(["draw", "upload", "gallery"] as const).map((mode) => (
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
                        ) : drawMode === "upload" ? (
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
                        ) : galleryCharacters === null ? (
                          <p className="py-3 text-center text-xs font-bold text-steppe/50">Loading…</p>
                        ) : galleryCharacters.length === 0 ? (
                          <p className="py-3 text-center text-xs font-bold text-steppe/50">No shared characters yet. Be the first!</p>
                        ) : (
                          <>
                            {popularCharacters.length > 0 && (
                              <div className="mb-2">
                                <p className="text-[10px] font-black uppercase text-steppe/45">🔥 Popular</p>
                                <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                                  {popularCharacters.map((c) => (
                                    <GalleryTile key={c.id} character={c} selected={pendingRunner === c.url} onSelect={setPendingRunner} onToggleLike={toggleLike} onRemove={c.ownerId === profile.id ? removeFromGallery : undefined} />
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5">
                              {galleryCharacters.map((c) => (
                                <GalleryTile key={c.id} character={c} selected={pendingRunner === c.url} onSelect={setPendingRunner} onToggleLike={toggleLike} onRemove={c.ownerId === profile.id ? removeFromGallery : undefined} />
                              ))}
                            </div>
                          </>
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
                  <p className="mt-2 text-center text-xs font-bold text-steppe/50">Mic access is off. You can still play by tapping the right word.</p>
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

                {infiniteMode && timeLeftMs !== null && (
                  <div className="mx-auto mt-3 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-steppe/10">
                    <motion.div
                      className={`h-full rounded-full ${timeLeftMs < 1500 ? "bg-[#c8513e]" : "bg-[#ffd84f]"}`}
                      animate={{ width: `${Math.max(0, (timeLeftMs / infiniteTimerMs) * 100)}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  </div>
                )}

                {outcome === null && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {canAnswerByVoice ? (
                      <div className="flex items-center gap-2 rounded-full bg-[#fff0ed] px-4 py-2 text-sm font-black text-[#c8513e]">
                        <MicLevelBars levelRef={micLevelRef} />
                        <span className="inline-block h-3.5">{listenerStatus === "checking" ? "Checking…" : "Listening… say it whenever"}</span>
                      </div>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-xs font-bold text-steppe/55">
                          {!online ? <WifiOff size={14} /> : listenerStatus === "unavailable" ? <Ear size={14} /> : <MicOff size={14} />}
                          {!online
                            ? "No connection. Tap the right word to keep playing."
                            : listenerStatus === "unavailable"
                              ? "Listening is having a rest. Tap the right word to keep playing."
                              : "Mic access is off. Tap the right word to keep playing."}
                        </p>
                        {/* The tap fallback the "you can still play by tapping"
                            copy has always promised. It was never actually
                            rendered, so a kid whose mic could not be used had
                            no way past a wall except Skip. */}
                        <div className="mt-1 grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                          {wall.candidates.map((candidate) => (
                            <button
                              key={candidate.item.slug}
                              type="button"
                              onClick={() => resolveCandidate(candidate)}
                              className="rounded-lg border-2 border-steppe/10 bg-[#f4f8fb] px-3 py-2 leading-tight transition hover:border-gold hover:bg-[#fff3cf]"
                            >
                              <span className="block text-base font-black text-steppe">{candidate.item.kk}</span>
                              <span className="block text-[10px] font-bold uppercase tracking-wide text-steppe/50">{candidate.item.latin}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {outcome === "correct" && (
                  <p className="mt-4 text-sm font-black text-[#236d37]">
                    {wall.target.kk} · through the wall! +{10 + Math.max(0, streak - 1) * 2}
                  </p>
                )}
                {outcome === "wrong" && (
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-black text-[#a13c2e]">
                    <Volume2 size={16} /> {message}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-center gap-3">
                  {outcome === null && (
                    <button
                      type="button"
                      onClick={resolveMiss}
                      className="flex items-center gap-1 text-xs font-black text-steppe/55 underline decoration-dotted"
                    >
                      <SkipForward size={13} /> Skip
                    </button>
                  )}
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

          {phase === "levelup" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 grid place-items-center bg-[#133e5a]/82 p-4 backdrop-blur-[4px]"
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 15 }}
                className="text-center"
              >
                <motion.p
                  className="text-6xl"
                  animate={{ rotate: [0, -8, 8, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                >
                  ⚡
                </motion.p>
                <h2 className="mt-3 text-4xl font-black text-white">Test complete!</h2>
                <p className="mt-2 text-lg font-black text-[#ffd84f]">Now: Infinite mode</p>
                <p className="mt-1 text-sm font-bold text-white/70">Walls keep coming. Answer fast, the clock&apos;s live.</p>
              </motion.div>
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
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-[#eaf8ed] p-3"><p className="text-xl font-black text-steppe">{correctSlugs.length}</p><p className="text-[10px] font-black uppercase text-steppe/50">Words said</p></div>
                  <div className="rounded-lg bg-[#fff8df] p-3"><p className="text-xl font-black text-steppe">{wallIndex + 1}</p><p className="text-[10px] font-black uppercase text-steppe/50">Furthest wall</p></div>
                  <div className="rounded-lg bg-[#fff0ed] p-3"><p className="text-xl font-black text-steppe">{lives}</p><p className="text-[10px] font-black uppercase text-steppe/50">Lives left</p></div>
                </div>
                <Button variant="gold" size="lg" className="mt-5 w-full" onClick={startRun}><RotateCcw size={18} /> Run again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase !== "ready" && phase !== "finished" && phase !== "rest" && phase !== "levelup" && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden items-center gap-1 rounded-lg bg-white/88 px-3 py-2 text-[10px] font-black text-steppe shadow-lg backdrop-blur sm:flex">
            <Flag size={12} /> {infiniteMode ? `Infinite #${infiniteWallNumber}` : `Wall ${wallIndex + 1} / ${totalWalls}`}
          </div>
        )}
      </motion.div>
    </GameShell>
  );
}

// A real level meter, not a decoration. These bars used to run a canned
// keyframe loop forever, so they waved identically whether the mic was hearing
// a kid shout or was switched off entirely — which told the player nothing and
// actively lied about whether they were being heard. Now they follow the
// analyser's live RMS.
//
// Driven by requestAnimationFrame writing straight to style.height, not React
// state: the level updates 20x a second and re-rendering the whole parallax
// scene at that rate to move three 4px bars is not a trade worth making.
function MicLevelBars({ levelRef }: { levelRef: React.RefObject<number> }) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    // Smoothed so the bars glide instead of strobing, and so a single quiet
    // frame mid-word does not read as "it stopped hearing me".
    let shown = 0;
    const loop = () => {
      const raw = levelRef.current ?? 0;
      // Speech RMS sits well under 1; this maps the useful part of the range
      // onto the bar height rather than leaving everything at the bottom pixel.
      const target = Math.min(1, raw * 9);
      shown += (target - shown) * (target > shown ? 0.45 : 0.12);
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        // Middle bar tallest, so the shape reads as a voice meter at a glance.
        const weight = i === 1 ? 1 : 0.66;
        bar.style.height = `${3 + shown * 13 * weight}px`;
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [levelRef]);

  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          ref={(node) => { barsRef.current[bar] = node; }}
          className="w-1 rounded-full bg-[#c8513e]"
          style={{ height: 3 }}
        />
      ))}
    </span>
  );
}

function GalleryTile({
  character,
  selected,
  onSelect,
  onToggleLike,
  onRemove,
}: {
  character: GalleryCharacter;
  selected: boolean;
  onSelect: (url: string) => void;
  onToggleLike: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title={character.displayName}
        onClick={() => onSelect(character.url)}
        className={`grid aspect-square w-full place-items-center rounded-lg border-2 bg-[#f4f8fb] p-1 transition ${
          selected ? "border-gold" : "border-transparent hover:border-steppe/20"
        }`}
      >
        <BandPuppet src={character.url} size={40} running={false} />
      </button>
      <button
        type="button"
        title={character.liked ? "Unlike" : "Like"}
        aria-label={character.liked ? "Unlike this character" : "Like this character"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleLike(character.id);
        }}
        className="absolute -bottom-1 -left-1 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black text-[#c8513e] shadow"
      >
        <Heart size={9} className={character.liked ? "fill-[#c8513e]" : ""} /> {character.likeCount}
      </button>
      {onRemove && (
        <button
          type="button"
          title="Remove from gallery"
          aria-label="Remove from gallery"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(character.id);
          }}
          className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#b44736] text-white shadow"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}
