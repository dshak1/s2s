"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import {
  looksOkSeen,
  markLooksOk,
  useExperimental,
} from "@/lib/experimental-mode";

export { useExperimental } from "@/lib/experimental-mode";

// Experimental mode used to reskin the entire app: a dark zinc/emerald palette
// forced onto every screen with !important, plus a full-viewport animated wave
// grid sitting over all the content, permanently, for as long as the mode was
// on. It buried the game under a hacker-console overlay and made every screen
// harder to read, which is the opposite of what a "try the new thing" mode
// should do to a kid's game.
//
// It is now a *moment*, not a theme. Turning it on sends one wave up the screen
// and back down, the way a tide washes over sand and pulls out again, and then
// the app looks exactly like it always does. The only lasting sign is a small
// badge in the corner. Nothing is covered, nothing is recoloured, nothing has
// to be read through a grid.

// One wave up the screen and back out, in seconds.
const WASH_IN = 0.85;
const WASH_HOLD = 0.35;
const WASH_OUT = 1.1;

export function ExperimentalShell() {
  const [on, setExperimental] = useExperimental();
  const pathname = usePathname();
  const [askLooksOk, setAskLooksOk] = useState(false);
  // Bumped each time the mode is switched on, so the wave remounts and replays
  // rather than being a one-per-page-load thing. It clears itself when the
  // animation finishes — leaving even a transparent fixed overlay parked over
  // the page for the rest of the session is how the old version started.
  const [washId, setWashId] = useState(0);
  const wasOn = useRef(false);

  useEffect(() => {
    if (on && !wasOn.current) setWashId((n) => n + 1);
    wasOn.current = on;
  }, [on]);

  useEffect(() => {
    if (washId === 0) return;
    const done = setTimeout(() => setWashId(0), (WASH_IN + WASH_HOLD + WASH_OUT) * 1000 + 350);
    return () => clearTimeout(done);
  }, [washId]);

  useEffect(() => {
    if (!on) {
      setAskLooksOk(false);
      return;
    }
    const screen = pathname === "/play" || pathname === "/" ? "play" : "";
    if (!screen) {
      setAskLooksOk(false);
      return;
    }
    setAskLooksOk(!looksOkSeen(screen));
  }, [on, pathname]);

  return (
    <>
      {/* Plain conditional, not AnimatePresence: there is no exit animation to
          wait for (the water has already slid off-screen by the time the timer
          clears this), and AnimatePresence was leaving the empty container
          mounted afterwards. */}
      {washId > 0 && on && <TideWash key={washId} />}

      {on && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex items-center gap-1.5 rounded-full border border-steppe/10 bg-white/90 px-3 py-1.5 text-[11px] font-black text-steppe shadow-lg backdrop-blur">
          <FlaskConical size={13} className="text-[#2f8d47]" />
          Experimental
        </div>
      )}

      {on && askLooksOk && (
        <div className="fixed bottom-4 left-1/2 z-[90] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border-2 border-steppe/10 bg-white p-4 text-steppe shadow-2xl">
          <p className="text-sm font-black">We changed this screen. Does it still look okay?</p>
          <p className="mt-1 text-xs font-bold text-steppe/60">
            Experimental things are not guaranteed to work first try. That is the deal.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                markLooksOk("play");
                setAskLooksOk(false);
              }}
              className="rounded-lg bg-gold px-3 py-1.5 text-sm font-black text-steppe-700 shadow-[2px_3px_0_0_#b8960a]"
            >
              Looks fine
            </button>
            <button
              type="button"
              onClick={() => {
                markLooksOk("play");
                setAskLooksOk(false);
                setExperimental(false);
              }}
              className="rounded-lg border-2 border-steppe/15 px-3 py-1.5 text-sm font-black text-steppe/70"
            >
              Turn it off
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// The wave itself. Water rises with a wavy leading edge, pauses at the top of
// its reach, then recedes and leaves a "wet sand" sheen that fades. Driven by
// CSS keyframes (see globals.css) rather than framer-motion: it is a fire-once
// decoration, and CSS runs it to completion without caring what React does
// mid-flight.
function TideWash() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {/* Two sheets at slightly different reaches and speeds, so the edge reads
          as water rather than a rectangle sliding up. */}
      <WaterLayer height="38%" opacity={0.34} colour="#63b6e8" delay="0s" />
      <WaterLayer height="52%" opacity={0.26} colour="#9fd6f2" delay="0.12s" />

      {/* Wet-sand sheen left behind as the water pulls out. */}
      <div
        className="s2s-tide-sheen absolute inset-x-0 bottom-0"
        style={{ height: "62%", background: "linear-gradient(to top, rgba(120,90,60,.16), transparent)" }}
      />
    </div>
  );
}

function WaterLayer({
  height,
  opacity,
  colour,
  delay,
}: {
  /** How far up the screen this sheet of water reaches. */
  height: string;
  opacity: number;
  colour: string;
  delay: string;
}) {
  return (
    <div className="s2s-tide-layer absolute inset-x-0 bottom-0" style={{ height, opacity, animationDelay: delay }}>
      {/* Wavy leading edge, drawn as an SVG so the crest is a real curve. */}
      <svg
        className="absolute inset-x-0 -top-4 h-5 w-full"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 40 L0 22 C 150 4, 300 40, 450 22 C 600 4, 750 40, 900 22 C 1050 4, 1150 30, 1200 20 L1200 40 Z"
          fill={colour}
        />
        <path
          d="M0 22 C 150 4, 300 40, 450 22 C 600 4, 750 40, 900 22 C 1050 4, 1150 30, 1200 20"
          fill="none"
          stroke="rgba(255,255,255,.8)"
          strokeWidth="4"
        />
      </svg>
      <div className="absolute inset-0" style={{ background: colour }} />
    </div>
  );
}
