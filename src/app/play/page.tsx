"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, MapPinned, PlayCircle, RotateCcw, Route, Sparkles, Star } from "lucide-react";
import { GAME_GROUPS, GAMES, VISIBLE_GAMES, type GameGroup, type GameMeta } from "@/content/games";
import { JOURNEY } from "@/content/journey";
import { TopNav } from "@/components/top-nav";
import { GameGlyph } from "@/components/game/game-glyph";
import { MountainBackdrop, sceneForGameSlug } from "@/components/game/mountain-backdrop";
import { Button } from "@/components/ui/button";
import { store, useProfile, masteredLetterCount } from "@/lib/store";
import { IS_LITE, LITE_GAME_SLUGS } from "@/lib/lite";
import { useMemo, useState } from "react";

const GROUP_STYLE: Record<GameGroup, { kk: string; en: string; chip: string; line: string }> = {
  "Words & Letters": {
    kk: "Әріптер",
    en: "Alphabet",
    chip: "bg-[#fff4bd] text-steppe",
    line: "bg-[#ffcf4a]",
  },
  "Places & Culture": {
    kk: "Жерлер",
    en: "Places",
    chip: "bg-[#ffe0d2] text-steppe",
    line: "bg-[#ff8f4f]",
  },
  "Get Up & Move": {
    kk: "Қозғал",
    en: "Move",
    chip: "bg-[#dff0ff] text-steppe",
    line: "bg-[#4f8be8]",
  },
  "Make Your Own": {
    kk: "Жаса",
    en: "Create",
    chip: "bg-[#ffe1ec] text-steppe",
    line: "bg-[#ff6f9f]",
  },
};

export default function PlayHub() {
  if (IS_LITE) return <LiteHub />;
  return <FullHub />;
}

function LiteHub() {
  const liteGames = GAMES.filter((game) => (LITE_GAME_SLUGS as readonly string[]).includes(game.slug));
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <MountainBackdrop scene="hub" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.26)_36%,rgba(255,246,206,.08))]" />
      <TopNav />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-steppe sm:text-4xl">Қазақ тілін үйренейік</h1>
          <p className="mt-2 text-sm font-bold text-steppe/70 sm:text-base">
            Tap a game to start. Listen, then pick the match.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {liteGames.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </main>
    </div>
  );
}

