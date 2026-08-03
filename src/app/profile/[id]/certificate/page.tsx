"use client";

import { useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import { useProfile } from "@/lib/store";
import { BADGES } from "@/content/badges";
import { JOURNEY } from "@/content/journey";

export default function CertificatePage() {
  const profile = useProfile();
  const earnedBadges = BADGES.filter((b) => profile.badges.includes(b.id));
  const currentStop = JOURNEY[Math.min(profile.unlockedWeeks - 1, JOURNEY.length - 1)];
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `S2S Certificate, ${profile.displayName}`;
  }, [profile.displayName]);

  return (
    <div className="min-h-dvh bg-felt py-8">
      {/* print button, hidden on print */}
      <div className="mb-6 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-steppe px-5 py-2.5 font-black text-warm shadow-lg transition hover:-translate-y-0.5"
        >
          <Printer size={18} /> Print Certificate
        </button>
      </div>

      {/* certificate. A4 proportions */}
      <div
        ref={printRef}
        className="mx-auto w-[720px] max-w-[95vw] overflow-hidden rounded-3xl bg-white shadow-2xl print:shadow-none"
        style={{ fontFamily: "Nunito, sans-serif" }}
      >
        {/* top band */}
        <div className="bg-steppe px-8 py-6 text-center text-warm">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-gold">
            CC-UNESCO · UBC / SFU Kazakh Workshops
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Steppe <span className="text-gold">to</span> Screen
          </h1>
          <p className="mt-1 text-lg font-bold text-warm/80">Certificate of Achievement</p>
        </div>

        {/* body */}
        <div className="px-10 py-8 text-center">
          <p className="text-base font-semibold text-wolf">This certifies that</p>
          <p className="mt-2 text-5xl font-black text-steppe">{profile.displayName}</p>
          <p className="mt-3 text-base font-semibold text-wolf">
            has completed <strong className="text-steppe">Week {profile.unlockedWeeks}, {currentStop.name}</strong> of the Silk Road journey,
            earning <strong className="text-gold text-lg">{profile.xp.toLocaleString()} XP</strong> along the way.
          </p>

          {/* badges */}
          {earnedBadges.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-wolf">Badges Earned</p>
              <div className="flex flex-wrap justify-center gap-3">
                {earnedBadges.map((b) => (
                  <div key={b.id} className="flex flex-col items-center gap-1 rounded-2xl bg-felt px-3 py-2">
                    <span className="text-2xl">{b.symbol}</span>
                    <span className="text-xs font-black text-steppe">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ornament divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-felt" />
            <span className="text-gold text-2xl">✦</span>
            <div className="h-px flex-1 bg-felt" />
          </div>

          {/* sign-off */}
          <div className="flex items-end justify-around">
            <div className="text-center">
              <div className="h-px w-40 bg-black/20" />
              <p className="mt-1 text-xs font-bold text-wolf">Facilitator signature</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-steppe">{date}</p>
              <p className="mt-1 text-xs font-bold text-wolf">Date awarded</p>
            </div>
            <div className="text-center">
              <div className="h-px w-40 bg-black/20" />
              <p className="mt-1 text-xs font-bold text-wolf">Workshop coordinator</p>
            </div>
          </div>
        </div>

        {/* bottom accent */}
        <div className="h-3 bg-gradient-to-r from-steppe via-gold to-steppe" />
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
