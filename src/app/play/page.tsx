"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleUserRound,
  Gamepad2,
  Lock,
  Mic,
  Play,
  Route,
  Trash2,
} from "lucide-react";
import { FirstRunGate } from "@/components/first-run-gate";
import { TopNav } from "@/components/top-nav";
import { Bilingual } from "@/components/ui/bilingual";
import { GameGlyph } from "@/components/game/game-glyph";
import { MountainBackdrop, sceneForGameSlug } from "@/components/game/mountain-backdrop";
import { Button } from "@/components/ui/button";
import { GAMES, VISIBLE_GAMES, type GameMeta } from "@/content/games";
import { JOURNEY } from "@/content/journey";
import { GAME_BUILDER_ENABLED } from "@/lib/online-features";
import { store, useProfile } from "@/lib/store";
import { IS_LITE, LITE_GAME_SLUGS } from "@/lib/lite";
import { weeklyChallengeSlug, WEEKLY_XP_MULTIPLIER } from "@/lib/weekly-challenge";

const STOP_IMAGES: Record<string, string> = {
  almaty: "/img/places-photos/almaty.webp",
  astana: "/img/places-photos/astana.webp",
  aral: "/img/places-photos/aral.jpg",
  charyn: "/img/places-photos/charyn.jpg",
  mangystau: "/img/places-photos/mangystau.jpg",
  karaganda: "/img/places-photos/karaganda.jpg",
  shymkent: "/img/places-photos/shymkent.jpg",
  turkistan: "/img/places-photos/turkistan.jpg",
};

export default function PlayHub() {
  return (
    <>
      <FirstRunGate />
      {IS_LITE ? <LiteHub /> : <FullHub />}
    </>
  );
}

