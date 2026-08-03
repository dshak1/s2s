"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QR } from "@/components/qr";
import { Button } from "@/components/ui/button";
import { VISIBLE_GAMES } from "@/content/games";
import { REGIONS } from "@/content/regions";
import { useSession, sessions } from "@/lib/sessions";
import { openRoundChannel, type RoundAnswerPayload } from "@/lib/supabase/sync";
import { PLACES, type Place } from "@/content/places";
import { shuffle } from "@/lib/utils";
import { VolumeX, Pause, Map, Power, Printer, MapPin, Trophy, Flag } from "lucide-react";

type RoundStatus = "idle" | "live" | "revealed";

export default function LiveProjector() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const state = useSession(code);
  const [origin, setOrigin] = useState("");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [regionIdx, setRegionIdx] = useState(0);

  // Live round: Where in Kazakhstan, hosted. Broadcast-only (see
  // openRoundChannel), so nothing here needs a database write.
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("idle");
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<RoundAnswerPayload[]>([]);
  const placeQueueRef = useRef<Place[]>(shuffle(PLACES));
  const roundChannelRef = useRef<ReturnType<typeof openRoundChannel> | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    sessions.create(code);
  }, [code]);

  useEffect(() => {
    const channel = openRoundChannel(code, {
      round_answer: (payload) => {
        setAnswers((prev) =>
          prev.some((a) => a.profileId === payload.profileId && a.roundId === payload.roundId)
            ? prev
            : [...prev, payload],
        );
      },
    });
    roundChannelRef.current = channel;
    return () => channel.close();
  }, [code]);

  function launchRound() {
    if (placeQueueRef.current.length === 0) placeQueueRef.current = shuffle(PLACES);
    const [next, ...rest] = placeQueueRef.current;
    placeQueueRef.current = rest;
    const id = crypto.randomUUID();
    setCurrentPlace(next);
    setRoundId(id);
    setAnswers([]);
    setRoundStatus("live");
    roundChannelRef.current?.send("round_start", { roundId: id, placeId: next.id });
  }

  function revealRound() {
    if (!roundId) return;
    setRoundStatus("revealed");
    roundChannelRef.current?.send("round_reveal", { roundId });
  }

  function endRound() {
    if (roundId) roundChannelRef.current?.send("round_end", { roundId });
    setRoundStatus("idle");
    setCurrentPlace(null);
    setRoundId(null);
    setAnswers([]);
  }

  const leaderboard = [...answers].sort((a, b) => b.closeness - a.closeness);
  const totalPaws = state.members.reduce((n, m) => n + m.paws.length, 0);

  return (
    <div className="min-h-dvh bg-steppe font-admin text-warm">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-5">
        <div>
          <div className="text-sm font-bold text-gold">Session code, kids join at {origin || "…"}/join</div>
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
            {VISIBLE_GAMES.map((g) => (
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

      {/* live round, the Kahoot replacement */}
      <div className="px-8 pb-6">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-gold">
          <MapPin size={20} /> Live round · Where in Kazakhstan
        </h2>
        <div className="rounded-2xl bg-white/10 p-5">
          {roundStatus === "idle" ? (
            <Button variant="gold" size="lg" onClick={launchRound}>
              Launch a round
            </Button>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-3xl font-black">{currentPlace?.name}</div>
                <div className="text-warm/70">
                  {answers.length} / {state.members.length || "?"} answered
                </div>
              </div>

              {roundStatus === "live" && (
                <Button variant="gold" className="mt-4" onClick={revealRound}>
                  Reveal
                </Button>
              )}

              {roundStatus === "revealed" && (
                <>
                  {leaderboard.length === 0 ? (
                    <p className="mt-3 text-warm/60">No one answered in time.</p>
                  ) : (
                    <ol className="mt-3 space-y-1.5">
                      {leaderboard.map((a, i) => (
                        <li
                          key={a.profileId}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            i === 0 ? "bg-gold/20" : "bg-white/5"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-bold">
                            {i === 0 && <Trophy size={16} className="text-gold" />}
                            {i + 1}. {a.name}
                          </span>
                          <span className="font-black text-gold">{a.closeness}%</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button variant="gold" onClick={launchRound}>Next round</Button>
                    <Button variant="outline" className="border-warm bg-white/10 text-warm" onClick={endRound}>
                      End round
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
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
        <Link href={`/facilitator/${code}/race`} target="_blank">
          <Button variant="outline" className="border-warm bg-white/10 text-warm"><Flag size={18} /> Say &amp; Shift race</Button>
        </Link>
        <Button
          variant="danger"
          onClick={() => {
            sessions.end(code);
            router.push("/facilitator");
          }}
        >
          <Power size={18} /> End session
        </Button>
      </div>
    </div>
  );
}
