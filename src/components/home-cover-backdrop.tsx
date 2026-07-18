"use client";

import { MountainBackdrop } from "@/components/game/mountain-backdrop";
import { KID_COVERS } from "@/content/kid-covers";
import { useProfile } from "@/lib/store";

// Home-page background: the default mountain scene, or — if the player picked
// one of the kid-designed covers on their profile — that cover, softened so the
// hero text stays readable. SSR always renders the default (profile is
// per-browser), so the swap happens after hydration without a mismatch.
export function HomeCoverBackdrop() {
  const profile = useProfile();
  const cover = KID_COVERS.find((c) => c.id === profile.homeCoverId) ?? null;

  if (!cover) {
    return (
      <>
        <MountainBackdrop scene="home" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.28)_48%,rgba(255,246,206,.12))]" />
      </>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover.image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.62)_48%,rgba(255,246,206,.5))]" />
      <div className="absolute bottom-3 right-4 z-10 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-steppe shadow-sm">
        {cover.artist ? `Background by ${cover.artist}` : "Background by a workshop designer"}
      </div>
    </>
  );
}