function LiteHub() {
  const liteGames = GAMES.filter((game) => (LITE_GAME_SLUGS as readonly string[]).includes(game.slug));
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <MountainBackdrop scene="hub" />
      <div className="absolute inset-0 bg-white/20" />
      <TopNav />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-steppe sm:text-4xl">Қазақ тілін үйренейік</h1>
          <p className="mt-2 text-sm font-bold text-steppe/70 sm:text-base">Choose a game and start playing.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {liteGames.map((game) => <GameCard key={game.slug} game={game} />)}
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
  const weeklyChallenge = useMemo(() => {
    const slug = weeklyChallengeSlug();
    return VISIBLE_GAMES.find((g) => g.slug === slug) ?? null;
  }, []);

  const continueGame = useMemo(() => {
    const latest = profile.gameRuns[0];
    if (latest?.game.startsWith("custom:")) {
      const id = latest.game.slice("custom:".length);
      const custom = profile.customGames.find((game) => game.id === id);
      if (custom) return { title: custom.title, href: `/play/create/${custom.id}`, kk: "Менің ойыным" };
    }
    const known = VISIBLE_GAMES.find((game) => game.slug === latest?.game);
    return known ?? VISIBLE_GAMES.find((game) => game.slug === "say-and-shift") ?? VISIBLE_GAMES[0];
  }, [profile.customGames, profile.gameRuns]);

  function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = store.unlockWeekWithCode(code);
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) setCode("");
  }

  return (
    <div className="min-h-dvh bg-[#eef7fb] text-steppe">
      <TopNav />

      <main>
        <section className="relative min-h-[440px] overflow-hidden bg-steppe text-white">
          <Image
            src={STOP_IMAGES[currentStop.id]}
            alt={currentStop.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,40,70,.9)_0%,rgba(16,50,78,.74)_45%,rgba(16,50,78,.2)_100%)]" />
          <div className="relative mx-auto grid min-h-[440px] max-w-6xl items-end gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-center">
            <div className="max-w-2xl pb-2 lg:pb-0">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#ffd84f]">
                <Route size={16} /> Stop {currentStop.week} of {JOURNEY.length}
              </p>
              <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
                Your adventure continues in {currentStop.name}
              </h1>
              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/80 sm:text-base">
                {currentStop.fact}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={continueGame.href} className="inline-flex items-center gap-2 rounded-full bg-[#ffd84f] px-5 py-3 font-black text-steppe shadow-lg transition hover:bg-[#ffe478]">
                  <Play size={18} fill="currentColor" /> <Bilingual kk={`Жалғастыру: ${continueGame.kk}`} align="left">Continue: {continueGame.title}</Bilingual>
                </Link>
                <Link href={`/profile/${profile.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-5 py-3 font-black text-white backdrop-blur transition hover:bg-white/25">
                  <CircleUserRound size={18} /> <Bilingual kk="Менің парағым" align="left">Player account</Bilingual>
                </Link>
              </div>
            </div>

            <Link
              href="/play/say-and-shift"
              className="block rounded-lg border border-white/25 bg-[#102f4b]/75 p-5 shadow-2xl backdrop-blur-md transition hover:bg-[#102f4b]/90"
            >
              <p className="text-xs font-black uppercase tracking-wider text-[#ffd84f]">Featured game</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-lg bg-white/12 text-[#ffd84f]">
                  <GameGlyph slug="say-and-shift" size={44} />
                </div>
                <div>
                  <h2 className="text-xl font-black leading-tight">Айт та өт</h2>
                  <p className="text-xs font-black uppercase tracking-wide text-[#ffd84f]">Nomad Run</p>
                  <p className="mt-1 text-sm font-bold text-white/65">Say the Kazakh word out loud. The mic is always listening</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MissionStat value={profile.xp.toLocaleString()} label="Points" />
                <MissionStat value={`${profile.unlockedWeeks}/8`} label="Stops" />
                <MissionStat value={`${profile.customGames.length}`} label="My games" />
              </div>
            </Link>
          </div>
        </section>

        <section className="border-b border-steppe/10 bg-white">
          <div className="mx-auto max-w-6xl px-4 pb-5 pt-7 sm:px-6">
            <JourneyRail unlockedWeeks={profile.unlockedWeeks} />
            <form onSubmit={unlock} className="mt-4 flex flex-col gap-2 border-t border-steppe/10 pt-4 sm:flex-row sm:items-center">
              <div className="mr-auto">
                <p className="text-xs font-black uppercase text-steppe/45">Workshop unlock</p>
                <p className="font-black text-steppe">{nextStop ? `Next: ${nextStop.name}` : "All stops unlocked"}</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  disabled={!nextStop}
                  maxLength={8}
                  placeholder={nextStop ? "SESSION CODE" : "COMPLETE"}
                  aria-label="Workshop unlock code"
                  className="min-w-0 rounded-lg border-2 border-steppe/15 bg-[#f4f8fb] px-3 py-2 text-center font-mono font-black uppercase tracking-wider text-steppe outline-none focus:border-[#ff9a4f]"
                />
                <Button variant="gold" size="sm" type="submit" disabled={!nextStop || !code.trim()}>Unlock</Button>
              </div>
              {message && <p className={`text-xs font-bold sm:max-w-48 ${message.ok ? "text-[#2f8d47]" : "text-[#b44736]"}`}>{message.text}</p>}
            </form>
          </div>
        </section>

        <section className="bg-[#fff9e8] py-9">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#e35f4c]">Maker lab</p>
                <h2 className="text-3xl font-black text-steppe">Make it yours</h2>
              </div>
              {GAME_BUILDER_ENABLED && (
                <Link href="/play/create" className="inline-flex items-center gap-2 font-black text-steppe underline">
                  Build a new game <ArrowRight size={16} />
                </Link>
              )}
            </div>

            <div className={`mt-5 grid gap-3 ${GAME_BUILDER_ENABLED ? "md:grid-cols-2" : ""}`}>
              <MakerCard href="/play/say-and-shift" image="/img/places-photos/almaty.webp" icon={<Mic size={22} />} title="Nomad Run" copy="Draw your runner, then race the wall with your voice." />
              {GAME_BUILDER_ENABLED && (
                <MakerCard href="/play/create" image="/img/places-photos/charyn.jpg" icon={<Gamepad2 size={22} />} title="Build a game" copy="Choose the words, draw the world, then run it." />
              )}
            </div>

            {GAME_BUILDER_ENABLED && profile.customGames.length > 0 && (
              <div className="mt-7">
                <h3 className="text-lg font-black text-steppe">My games</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.customGames.map((game) => (
                    <article key={game.id} className="flex items-center gap-3 rounded-lg border border-steppe/10 bg-white p-3 shadow-sm">
                      <Link href={`/play/create/${game.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#dff0ff] text-steppe"><GameGlyph slug="steppe-sprint" size={38} /></div>
                        <div className="min-w-0">
                          <h4 className="truncate font-black text-steppe">{game.title}</h4>
                          <p className="text-xs font-bold text-steppe/50">{game.vocabSlugs.length} words</p>
                        </div>
                      </Link>
                      <button type="button" title="Delete game" aria-label={`Delete ${game.title}`} onClick={() => store.deleteCustomGame(game.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-steppe/45 transition hover:bg-[#ffe8e2] hover:text-[#b44736]"><Trash2 size={17} /></button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#2f8d47]">Game library</p>
                <h2 className="text-3xl font-black text-steppe">Choose your next move</h2>
              </div>
              {weeklyChallenge && (
                <Link
                  href={weeklyChallenge.href}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ffd84f] px-4 py-2 text-sm font-black text-steppe shadow-sm transition hover:-translate-y-0.5"
                >
                  ⚡ This week: {WEEKLY_XP_MULTIPLIER}x XP on {weeklyChallenge.title}
                </Link>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VISIBLE_GAMES.map((game, index) => (
                <motion.div key={game.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <GameCard game={game} weeklyChallenge={weeklyChallenge?.slug === game.slug} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-steppe/10 bg-white py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#dff0ff] text-steppe"><BookOpenCheck size={21} /></div>
              <div><p className="font-black text-steppe">Homework</p><p className="text-sm font-bold text-steppe/55">Turn in a photo from this week.</p></div>
            </div>
            <Link href="/homework" className="inline-flex items-center gap-1 font-black text-steppe">Open homework <ChevronRight size={17} /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function MissionStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-2 py-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase text-white/55">{label}</p>
    </div>
  );
}

function JourneyRail({ unlockedWeeks }: { unlockedWeeks: number }) {
  return (
    <div className="no-scrollbar flex gap-0 overflow-x-auto pt-2" aria-label="Adventure roadmap">
      {JOURNEY.map((stop, index) => {
        const unlocked = index < unlockedWeeks;
        const current = index === unlockedWeeks - 1;
        return (
          <div key={stop.id} className="relative flex min-w-[128px] flex-1 items-center">
            {index > 0 && <span className={`absolute left-0 right-1/2 top-5 h-1 ${unlocked ? "bg-[#ff9a4f]" : "bg-steppe/10"}`} />}
            {index < JOURNEY.length - 1 && <span className={`absolute left-1/2 right-0 top-5 h-1 ${index < unlockedWeeks - 1 ? "bg-[#ff9a4f]" : "bg-steppe/10"}`} />}
            <div className="relative z-10 mx-auto text-center">
              <div className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-4 border-white shadow-sm ${unlocked ? "bg-[#ffd84f] text-steppe" : "bg-[#e4eaee] text-steppe/35"} ${current ? "ring-2 ring-[#ff9a4f] ring-offset-2" : ""}`}>
                {unlocked ? (index < unlockedWeeks - 1 ? <Check size={17} /> : index + 1) : <Lock size={15} />}
              </div>
              <p className={`mt-2 text-xs font-black ${current ? "text-[#e35f4c]" : unlocked ? "text-steppe" : "text-steppe/35"}`}>{stop.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MakerCard({ href, image, icon, title, copy }: { href: string; image: string; icon: React.ReactNode; title: string; copy: string }) {
  return (
    <Link href={href} className="group relative min-h-56 overflow-hidden rounded-lg bg-steppe shadow-lg">
      <Image src={image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(13,45,70,.9)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#ffd84f] text-steppe">{icon}</div>
        <h3 className="mt-3 text-xl font-black">{title}</h3>
        <p className="mt-1 text-sm font-bold text-white/70">{copy}</p>
      </div>
    </Link>
  );
}

function GameCard({ game, weeklyChallenge = false }: { game: GameMeta; weeklyChallenge?: boolean }) {
  const scene = sceneForGameSlug(game.slug);
  return (
    <Link
      href={game.href}
      className="group relative flex min-h-[230px] flex-col justify-between overflow-hidden rounded-lg border border-white bg-white text-steppe shadow-[0_14px_32px_rgba(31,70,92,.12)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(31,70,92,.2)]"
    >
      <div className="relative h-32 overflow-hidden">
        <MountainBackdrop scene={scene} className="canva-card-backdrop transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-white/15" />
        <div className="absolute left-3 top-3 grid h-12 w-12 place-items-center rounded-lg bg-white/90 text-[#e35f4c] shadow-sm"><GameGlyph slug={game.slug} size={40} /></div>
        {weeklyChallenge ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#ffcf4a] px-2.5 py-1 text-[10px] font-black uppercase text-steppe shadow">⚡ {WEEKLY_XP_MULTIPLIER}x XP</span>
        ) : (
          game.isNew && <span className="absolute right-3 top-3 rounded-full bg-[#ffcf4a] px-2.5 py-1 text-[10px] font-black uppercase text-steppe shadow">New</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {/* Kazakh is the big line and English the small one under it, not the
            other way round (issue #25) — the card should teach the game's
            Kazakh name, with the English there so nobody is lost. */}
        <h3 className="text-lg font-black leading-tight text-steppe">{game.kk}</h3>
        <p className="mt-0.5 text-xs font-black uppercase tracking-wide text-[#e35f4c]">{game.title}</p>
        <p className="mt-1.5 flex-1 text-xs font-bold leading-5 text-steppe/58">{game.blurb}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-steppe">
          <Bilingual kk="Ойнау" align="left">Play</Bilingual> <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}