function FullHub() {
  const profile = useProfile();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const currentStop = JOURNEY[Math.min(profile.unlockedWeeks - 1, JOURNEY.length - 1)];
  const nextStop = JOURNEY[profile.unlockedWeeks];
  const grouped = useMemo(
    () =>
      GAME_GROUPS.map((group) => ({ ...group, games: VISIBLE_GAMES.filter((game) => game.group === group.key) })).filter(
        (group) => group.games.length > 0,
      ),
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
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <MountainBackdrop scene="hub" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.26)_36%,rgba(255,246,206,.08))]" />
      <TopNav />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-lg border border-white/80 bg-white/[.82] p-4 text-steppe shadow-[0_20px_60px_rgba(69,128,59,.16)] backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ffd84f_0%,#ff9a4f_52%,#ff6f9f_100%)] px-5 py-2 font-black text-steppe-700 shadow-md shadow-orange-200/60">
                <Route size={18} /> Менің жолым
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                My Journey: {currentStop.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-steppe/[.72] sm:text-base">
                {currentStop.fact}
              </p>
            </div>

            <form onSubmit={unlock} className="w-full max-w-sm rounded-lg border border-steppe/10 bg-[#fff9e8]/90 p-3 shadow-sm">
              <label className="text-xs font-black uppercase text-[#e35f4c]">
                Unlock the next workshop stop
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={!nextStop}
                  placeholder={nextStop ? "Today's code" : "Complete"}
                  className="min-w-0 flex-1 rounded-lg border-2 border-steppe/10 bg-white px-4 py-2 font-black uppercase text-steppe outline-none placeholder:text-steppe/35 focus:border-[#ff9a4f]"
                />
                <Button variant="gold" type="submit" disabled={!nextStop}>
                  Unlock
                </Button>
              </div>
              <p className={`mt-2 min-h-5 text-xs font-bold ${message?.ok ? "text-[#2f8d47]" : "text-steppe/[.58]"}`}>
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
            <h2 className="text-3xl font-black text-steppe">Ойындар</h2>
            <p className="text-sm font-bold text-steppe/65">Games keep the current features, with the Canva category-card layout.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-steppe/10 bg-white/85 p-1 shadow-sm">
              {(["en", "ru"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => store.setBaseLanguage(lang)}
                  aria-pressed={profile.baseLanguage === lang}
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase transition ${
                    profile.baseLanguage === lang
                      ? "bg-[linear-gradient(135deg,#ffd84f_0%,#ff9a4f_52%,#ff6f9f_100%)] text-steppe-700"
                      : "text-steppe/60 hover:text-steppe"
                  }`}
                >
                  {lang === "en" ? "English" : "Русский"}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                store.reset();
                setMessage(null);
                setCode("");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-steppe/10 bg-white/85 px-3 py-1.5 text-xs font-black text-steppe shadow-sm transition hover:bg-[#fff3cf]"
            >
              <RotateCcw size={14} /> Reset demo
            </button>
          </div>
        </div>

        <div className="relative mt-4 space-y-6">
          <svg className="pointer-events-none absolute inset-x-4 top-0 hidden h-full opacity-45 lg:block" viewBox="0 0 1040 720" preserveAspectRatio="none" aria-hidden="true">
            <path d="M30 90 C220 10 250 190 430 125 S690 20 1010 160" fill="none" stroke="#ff9a4f" strokeDasharray="6 20" strokeLinecap="round" strokeWidth="8" />
            <path d="M72 340 C280 240 350 430 532 326 S806 250 982 430" fill="none" stroke="#ff6f9f" strokeDasharray="6 20" strokeLinecap="round" strokeWidth="8" />
          </svg>

          {grouped.map((group, shelfIndex) => {
            const style = GROUP_STYLE[group.key];
            return (
              <section key={group.key} className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <span className={`h-10 w-2 rounded-full ${style.line}`} />
                  <div>
                    <div className={`inline-flex rounded-full px-4 py-1.5 text-sm font-black shadow-sm ${style.chip}`}>
                      {style.kk} · {style.en}
                    </div>
                    <p className="mt-1 text-xs font-bold text-steppe/[.58]">{group.kk} · {group.blurb}</p>
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
            );
          })}
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
    steppe: "bg-[#dff0ff] text-steppe",
    terra: "bg-[#ffe0d2] text-steppe",
    gold: "bg-[#fff4bd] text-steppe",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/85 bg-white/[.82] p-4 text-steppe shadow-sm backdrop-blur">
      <div className={`grid h-12 w-12 place-items-center rounded-lg ${toneClass}`}>{icon}</div>
      <div>
        <div className="text-xs font-black uppercase text-steppe/55">{label}</div>
        <div className="text-2xl font-black leading-tight text-steppe">{value}</div>
        <div className="text-xs font-bold text-steppe/[.62]">{note}</div>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameMeta }) {
  const scene = sceneForGameSlug(game.slug);

  return (
    <Link
      href={game.href}
      className="group relative flex min-h-[196px] flex-col justify-between overflow-hidden rounded-lg border-2 border-white bg-white/90 p-4 text-steppe shadow-[0_14px_32px_rgba(69,128,59,.14)] transition hover:-translate-y-1 hover:border-[#ffcf4a] hover:shadow-[0_18px_40px_rgba(69,128,59,.2)]"
    >
      <MountainBackdrop scene={scene} className="canva-card-backdrop opacity-70 transition group-hover:scale-[1.02]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.72)_48%,rgba(255,255,255,.94))]" />
      {game.isNew && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-[#ff6f9f] px-2.5 py-1 text-[10px] font-black uppercase text-white shadow">
          New
        </span>
      )}
      <div className="relative z-10 flex items-start justify-between">
        <span className="rounded-full bg-[#fff4bd] px-3 py-1 text-[11px] font-black text-steppe shadow-sm">
          {game.kk}
        </span>
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/80 text-[#ff8f4f] shadow-sm">
          <GameGlyph slug={game.slug} size={42} />
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="text-base font-black leading-tight text-steppe">{game.title}</h4>
        <p className="mt-1 text-xs font-bold leading-4 text-steppe/[.66]">{game.blurb}</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#ffd84f_0%,#ff9a4f_52%,#ff6f9f_100%)] px-3 py-1.5 text-xs font-black text-steppe-700 shadow-sm">
          <PlayCircle size={14} /> Play
        </span>
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
      <path d={path} fill="none" stroke="rgba(30,77,140,.16)" strokeWidth="7" strokeLinecap="round" strokeDasharray="2 14" />
      <path
        d={path}
        fill="none"
        stroke="#ff9a4f"
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
            {current && <circle r="26" fill="none" stroke="#ff9a4f" strokeWidth="3" opacity="0.6" />}
            <circle
              r={current ? 18 : 14}
              fill={locked ? "rgba(30,77,140,.13)" : "#ffd84f"}
              stroke={locked ? "rgba(30,77,140,.22)" : "#ffffff"}
              strokeWidth={current ? 4 : 3}
            />
            {locked ? (
              <Lock x="-7" y="-7" width="14" height="14" color="rgba(30,77,140,.5)" strokeWidth="3" />
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
              fill={locked ? "rgba(30,77,140,.45)" : current ? "#e35f4c" : "#1e4d8c"}
            >
              {stop.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
