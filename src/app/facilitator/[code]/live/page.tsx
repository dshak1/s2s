"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QR } from "@/components/qr";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/content/games";
import { REGIONS } from "@/content/regions";
import { useSession, sessions } from "@/lib/sessions";
import { VolumeX, Pause, Map, Power, Printer } from "lucide-react";

export default function LiveProjector() {
  const { code } = useParams<{ code: string }>();
  const state = useSession(code);
  const [origin, setOrigin] = useState("");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [regionIdx, setRegionIdx] = useState(0);

  useEffect(() => {
    setOrigin(window.location.origin);
    sessions.create(code);
  }, [code]);

  const totalPaws = state.members.reduce((n, m) => n + m.paws.length, 0);

  return (
    <div className="min-h-dvh bg-steppe font-admin text-warm">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-5">
        <div>
          <div className="text-sm font-bold text-gold">Session code — kids join at {origin || "…"}/join</div>
          <div className="text-7xl font-black tracking-[0.3em]">{code}</div>
        </div>
        <div className="rounded-2xl bg-warm p-2">
          {origin && <QR value={`${origin}/join?code=${code}`} size={150} />}
        </div>
      </div>

      <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
        {/* joined kids */}
        <div>
          <h2 className="mb-3 text-xl font-black text-gold">
            Kids joined ({state.members.length}) {paused && <span className="text-terra">• paused</span>}
          </h2>
          {state.members.length === 0 ? (
            <p className="text-warm/60">Waiting for kids to scan the code…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              <AnimatePresence>
                {state.members.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center rounded-2xl bg-white/10 p-3 text-center"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-full bg-gold ring-2 ring-gold">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-steppe-700 text-xl font-black text-warm">
                          {m.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm font-bold">{m.name}</div>
                    <div className="text-xs text-warm/60">Table {m.table} · {m.paws.length} paws</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <p className="mt-3 text-sm text-warm/60">Total paw prints this session: {totalPaws}</p>
        </div>

        {/* launch games */}
        <div>
          <h2 className="mb-3 text-xl font-black text-gold">Launch a game</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GAMES.map((g) => (
              <Link
                key={g.slug}
                href={g.href}
                target="_blank"
                onClick={() => sessions.launchGame(code, g.slug)}
                className={`rounded-2xl p-3 text-center font-black transition hover:-translate-y-0.5 ${
                  state.currentGame === g.slug ? "bg-gold text-steppe-700" : "bg-white/10"
                }`}
              >
                {g.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-steppe-700 px-8 py-4">
        <Button variant={muted ? "gold" : "outline"} className="border-warm bg-white/10 text-warm" onClick={() => setMuted((m) => !m)}>
          <VolumeX size={18} /> {muted ? "Unmute" : "Mute all"}
        </Button>
        <Button variant={paused ? "gold" : "outline"} className="border-warm bg-white/10 text-warm" onClick={() => setPaused((p) => !p)}>
          <Pause size={18} /> {paused ? "Resume" : "Pause all"}
        </Button>
        <Button variant="outline" className="border-warm bg-white/10 text-warm" onClick={() => setRegionIdx((i) => (i + 1) % REGIONS.length)}>
          <Map size={18} /> Next region: {REGIONS[regionIdx].name}
        </Button>
        <Link href={`/facilitator/${code}/print`} target="_blank">
          <Button variant="outline" className="border-warm bg-white/10 text-warm"><Printer size={18} /> Print QR hunt</Button>
        </Link>
        <Link href="/facilitator">
          <Button variant="danger"><Power size={18} /> End session</Button>
        </Link>
      </div>
    </div>
  );
}
