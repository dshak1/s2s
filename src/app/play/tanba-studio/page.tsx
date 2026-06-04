"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { store, useProfile } from "@/lib/store";
import { playCorrect } from "@/lib/audio";
import { Eraser, Undo2, Upload, Image as ImageIcon } from "lucide-react";

const PALETTE = [
  { hex: "#1E4D8C", name: "steppe blue" },
  { hex: "#FFD700", name: "gold" },
  { hex: "#C8102E", name: "red" },
  { hex: "#FFFFFF", name: "white" },
  { hex: "#1B1B1B", name: "black" },
  { hex: "#A0826D", name: "saddle" },
];
const SIZE = 480;

export default function TanbaStudio() {
  const profile = useProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const [color, setColor] = useState(PALETTE[1].hex);
  const [brush, setBrush] = useState(14);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const canvasFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FAF6E9";
    ctx.fillRect(0, 0, SIZE, SIZE);
    snapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ctx() {
    return canvasRef.current!.getContext("2d")!;
  }
  function snapshot() {
    history.current.push(ctx().getImageData(0, 0, SIZE, SIZE));
    if (history.current.length > 25) history.current.shift();
  }
  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SIZE,
      y: ((e.clientY - r.top) / r.height) * SIZE,
    };
  }
  function start(e: React.PointerEvent) {
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    const c = ctx();
    c.beginPath();
    c.moveTo(x, y);
    c.lineCap = "round";
    c.lineJoin = "round";
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const c = ctx();
    c.strokeStyle = color;
    c.lineWidth = brush;
    c.lineTo(x, y);
    c.stroke();
    c.beginPath();
    c.moveTo(x, y);
  }
  function end() {
    if (drawing.current) {
      drawing.current = false;
      snapshot();
    }
  }
  function undo() {
    if (history.current.length > 1) {
      history.current.pop();
      ctx().putImageData(history.current[history.current.length - 1], 0, 0);
    }
  }
  function clear() {
    const c = ctx();
    c.fillStyle = "#FAF6E9";
    c.fillRect(0, 0, SIZE, SIZE);
    snapshot();
  }
  function onCanvasUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = ctx();
      c.fillStyle = "#FAF6E9";
      c.fillRect(0, 0, SIZE, SIZE);
      const scale = Math.min(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      c.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      snapshot();
    };
    img.src = URL.createObjectURL(file);
  }
  function onAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.addArtifact("tanba", String(reader.result));
      playCorrect();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }
  function save() {
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    store.addArtifact("tanba", dataUrl);
    playCorrect();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const canvaImports = profile.artifacts.filter((a) => a.kind === "canva");

  return (
    <GameShell title="Design Your Avatar" kk="Сурет салу">
      {saved && <Confetti count={60} />}
      <p className="mb-4 text-center text-wolf">
        Draw your own avatar, or import artwork you made somewhere else. Save it and it becomes your avatar everywhere.
      </p>

      <div className="mx-auto mb-5 flex w-fit rounded-full bg-felt p-1">
        {(["draw", "upload"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={`rounded-full px-5 py-2 text-sm font-black capitalize transition ${
              tab === mode ? "bg-steppe text-warm" : "text-steppe hover:bg-white/60"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div className="mx-auto mb-8 max-w-xl rounded-2xl border-2 border-dashed border-steppe/30 bg-white p-7 text-center">
          <Upload className="mx-auto text-steppe" size={36} />
          <h2 className="mt-3 text-xl font-black text-steppe">Upload avatar art</h2>
          <p className="mt-1 text-sm font-bold text-wolf">
            PNG, JPG, or SVG works. The uploaded image is saved directly as your avatar.
          </p>
          <input ref={avatarFileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={onAvatarUpload} />
          <Button variant="gold" size="lg" className="mt-4" onClick={() => avatarFileRef.current?.click()}>
            <Upload size={18} /> Choose image
          </Button>
        </div>
      )}

      <div className={`flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center ${tab === "draw" ? "" : "hidden"}`}>
        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="aspect-square w-full max-w-[480px] touch-none rounded-3xl border-4 border-steppe bg-warm shadow-lg"
            style={{ touchAction: "none" }}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={undo}><Undo2 size={16} /> Undo</Button>
            <Button variant="outline" size="sm" onClick={clear}><Eraser size={16} /> Clear</Button>
            <Button variant="outline" size="sm" onClick={() => canvasFileRef.current?.click()}>
              <Upload size={16} /> Import
            </Button>
            <input ref={canvasFileRef} type="file" accept="image/*" hidden onChange={onCanvasUpload} />
          </div>
        </div>

        <div className="w-full max-w-xs space-y-5">
          <div>
            <div className="mb-2 text-sm font-bold text-steppe-700">Kazakh palette</div>
            <div className="flex gap-2">
              {PALETTE.map((p) => (
                <button
                  key={p.hex}
                  aria-label={p.name}
                  onClick={() => setColor(p.hex)}
                  className={`h-11 w-11 rounded-full border-2 transition ${
                    color === p.hex ? "scale-110 border-steppe ring-2 ring-gold" : "border-black/20"
                  }`}
                  style={{ background: p.hex }}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-bold text-steppe-700">Brush size</div>
            <input
              type="range"
              min={4}
              max={40}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              className="w-full accent-steppe"
            />
          </div>
          <Button variant="gold" size="lg" className="w-full" onClick={save}>
            Save as my avatar
          </Button>
          {saved && <div className="text-center font-bold text-steppe">Saved as your avatar.</div>}

          <div>
            <div className="mb-2 flex items-center gap-1 text-sm font-bold text-steppe-700">
              <ImageIcon size={15} /> My Canva imports
            </div>
            {canvaImports.length === 0 ? (
              <p className="text-xs text-wolf">
                None yet. A facilitator can upload your workshop art in /admin/content.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {canvaImports.map((a) => (
                  <motion.button
                    key={a.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      const img = new Image();
                      img.onload = () => {
                        const c = ctx();
                        c.drawImage(img, 0, 0, SIZE, SIZE);
                        snapshot();
                      };
                      img.src = a.dataUrl;
                    }}
                    className="h-16 w-16 overflow-hidden rounded-xl border-2 border-steppe/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.dataUrl} alt="canva" className="h-full w-full object-cover" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
