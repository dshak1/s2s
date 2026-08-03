"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/store";
import {
  openRoundChannel,
  type RoundEndPayload,
  type RoundRevealPayload,
  type RoundStartPayload,
} from "@/lib/supabase/sync";
import { PLACES, PHOTOS, placeCloseness, type Place } from "@/content/places";
import { logAnswer } from "@/lib/telemetry";
import { placeItemId } from "@/lib/items";

type Phase = "idle" | "guess" | "waiting" | "revealed";

// The Kahoot replacement, kid side. Mounted once, globally (Providers), so a
// facilitator's launched round reaches a kid wherever they are in the app —
// not just kids who happen to have Where in Kazakhstan open.
export function LiveRoundOverlay() {
  const profile = useProfile();
  const sessionCode = profile.sessionCode;
  const svgRef = useRef<SVGSVGElement>(null);
  const roundIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof openRoundChannel> | null>(null);
  // Set on round_start, the only time it's read from; 0 until then.
  const shownAt = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [place, setPlace] = useState<Place | null>(null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [closeness, setCloseness] = useState(0);

  useEffect(() => {
    if (!sessionCode) return;

    function onStart(payload: RoundStartPayload) {
      const p = PLACES.find((candidate) => candidate.id === payload.placeId);
      if (!p) return;
      roundIdRef.current = payload.roundId;
      setPlace(p);
      setPin(null);
      setCloseness(0);
      setPhase("guess");
      shownAt.current = Date.now();
    }

    function onReveal(payload: RoundRevealPayload) {
      if (payload.roundId !== roundIdRef.current) return;
      setPhase((current) => (current === "idle" ? current : "revealed"));
    }

    function onEnd(payload: RoundEndPayload) {
      if (payload.roundId !== roundIdRef.current) return;
      roundIdRef.current = null;
      setPhase("idle");
      setPlace(null);
    }

    const channel = openRoundChannel(sessionCode, {
      round_start: onStart,
      round_reveal: onReveal,
      round_end: onEnd,
    });
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [sessionCode]);

  // A reveal a kid never manually dismisses would strand them mid-app if the
  // facilitator forgets to end the round. Six seconds is long enough to read
  // the result, short enough not to feel stuck.
  useEffect(() => {
    if (phase !== "revealed") return;
    const id = window.setTimeout(() => {
      setPhase("idle");
      setPlace(null);
      roundIdRef.current = null;
    }, 6000);
    return () => window.clearTimeout(id);
  }, [phase]);

  function dropPin(event: React.PointerEvent<SVGSVGElement>) {
    if (phase !== "guess" || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setPin({
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 600,
    });
  }

  function submit() {
    if (!pin || !place || phase !== "guess") return;
    const roundId = roundIdRef.current;
    if (!roundId) return;
    const close = placeCloseness(pin, place);
    setCloseness(close);
    logAnswer({
      gameSlug: "where-kz",
      itemId: placeItemId(place),
      promptKind: "map",
      response: `${Math.round(pin.x)},${Math.round(pin.y)}`,
      isCorrect: close >= 78,
      latencyMs: Date.now() - shownAt.current,
      attemptIndex: 1,
    });
    channelRef.current?.send("round_answer", {
      roundId,
      profileId: profile.id,
      name: profile.displayName,
      x: pin.x,
      y: pin.y,
      closeness: close,
    });
    setPhase("waiting");
  }

  if (phase === "idle" || !place) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-steppe/95 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2 py-4 text-warm">
        <MapPin className="text-gold" />
        <h1 className="text-xl font-black">Where in Kazakhstan? Live round!</h1>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
        <div className="relative min-h-[160px] overflow-hidden rounded-2xl shadow-xl">
          {PHOTOS[place.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={PHOTOS[place.id].src}
              alt="Somewhere in Kazakhstan"
              className="h-40 w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-felt text-lg font-black text-steppe-700">
              {place.name}
            </div>
          )}
          {phase === "revealed" && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-steppe-700 to-transparent p-4 pt-10 text-warm">
              <div className="text-xl font-black">
                {place.name} · <span className="text-gold">{place.kk}</span>
              </div>
            </div>
          )}
        </div>

        {phase === "guess" && (
          <p className="text-center text-sm font-bold text-warm">Tap the map to drop your pin.</p>
        )}
        {phase === "waiting" && (
          <p className="text-center text-sm font-bold text-warm">
            Answer sent! Waiting for the reveal&hellip;
          </p>
        )}
        {phase === "revealed" && (
          <p className="text-center text-lg font-black text-gold">
            You were {closeness}% close!
          </p>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 1000 600"
          className="h-[280px] w-full touch-none rounded-xl bg-[#f2f0e6]"
          onPointerDown={dropPin}
          aria-label="Map of Kazakhstan"
        >
          <image href="/img/where-in-kz.png" x="0" y="0" width="1000" height="600" preserveAspectRatio="none" />
          {pin && (
            <g transform={`translate(${pin.x},${pin.y})`}>
              <circle r="26" fill="rgba(200,16,46,.16)" />
              <path d="M0 8 C-14 -10 -10 -28 0 -28 C10 -28 14 -10 0 8 Z" fill="#c8102e" stroke="#fff" strokeWidth="3" />
              <circle cx="0" cy="-19" r="5" fill="#fff" />
            </g>
          )}
          {phase === "revealed" && (
            <g>
              {pin && <line x1={pin.x} y1={pin.y} x2={place.x} y2={place.y} stroke="#1e4d8c" strokeWidth="3" strokeDasharray="6 7" />}
              <circle cx={place.x} cy={place.y} r="12" fill="#1c7a4a" stroke="#fff" strokeWidth="4" />
            </g>
          )}
        </svg>

        {phase === "guess" && (
          <Button variant="gold" size="lg" disabled={!pin} onClick={submit}>
            Guess
          </Button>
        )}
      </div>
    </div>
  );
}
