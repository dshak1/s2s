"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Trash2 } from "lucide-react";

const DRAW_COLORS = ["#1e4d8c", "#ffd84f", "#e35f4c", "#2f8d47", "#ffffff", "#1b1b1b"];

export function DrawingBoard({
  canvasRef,
  onChange,
  transparent = false,
  aspect = "video",
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onChange: (dataUrl: string) => void;
  /** Skip the opaque fill so strokes sit on a transparent canvas — for
   * characters (band-puppet trims to the transparent border), not backgrounds. */
  transparent?: boolean;
  /** "portrait" suits a standing character better than the 16:9 default. */
  aspect?: "video" | "portrait";
}) {
  const drawing = useRef(false);
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [brush, setBrush] = useState(18);
  const [mode, setMode] = useState<"draw" | "erase">("draw");
  const dims = aspect === "portrait"
    ? { width: 720, height: 960, className: "aspect-[3/4]" }
    : { width: 1280, height: 720, className: "aspect-video" };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (!transparent) {
      context.fillStyle = "#f8fbff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef, transparent]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const current = point(event);
    if (mode === "erase") {
      // Transparent canvases punch a real hole; opaque ones just paint back
      // over with the base fill — either way, erasing only touches the
      // stroke, not the whole drawing (that's what "Clear all" is for).
      context.globalCompositeOperation = transparent ? "destination-out" : "source-over";
      context.strokeStyle = transparent ? "rgba(0,0,0,1)" : "#f8fbff";
      context.lineWidth = brush * 1.6;
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = color;
      context.lineWidth = brush;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineTo(current.x, current.y);
    context.stroke();
  }

  function stop() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL(transparent ? "image/png" : "image/webp", 0.86));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (transparent) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      context.fillStyle = "#f8fbff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    onChange(canvas.toDataURL(transparent ? "image/png" : "image/webp", 0.86));
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        className={`${dims.className} w-full touch-none rounded-lg border-2 border-steppe/15 ${transparent ? "bg-[#eef2f5]" : "bg-white"} shadow-inner`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DRAW_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            title={`Use ${swatch}`}
            aria-label={`Use ${swatch}`}
            aria-pressed={mode === "draw" && color === swatch}
            onClick={() => {
              setColor(swatch);
              setMode("draw");
            }}
            className={`h-9 w-9 rounded-full border-2 ${mode === "draw" && color === swatch ? "border-steppe ring-2 ring-[#ffd84f]" : "border-black/15"}`}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <button
          type="button"
          title="Eraser"
          aria-label="Eraser"
          aria-pressed={mode === "erase"}
          onClick={() => setMode((m) => (m === "erase" ? "draw" : "erase"))}
          className={`grid h-9 w-9 place-items-center rounded-lg border-2 ${mode === "erase" ? "border-steppe bg-steppe text-white" : "border-steppe/15 bg-white text-steppe"}`}
        >
          <Eraser size={17} />
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs font-black text-steppe">
          {mode === "erase" ? <Eraser size={16} /> : <PenLine size={16} />}
          <input
            type="range"
            min={6}
            max={42}
            value={brush}
            onChange={(event) => setBrush(Number(event.target.value))}
            className="w-24 accent-steppe"
          />
        </label>
        <button
          type="button"
          title="Clear all"
          aria-label="Clear the whole drawing"
          onClick={clear}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-steppe/15 bg-white px-3 text-sm font-black text-[#b44736]"
        >
          <Trash2 size={17} /> Clear all
        </button>
      </div>
    </div>
  );
}
