"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { MountainBackdrop, type MountainScene, sceneForPath } from "@/components/game/mountain-backdrop";
import { store, useProfile } from "@/lib/store";

export function GameShell({
  title,
  kk,
  children,
  right,
  scene,
}: {
  title: string;
  kk?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  scene?: MountainScene;
}) {
  const pathname = usePathname();
  const activeScene = scene ?? sceneForPath(pathname);
  const slug = pathname?.split("/")[2] ?? "";
  const profile = useProfile();
  const customBg = slug ? profile.gameBackgrounds[slug] : undefined;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      {customBg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={customBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.66)_44%,rgba(255,255,255,.78))]" />
        </>
      ) : (
        <>
          <MountainBackdrop scene={activeScene} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.32)_44%,rgba(255,246,206,.18))]" />
        </>
      )}

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/70 bg-white/75 px-4 py-3 text-steppe shadow-[0_10px_26px_rgba(30,77,140,.12)] backdrop-blur-md">
        <Link href="/play" className="flex items-center gap-2 rounded-lg border border-steppe/10 bg-white/85 px-3 py-1.5 font-bold shadow-sm hover:bg-[#fff3cf]">
          <ArrowLeft size={18} /> Games
        </Link>
        <div className="text-center leading-tight">
          <div className="text-lg font-extrabold sm:text-xl">{title}</div>
          {kk && <div className="text-xs text-[#e35f4c] sm:text-sm">{kk}</div>}
        </div>
        <div className="min-w-[80px] text-right">{right}</div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-6">
        <div className="min-h-[calc(100dvh-8rem)] rounded-lg border border-white/80 bg-white/[.88] p-4 text-foreground shadow-[0_20px_60px_rgba(69,128,59,.16)] backdrop-blur-sm sm:p-5">
          {children}
        </div>
      </main>

      {slug && <BackgroundControl slug={slug} hasBackground={Boolean(customBg)} />}
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
