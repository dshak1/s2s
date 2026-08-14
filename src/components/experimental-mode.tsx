"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Waves } from "@/components/reactbits/waves";
import {
  looksOkSeen,
  markLooksOk,
  useExperimental,
} from "@/lib/experimental-mode";

export { useExperimental } from "@/lib/experimental-mode";

export function ExperimentalShell() {
  const [on, setExperimental] = useExperimental();
  const pathname = usePathname();
  const [askLooksOk, setAskLooksOk] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("experimental", on);
    document.documentElement.classList.toggle("dark", on);
    return () => {
      document.documentElement.classList.remove("experimental");
      document.documentElement.classList.remove("dark");
    };
  }, [on]);

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

  if (!on) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[8] overflow-hidden">
        <div className="absolute inset-0 bg-[#05070a]/28" />
        <Waves
          lineColor="rgba(52, 211, 153, 0.38)"
          backgroundColor="transparent"
          waveAmpX={22}
          waveAmpY={12}
          xGap={16}
          yGap={32}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-cyan-400/10 to-transparent" />
      </div>

      {askLooksOk && (
        <div className="fixed bottom-4 left-1/2 z-[90] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-emerald-400/40 bg-[#071018]/95 p-4 text-emerald-50 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <p className="text-sm font-semibold tracking-tight">
            we changed this screen. does it still look okay?
          </p>
          <p className="mt-1 text-xs text-emerald-100/70">
            experimental theme plus the wave. not guaranteed first try. that is the deal.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                markLooksOk("play");
                setAskLooksOk(false);
              }}
              className="rounded-lg bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-[#05070a]"
            >
              yes
            </button>
            <button
              type="button"
              onClick={() => {
                markLooksOk("play");
                setAskLooksOk(false);
                setExperimental(false);
              }}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-emerald-50/80"
            >
              nah, turn it off
            </button>
          </div>
        </div>
      )}
    </>
  );
}
