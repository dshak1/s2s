"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, MapPinned, RotateCcw, Route, Sparkles, Star } from "lucide-react";
import { GAME_GROUPS, GAMES, type GameMeta } from "@/content/games";
import { JOURNEY } from "@/content/journey";
import { TopNav } from "@/components/top-nav";
import { GameGlyph } from "@/components/game/game-glyph";
import { Button } from "@/components/ui/button";
import { store, useProfile, masteredLetterCount } from "@/lib/store";
import { useMemo, useState } from "react";

export default function PlayHub() {
  const profile = useProfile();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const currentStop = JOURNEY[Math.min(profile.unlockedWeeks - 1, JOURNEY.length - 1)];
  const nextStop = JOURNEY[profile.unlockedWeeks];
  const grouped = useMemo(
    () => GAME_GROUPS.map((group) => ({ ...group, games: GAMES.filter((game) => game.group === group.key) })),
    [],
  );
  const mastered = masteredLetterCount(profile);

  function unlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = store.unlockWeekWithCode(code);
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) setCode("");
  }

  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <section className="felt-pattern overflow-hidden rounded-[1.5rem] bg-steppe p-4 text-warm shadow-xl shadow-steppe/15 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-gold">
                <Route size={16} /> Silk Road · Ата жолы · Week {profile.unlockedWeeks} of {JOURNEY.length}
              </div>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                This week: the {currentStop.name} stop
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-warm/85 sm:text-base">
                {currentStop.fact}
              </p>
            </div>

            <form onSubmit={unlock} className="w-full max-w-sm rounded-2xl bg-white/12 p-3">
              <label className="text-xs font-black uppercase tracking-[0.18em] text-gold">
                Unlock the next workshop stop
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={!nextStop}
                  placeholder={nextStop ? "Today's code" : "Complete"}
                  className="min-w-0 flex-1 rounded-full border-2 border-white/20 bg-white/10 px-4 py-2 font-black uppercase tracking-widest text-warm outline-none placeholder:text-warm/50 focus:border-gold"
                />
                <Button variant="gold" type="submit" disabled={!nextStop}>
                  Unlock
                </Button>
              </div>
              <p className={`mt-2 min-h-5 text-xs font-bold ${message?.ok ? "text-gold" : "text-warm/70"}`}>
                {message
                  ? message.text
                  : nextStop
                    ? `Next stop: ${nextStop.name}. Demo code: ${profile.weeklyCodes[nextStop.id]}.`
                    : "Whole Silk Road complete. Replay any game for more points."}
              </p>
            </form>
          </div>

          <SilkRoadTrail unlockedWeeks={profile.unlockedWeeks} />
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <StatTile icon={<Sparkles size={22} />} label="Points" value={profile.xp.toLocaleString()} note="Replay any game for more" tone="steppe" />
          <StatTile icon={<MapPinned size={22} />} label="Stops Open" value={`${profile.unlockedWeeks}/${JOURNEY.length}`} note="Workshop codes unlock weeks" tone="terra" />
          <StatTile icon={<Star size={22} />} label="Yurt Reward" value={`${Math.min(mastered, 9)}/9`} note="Master the special Kazakh letters" tone="gold" />
        </section>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-steppe">Games shelves</h2>
            <p className="text-sm font-semibold text-wolf">English → Kazakh, with future stops visible and replayable.</p>
          </div>
          <button
            onClick={() => {
              store.reset();
              setMessage(null);
              setCode("");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-felt px-3 py-1.5 text-xs font-black text-steppe transition hover:bg-steppe/10"
          >
            <RotateCcw size={14} /> Reset demo
          </button>
        </div>

        <div className="mt-4 space-y-6">
          {grouped.map((group, shelfIndex) => (
            <section key={group.key}>
              <div className="mb-3 flex items-center gap-3">
                <span className={`h-8 w-2 rounded-full ${group.color}`} />
                <div>
                  <h3 className="text-lg font-black text-steppe">{group.key}</h3>
                  <p className="text-xs font-bold text-wolf">{group.kk} · {group.blurb}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {group.games.map((game, gameIndex) => (
                  <motion.div
                    key={game.slug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: shelfIndex * 0.04 + gameIndex * 0.03 }}
                  >
                    <GameCard game={game} />
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "steppe" | "terra" | "gold";
}) {
  const toneClass = {
    steppe: "bg-steppe text-warm",
    terra: "bg-terra text-white",
    gold: "bg-gold text-steppe-700",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass}`}>{icon}</div>
      <div>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-wolf">{label}</div>
        <div className="text-2xl font-black leading-tight text-steppe">{value}</div>
        <div className="text-xs font-bold text-wolf">{note}</div>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameMeta }) {
  const isGold = game.accent === "bg-gold";
  const ink = isGold ? "text-steppe-700" : "text-gold";
  const bodyText = isGold ? "text-steppe-700" : "text-warm";
  const subText = isGold ? "text-steppe-700/70" : "text-warm/70";
  return (
    <Link
      href={game.href}
      className={`group relative flex min-h-[172px] flex-col justify-between rounded-[1.5rem] p-4 shadow-[0_8px_18px_rgba(23,60,110,.18)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(23,60,110,.25)] ${game.accent}`}
    >
      {game.isNew && (
        <span className="absolute -right-2 -top-2 rounded-full bg-warm px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-steppe-700 shadow">
          New
        </span>
      )}
      <div className={`flex items-start justify-between`}>
        <span className={`text-[11px] font-black uppercase tracking-wide ${ink} opacity-90`}>{game.kk}</span>
        <div className={`${ink} opacity-90`}>
          <GameGlyph slug={game.slug} size={46} />
        </div>
      </div>
      <div>
        <h4 className={`text-base font-black leading-tight ${bodyText}`}>{game.title}</h4>
        <p className={`mt-1 text-xs font-semibold leading-4 ${subText}`}>{game.blurb}</p>
      </div>
    </Link>
  );
}

function SilkRoadTrail({ unlockedWeeks }: { unlockedWeeks: number }) {
  const nodes = [
    { x: 60, y: 150 },
    { x: 180, y: 88 },
    { x: 300, y: 150 },
    { x: 430, y: 96 },
    { x: 560, y: 150 },
    { x: 690, y: 92 },
    { x: 810, y: 150 },
    { x: 920, y: 96 },
  ];
  const path = nodes.map((node, index) => `${index === 0 ? "M" : "L"}${node.x} ${node.y}`).join(" ");
  const progress = ((Math.max(1, unlockedWeeks) - 1) / (JOURNEY.length - 1)) * 100;

  return (
    <svg viewBox="0 0 980 220" className="mt-3 block w-full" aria-label="Silk Road journey">
      <path d={path} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="7" strokeLinecap="round" strokeDasharray="2 14" />
      <path
        d={path}
        fill="none"
        stroke="#ffd700"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${progress} 100`}
        pathLength={100}
      />
      {nodes.map((node, index) => {
        const stop = JOURNEY[index];
        const done = index < unlockedWeeks - 1;
        const current = index === unlockedWeeks - 1;
        const locked = index >= unlockedWeeks;
        return (
          <g key={stop.id} transform={`translate(${node.x},${node.y})`}>
            {current && <circle r="26" fill="none" stroke="#ffd700" strokeWidth="3" opacity="0.6" />}
            <circle
              r={current ? 18 : 14}
              fill={locked ? "rgba(255,255,255,.14)" : "#ffd700"}
              stroke={locked ? "rgba(255,255,255,.35)" : "#faf6e9"}
              strokeWidth={current ? 4 : 3}
            />
            {locked ? (
              <Lock x="-7" y="-7" width="14" height="14" color="rgba(255,255,255,.65)" strokeWidth="3" />
            ) : (
              <text x="0" y="5" textAnchor="middle" fontWeight="900" fontSize="15" fill="#173c6e">
                {done ? "✓" : index + 1}
              </text>
            )}
            <text
              x="0"
              y={node.y > 120 ? 38 : -26}
              textAnchor="middle"
              fontWeight={current ? 900 : 700}
              fontSize="14"
              fill={locked ? "rgba(255,255,255,.45)" : current ? "#ffd700" : "rgba(255,255,255,.9)"}
            >
              {stop.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
