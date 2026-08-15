"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ImagePlus, Maximize, Minimize, X } from "lucide-react";
import { MountainBackdrop, type MountainScene, sceneForPath } from "@/components/game/mountain-backdrop";
import { store, useProfile } from "@/lib/store";

export function GameShell({
  title,
  kk,
  children,
  right,
  scene,
  showBackgroundControl = false,
  wide = false,
}: {
  title: string;
  kk?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  scene?: MountainScene;
  /** Let the content run out to nearly the full window instead of stopping at
   * the reading-width column. Only for games that are a *scene* rather than a
   * page of text — Nomad Run's play field looked like a small box marooned in
   * the middle of a large monitor at the default width. Word-quiz screens keep
   * the narrow column on purpose; a line of text 2000px wide is worse, not
   * better. */
  wide?: boolean;
  /** The "set a custom background" button — only Nomad Run's Sky panel
   * actually uses this (it's the only upload entry point for that photo).
   * Every other game leaves it off; a whole-window backdrop swap didn't fit
   * a word-quiz screen and was never asked for there. */
  showBackgroundControl?: boolean;
}) {
  const pathname = usePathname();
  const activeScene = scene ?? sceneForPath(pathname);
  const slug = pathname?.split("/")[2] ?? "";
  const profile = useProfile();
  const customBg = slug ? profile.gameBackgrounds[slug] : undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      rootRef.current?.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div ref={rootRef} className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      {/* The page chrome behind the header/card never follows a custom
          background — only the game window itself does (say-and-shift reads
          the same gameBackgrounds[slug] value independently, for just its
          own play field). Two different layers reacting to one upload made
          the whole page reskin, which was never the point of that button. */}
      <MountainBackdrop scene={activeScene} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.32)_44%,rgba(255,246,206,.18))]" />

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/70 bg-white/75 px-4 py-3 text-steppe shadow-[0_10px_26px_rgba(30,77,140,.12)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link href="/play" className="flex items-center gap-2 rounded-lg border border-steppe/10 bg-white/85 px-3 py-1.5 font-bold shadow-sm hover:bg-[#fff3cf]">
            <ArrowLeft size={18} /> Games
          </Link>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            className="grid h-9 w-9 place-items-center rounded-lg border border-steppe/10 bg-white/85 shadow-sm transition hover:bg-[#fff3cf]"
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
        <div className="text-center leading-tight">
          <div className="text-lg font-extrabold sm:text-xl">{title}</div>
          {kk && <div className="text-xs text-[#e35f4c] sm:text-sm">{kk}</div>}
        </div>
        <div className="min-w-[80px] text-right">{right}</div>
      </header>

      {/* Flex column, not a plain block: a game's play field can then claim the
          leftover height with `flex-1` instead of being pinned to a fixed
          pixel min-height and leaving dead white space above and below it on a
          desktop window (issue #28). Children that don't opt in lay out
          exactly as they did before — a column flex container stretches block
          children to full width the same way. */}
      <main className={`relative z-10 mx-auto w-full px-4 py-6 ${wide ? "max-w-[110rem]" : "max-w-5xl"}`}>
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col rounded-lg border border-white/80 bg-white/[.88] p-4 text-foreground shadow-[0_20px_60px_rgba(69,128,59,.16)] backdrop-blur-sm sm:p-5">
          {children}
        </div>
      </main>

      {showBackgroundControl && slug && <BackgroundControl slug={slug} hasBackground={Boolean(customBg)} />}
    </div>
  );
}

function BackgroundControl({ slug, hasBackground }: { slug: string; hasBackground: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => store.setGameBackground(slug, String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        hidden
        onChange={onUpload}
      />
      {hasBackground && (
        <button
          type="button"
          onClick={() => store.clearGameBackground(slug)}
          aria-label="Remove custom background"
          className="grid h-10 w-10 place-items-center rounded-full border border-steppe/10 bg-white/90 text-steppe shadow-lg backdrop-blur transition hover:bg-[#fff3cf]"
        >
          <X size={18} />
        </button>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 rounded-full border border-steppe/10 bg-white/90 px-4 py-2.5 text-sm font-black text-steppe shadow-lg backdrop-blur transition hover:bg-[#fff3cf]"
      >
        <ImagePlus size={18} className="text-[#ff8f4f]" />
        {hasBackground ? "Change background" : "Set background"}
      </button>
    </div>
  );
}

export function Scoreboard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-steppe/10 bg-white/85 px-3 py-1.5 text-sm font-extrabold text-steppe shadow-sm backdrop-blur">
      <span className="text-[#ff8f4f]">{label} </span>
      {value}
    </div>
  );
}
