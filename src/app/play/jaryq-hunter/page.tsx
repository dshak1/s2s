"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { VOCAB, imgFor } from "@/content/vocab";
import { sample } from "@/lib/utils";
import { playCorrect, playWrong, playWin, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";
import { Camera, MousePointer2 } from "lucide-react";

const W = 720;
const H = 460;
const LIGHT = 78;
const COLLECT = 46;

type Token = { id: string; x: number; y: number; ch: string };
type Wolf = { id: string; x: number; y: number; vx: number; vy: number };

// pick a short target word with <=6 letters
function pickTarget() {
  const candidates = VOCAB.filter((v) => v.kk.replace(/\s/g, "").length >= 3 && v.kk.length <= 6);
  return sample(candidates, 1)[0];
}

function layout(word: string): Token[] {
  const chars = word.toUpperCase().replace(/\s/g, "").split("");
  return chars.map((ch, i) => ({
    id: `${i}-${ch}`,
    ch,
    x: 70 + Math.random() * (W - 140),
    y: 60 + Math.random() * (H - 120),
  }));
}

export default function JaryqHunter() {
  const [mode, setMode] = useState<"touch" | "webcam">("touch");
  const target = useRef(pickTarget());
  const [tokens, setTokens] = useState<Token[]>(() => layout(target.current.kk));
  const [collected, setCollected] = useState(0);
  const [pos, setPos] = useState({ x: W / 2, y: H / 2 });
  const posRef = useRef({ x: W / 2, y: H / 2 });
  const [status, setStatus] = useState<"play" | "won" | "caught">("play");
  const [wolves, setWolves] = useState<Wolf[]>([]);
  const wolvesRef = useRef<Wolf[]>([]);
  const collectedRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  // webcam refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null);
  const [camState, setCamState] = useState<"idle" | "calibrating" | "tracking" | "error">("idle");
  const streamRef = useRef<MediaStream | null>(null);

  const reset = useCallback(() => {
    target.current = pickTarget();
    setTokens(layout(target.current.kk));
    setCollected(0);
    collectedRef.current = 0;
    setStatus("play");
    const ws: Wolf[] = Array.from({ length: 2 }, (_, i) => ({
      id: `w${i}`,
      x: 120 + i * 320,
      y: 120 + i * 160,
      vx: (Math.random() > 0.5 ? 1 : -1) * (1.4 + Math.random()),
      vy: (Math.random() > 0.5 ? 1 : -1) * (1.4 + Math.random()),
    }));
    wolvesRef.current = ws;
    setWolves(ws);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  const setLight = useCallback((x: number, y: number) => {
    const cx = Math.max(0, Math.min(W, x));
    const cy = Math.max(0, Math.min(H, y));
    posRef.current = { x: cx, y: cy };
    setPos({ x: cx, y: cy });

    // collect next needed letter in order
    const needIdx = collectedRef.current;
    setTokens((prev) => {
      const tok = prev[needIdx];
      if (tok && Math.hypot(tok.x - cx, tok.y - cy) < COLLECT) {
        collectedRef.current += 1;
        setCollected(collectedRef.current);
        speakWord(target.current.kk);
        if (collectedRef.current >= prev.length) {
          playWin();
          setStatus("won");
          store.recordGameRun({
            game: "jaryq-hunter",
            score: 40,
            vocabSeen: [target.current.slug],
            vocabCorrect: [target.current.slug],
          });
        } else {
          playCorrect();
        }
      }
      return prev;
    });
  }, []);

  // pointer control (touch + mouse)
  function onPointer(e: React.PointerEvent) {
    if (mode !== "touch" || status !== "play") return;
    const r = fieldRef.current!.getBoundingClientRect();
    setLight(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  }

  // keyboard fallback
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== "play" || mode !== "touch") return;
      const step = 26;
      const { x, y } = posRef.current;
      if (e.key === "ArrowLeft") setLight(x - step, y);
      else if (e.key === "ArrowRight") setLight(x + step, y);
      else if (e.key === "ArrowUp") setLight(x, y - step);
      else if (e.key === "ArrowDown") setLight(x, y + step);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, mode, setLight]);

  // wolf patrol + collision loop
  useEffect(() => {
    function tick() {
      if (status === "play") {
        const ws = wolvesRef.current.map((w) => {
          let { x, y, vx, vy } = w;
          x += vx; y += vy;
          if (x < 40 || x > W - 40) vx = -vx;
          if (y < 40 || y > H - 40) vy = -vy;
          return { ...w, x: Math.max(40, Math.min(W - 40, x)), y: Math.max(40, Math.min(H - 40, y)), vx, vy };
        });
        wolvesRef.current = ws;
        setWolves(ws);
        const { x, y } = posRef.current;
        if (ws.some((w) => Math.hypot(w.x - x, w.y - y) < LIGHT * 0.5)) {
          playWrong();
          setStatus("caught");
        }
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [status]);

  // ---- webcam flashlight (v2) ----
  async function startWebcam() {
    setMode("webcam");
    setCamState("calibrating");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      sampleCanvas.current = document.createElement("canvas");
      sampleCanvas.current.width = 64;
      sampleCanvas.current.height = 48;
    } catch {
      setCamState("error");
      setTimeout(() => { setMode("touch"); setCamState("idle"); }, 1800);
    }
  }
  function stopWebcam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("touch");
    setCamState("idle");
  }
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // brightest-blob detection loop while tracking
  useEffect(() => {
    if (mode !== "webcam" || camState !== "tracking") return;
    let id = 0;
    function frame() {
      const v = videoRef.current;
      const c = sampleCanvas.current;
      if (v && c && v.videoWidth) {
        const ctx = c.getContext("2d")!;
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let best = -1, bx = c.width / 2, by = c.height / 2;
        for (let py = 0; py < c.height; py++) {
          for (let px = 0; px < c.width; px++) {
            const i = (py * c.width + px) * 4;
            const lum = data[i] + data[i + 1] + data[i + 2];
            if (lum > best) { best = lum; bx = px; by = py; }
          }
        }
        if (best > 560) {
          // mirror X so it feels natural; map to field
          setLight((1 - bx / c.width) * W, (by / c.height) * H);
        }
      }
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [mode, camState, setLight]);

  // press space to finish calibration
  useEffect(() => {
    function onSpace(e: KeyboardEvent) {
      if (e.code === "Space" && camState === "calibrating") {
        e.preventDefault();
        setCamState("tracking");
      }
    }
    window.addEventListener("keydown", onSpace);
    return () => window.removeEventListener("keydown", onSpace);
  }, [camState]);

  const word = target.current.kk.toUpperCase();

  return (
    <GameShell title="Jaryq Hunter" kk="Жарық аңшысы" right={<Scoreboard label="Found" value={`${collected}/${tokens.length}`} />}>
      {status === "won" && <Confetti />}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => { stopWebcam(); setMode("touch"); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${mode === "touch" ? "bg-steppe text-warm" : "bg-felt text-steppe"}`}
          >
            <MousePointer2 size={15} /> Touch / Mouse
          </button>
          <button
            onClick={startWebcam}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${mode === "webcam" ? "bg-steppe text-warm" : "bg-felt text-steppe"}`}
          >
            <Camera size={15} /> Webcam Flashlight
          </button>
        </div>
        <div className="text-lg font-black tracking-widest text-steppe">
          {word.split("").map((c, i) => (
            <span key={i} className={i < collected ? "text-gold" : "text-steppe/30"}>{c}</span>
          ))}
        </div>
      </div>

      <p className="mb-2 text-center text-sm text-wolf">
        Find the letters of <span className="font-black text-steppe">{target.current.kk}</span> ({target.current.en}) — and don&apos;t shine on the wolves (қасқыр)!
      </p>

      <div
        ref={fieldRef}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        className="relative mx-auto select-none overflow-hidden rounded-3xl bg-[#0c1322]"
        style={{ aspectRatio: `${W} / ${H}`, maxWidth: W, touchAction: "none" }}
      >
        <div className="absolute inset-0" style={{ width: "100%", height: "100%" }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
            {/* letter tokens */}
            {tokens.map((t, i) => (
              <g key={t.id} opacity={i < collected ? 0.25 : 1}>
                <circle cx={t.x} cy={t.y} r={24} fill="#1E4D8C" stroke="#FFD700" strokeWidth={3} />
                <text x={t.x} y={t.y + 8} textAnchor="middle" fontSize={24} fontWeight={900} fill="#FFD700">{t.ch}</text>
              </g>
            ))}
            {/* a couple of vocab picture rewards for flavor */}
            <image href={imgFor(target.current)} x={W - 90} y={H - 90} width={64} height={64} opacity={status === "won" ? 1 : 0.9} />
            {/* wolves */}
            {wolves.map((w) => (
              <g key={w.id}>
                <circle cx={w.x} cy={w.y} r={26} fill="#5B6770" stroke="#1B1B1B" strokeWidth={3} />
                <text x={w.x} y={w.y + 7} textAnchor="middle" fontSize={20} fontWeight={900} fill="#FAF6E9">Қ</text>
              </g>
            ))}
          </svg>
        </div>

        {/* darkness overlay with spotlight hole */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle ${LIGHT}px at ${(pos.x / W) * 100}% ${(pos.y / H) * 100}%, transparent 0%, transparent 55%, rgba(5,8,16,0.97) 78%)`,
          }}
        />

        {/* webcam overlays */}
        {mode === "webcam" && (
          <div className="absolute right-2 top-2 z-10 w-28 overflow-hidden rounded-xl border-2 border-gold">
            <video ref={videoRef} muted playsInline className="h-20 w-full scale-x-[-1] object-cover" />
          </div>
        )}
        {mode === "webcam" && camState !== "tracking" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 text-center text-warm">
            {camState === "calibrating" && (
              <>
                <Camera className="text-gold" />
                <p className="max-w-xs font-bold">Aim a flashlight (or bright phone) at the center, then press <span className="text-gold">Space</span>.</p>
                <Button variant="gold" onClick={() => setCamState("tracking")}>Start tracking</Button>
              </>
            )}
            {camState === "error" && <p className="font-bold text-gold">Calibrating webcam… no camera found, falling back to touch.</p>}
          </div>
        )}

        {/* end states */}
        <AnimatePresence>
          {status !== "play" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-steppe/85 text-center text-warm"
            >
              <p className="text-3xl font-black text-gold">{status === "won" ? "You found the word!" : "A wolf caught you!"}</p>
              {status === "won" && <p className="text-xl font-bold">{target.current.kk} — {target.current.en}</p>}
              <Button variant="gold" size="lg" onClick={reset}>Play again</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center text-xs text-wolf">Tip: drag with your finger, move the mouse, or use arrow keys to move the light.</p>
    </GameShell>
  );
}
