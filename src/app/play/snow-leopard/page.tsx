"use client";

import Link from "next/link";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { CLUES } from "@/content/phrases";
import { useProfile } from "@/lib/store";
import { Footprints, QrCode } from "lucide-react";

export default function SnowLeopardLanding() {
  const p = useProfile();
  const got = new Set(p.pawPrints);

  return (
    <GameShell title="Snow Leopard Patrol" kk="Қар барысы" right={<Scoreboard label="Paws" value={`${got.size}/8`} />}>
      <p className="mb-4 text-center text-wolf">
        Scan the QR codes hidden around the room to follow the qar barysy&apos;s tracks.
        Each correct answer earns a paw print. Find all 8 in one session for the Snow Tracker badge!
      </p>

      <div className="mb-6 flex justify-center gap-3">
        <span className="flex items-center gap-2 rounded-full bg-felt px-4 py-2 font-black text-steppe">
          <Footprints className="text-terra" /> {got.size} paw prints
        </span>
      </div>

      <div className="rounded-3xl bg-felt p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-steppe-700">
          <QrCode size={16} /> Clue stops (in the room these are QR codes, tap to simulate a scan)
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CLUES.map((c, i) => (
            <Link
              key={c.id}
              href={`/play/snow-leopard/clue/${c.id}`}
              className={`rounded-2xl border-2 p-4 text-center font-bold ${
                got.has(c.id) ? "border-gold bg-gold/20 text-steppe" : "border-steppe/20 bg-white text-steppe"
              }`}
            >
              <Footprints className={`mx-auto mb-1 ${got.has(c.id) ? "text-terra" : "text-wolf/40"}`} />
              Stop {i + 1}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-wolf">
        Facilitators: print the real QR codes from the{" "}
        <Link href="/facilitator" className="font-bold text-steppe underline">facilitator console</Link>.
      </p>
    </GameShell>
  );
}
