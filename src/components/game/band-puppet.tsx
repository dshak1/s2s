"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

// Turns one flat PNG into a run cycle without ML: slice it into head/torso/leg
// horizontal bands, then animate each band with pure CSS. Works offline, and
// works on non-humanoid drawings (a horse, an eagle) exactly as well as a
// humanoid one, since the slicing only cares about vertical position.

type Bands = {
  head: string;
  torso: string;
  legs: string;
  width: number;
  headHeight: number;
  torsoHeight: number;
  legsHeight: number;
};

// Ignore near-transparent pixels when finding the trim box, so soft
// anti-aliased edges don't drag the bounding box out to the canvas edge.
const ALPHA_THRESHOLD = 12;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed for real URLs (a shared-gallery character's Supabase Storage
    // URL) — without it, getImageData below throws a tainted-canvas
    // SecurityError even though the bucket is public and CORS-open. A no-op
    // for data: URLs (drawn/uploaded art), so always safe to set.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load character image."));
    img.src = src;
  });
}

async function sliceBands(src: string): Promise<Bands | null> {
  const img = await loadImage(src);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return null;

  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sctx = source.getContext("2d");
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0);

  const { data } = sctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Fully transparent (or fully opaque, e.g. a drawn background-filled
  // canvas) source — trimming is a no-op, use the whole image.
  if (!found) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  function band(fromRatio: number, toRatio: number) {
    const y0 = Math.round(minY + fromRatio * trimmedHeight);
    const y1 = Math.round(minY + toRatio * trimmedHeight);
    const bandHeight = Math.max(1, y1 - y0);
    const canvas = document.createElement("canvas");
    canvas.width = trimmedWidth;
    canvas.height = bandHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(source, minX, y0, trimmedWidth, bandHeight, 0, 0, trimmedWidth, bandHeight);
    return { dataUrl: canvas.toDataURL("image/png"), height: bandHeight };
  }

  const head = band(0, 0.3);
  const torso = band(0.3, 0.62);
  const legs = band(0.62, 1);

  return {
    head: head.dataUrl,
    torso: torso.dataUrl,
    legs: legs.dataUrl,
    width: trimmedWidth,
    headHeight: head.height,
    torsoHeight: torso.height,
    legsHeight: legs.height,
  };
}

// Slicing is real work (image decode + a full pixel-alpha scan). A saved
// runner's src is the same data URL every time the kid opens the game, so
// caching by src means the default-Avatar flash only ever happens once per
// image, not on every single mount.
const bandsCache = new Map<string, Bands | null>();

export function BandPuppet({
  src,
  size = 96,
  running = true,
  className,
}: {
  /** Uploaded or drawn character PNG (data URL). Null falls back to <Avatar/>. */
  src: string | null;
  /** Target rendered height in px; width scales to preserve aspect. */
  size?: number;
  /** Whether the run-cycle animation classes are applied. */
  running?: boolean;
  className?: string;
}) {
  const [bands, setBands] = useState<Bands | null>(() => (src ? (bandsCache.get(src) ?? null) : null));

  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setBands(null);
      return;
    }
    if (bandsCache.has(src)) {
      setBands(bandsCache.get(src) ?? null);
      return;
    }
    sliceBands(src)
      .then((result) => {
        bandsCache.set(src, result);
        if (!cancelled) setBands(result);
      })
      .catch(() => {
        bandsCache.set(src, null);
        if (!cancelled) setBands(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || !bands) {
    return (
      <div className={cn("band-puppet-bob", className)} style={{ width: size, height: size }}>
        <Avatar size={size} />
      </div>
    );
  }

  const totalHeight = bands.headHeight + bands.torsoHeight + bands.legsHeight;
  const scale = size / Math.max(totalHeight, 1);
  const displayWidth = bands.width * scale;
  const headDisplayHeight = bands.headHeight * scale;
  const torsoDisplayHeight = bands.torsoHeight * scale;
  const legsDisplayHeight = bands.legsHeight * scale;

  return (
    <div className={cn("relative", className)} style={{ width: displayWidth, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bands.head}
        alt=""
        className={running ? "band-puppet-head" : undefined}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: displayWidth,
          height: headDisplayHeight,
          transformOrigin: "50% 100%",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bands.torso}
        alt=""
        className={running ? "band-puppet-torso" : undefined}
        style={{
          position: "absolute",
          top: headDisplayHeight,
          left: 0,
          width: displayWidth,
          height: torsoDisplayHeight,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bands.legs}
        alt=""
        className={running ? "band-puppet-legs" : undefined}
        style={{
          position: "absolute",
          top: headDisplayHeight + torsoDisplayHeight,
          left: 0,
          width: displayWidth,
          height: legsDisplayHeight,
          transformOrigin: "50% 0%",
        }}
      />
    </div>
  );
}
