"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QR } from "@/components/qr";
import { CLUES } from "@/content/phrases";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintQR() {
  const { code } = useParams<{ code: string }>();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="min-h-dvh bg-white font-admin text-[#1b1b1b]">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 1cm; } }`}</style>

      <div className="no-print sticky top-0 flex items-center justify-between bg-steppe px-6 py-4 text-warm">
        <div>
          <div className="font-black">Snow Leopard Patrol, printable clues</div>
          <div className="text-sm text-warm/70">Session {code} · print, cut, and hide these around the room.</div>
        </div>
        <Button variant="gold" onClick={() => window.print()}><Printer size={18} /> Print</Button>
      </div>

      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 rounded-2xl border-2 border-dashed border-steppe p-4 text-center">
          <div className="font-black text-steppe">Wall map (print once, reuse every week)</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/wall-map.svg" alt="wall map" className="mx-auto mt-2 w-full max-w-xl" />
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {CLUES.map((c, i) => (
            <div key={c.id} className="flex flex-col items-center break-inside-avoid rounded-2xl border-2 border-steppe p-4 text-center">
              <div className="text-lg font-black text-steppe">Stop {i + 1}</div>
              {origin && <QR value={`${origin}/play/snow-leopard/clue/${c.id}`} size={160} />}
              <div className="mt-2 text-sm font-bold text-wolf">Scan to find the trail</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
