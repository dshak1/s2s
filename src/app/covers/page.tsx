"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { KID_COVERS } from "@/content/kid-covers";
import { playCorrect } from "@/lib/audio";
import { store, useProfile } from "@/lib/store";
import { toastBus } from "@/lib/toast";

// Start screens the workshop kids designed in Canva, made real: their drawn
// button is the actual clickable hotspot that launches the games.
export default function KidCoversPage() {
  const router = useRouter();
  const { homeCoverId } = useProfile();
  // Start deterministic for SSR, then shuffle to a random kid's cover on mount.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(Math.floor(Math.random() * KID_COVERS.length));
  }, []);
  const cover = KID_COVERS[index];

  function launch() {
    playCorrect();
    router.push("/play");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#10233f] text-warm">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-black">
          <Sparkles size={18} className="text-gold" />
          Designed by our players
        </div>
        <Link href="/play" className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-black transition hover:bg-white/20">
          Skip →
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-6">
        <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl">
          <img src={cover.image} alt={cover.alt} className="block w-full" />

          {cover.hotspot ? (
            <motion.button
              aria-label="Start playing"
              onClick={launch}
              className="absolute rounded-3xl border-4 border-gold/0 transition hover:border-gold/80 focus-visible:border-gold"
              style={{
                left: `${cover.hotspot.left}%`,
                top: `${cover.hotspot.top}%`,
                width: `${cover.hotspot.width}%`,
                height: `${cover.hotspot.height}%`,
              }}
              animate={{ boxShadow: ["0 0 0 0 rgba(255,207,74,.0)", "0 0 0 10px rgba(255,207,74,.28)", "0 0 0 0 rgba(255,207,74,.0)"] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          ) : (
            <button aria-label="Start playing" onClick={launch} className="absolute inset-0" />
          )}
        </div>

        <div className="text-center">
          <div className="text-lg font-black">
            {cover.artist ? `Cover by ${cover.artist}` : "Cover by a workshop designer"}
          </div>
          <p className="text-sm font-bold text-warm/60">
            {cover.hotspot ? "Tap their button to play!" : "Tap anywhere on the cover to play!"}
          </p>
          <button
            onClick={() => {
              store.setHomeCover(cover.id);
              toastBus.show({
                title: "Home background set!",
                body: cover.artist ? `Cover by ${cover.artist} is now your home page.` : "This cover is now your home page.",
                icon: "🎨",
              });
            }}
            className={`mt-2 rounded-full px-4 py-1.5 text-sm font-black transition active:scale-95 ${
              homeCoverId === cover.id ? "bg-gold text-steppe-700" : "bg-white/10 text-warm hover:bg-white/20"
            }`}
          >
            {homeCoverId === cover.id ? "✓ Your home background" : "Make this my home background"}
          </button>
        </div>

        {/* cover picker */}
        <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto px-2 pb-1">
          {KID_COVERS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setIndex(i)}
              aria-label={c.artist ? `Cover by ${c.artist}` : "Workshop cover"}
              className={`h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={c.image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
