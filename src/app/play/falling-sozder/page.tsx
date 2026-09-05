"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { GameStatsLine } from "@/components/game/game-stats-line";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, VOCAB_CATEGORY_META, type VocabCategory, type VocabItem } from "@/content/vocab";
import { shuffle } from "@/lib/utils";
import { playCorrect, playWrong, speakWord } from "@/lib/audio";
import { store, useProfile } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { vocabItemId } from "@/lib/items";
import { baseText } from "@/lib/lang";
import { resizeImageFile } from "@/lib/client-image";
import { useVocab } from "@/lib/vocab-packs";
import { Heart, ImagePlus, Trophy, X } from "lucide-react";

// Field height (and BASE_SPEED/RAMP_PER_CATCH/RAMP_LEVEL_BONUS below) were
// scaled up together, same ratio, from the original 380/62 — the play area
// was leaving most of the white card empty below it. Keeping FIELD/BASE_SPEED
// constant preserves the original ~6s fall time and difficulty curve exactly,
// just at a size that actually fills the card.
const FIELD = 510; // px fall distance before "ground"
const MAX_MISS = 3;
const MAX_LEVEL = 10;
const CATCHES_PER_LEVEL = 6; // catches to advance a level, no pause between
const WORDS_AT_START = 3;
const WORDS_PER_LEVEL = 2; // new words layered in at each level-up
const BASE_SPEED = 83; // px/sec, every level starts here…
const RAMP_PER_CATCH = 15; // …and ramps as you catch words within the level
const RAMP_LEVEL_BONUS = 2; // higher levels ramp a little steeper
// A tap landing right as a word reaches the bottom used to race the rAF
// timeout: if the miss fired first it swapped currentRef to the next word
// before the click handler ran, so a genuinely-in-time tap read as wrong
// against the wrong word. This holds the word at the bottom for one beat so
// a tap that arrives within it still resolves against the word it was for.
const MISS_GRACE_MS = 220;
// rAF stops firing while the tab is hidden, so the first frame back carries a
// dt of however long the kid was away. Unclamped that teleports the word past
// the bottom and costs a life for switching tabs. 50ms = a 20fps floor.
const MAX_FRAME_DT = 0.05;
// Rendered heights of the falling tile and the basket row, so the word lands
// *on* the baskets instead of behind them.
const WORD_H = 44; // py-2 + text-xl line box
const BASKET_ZONE = 80; // p-3 wrapper + py-3/border-4 buttons

const BEST_KEY = "s2s.falling.best.v2";

// All the vocab packs plus a mixed pack that draws from every category.
type PackKey = VocabCategory | "random";
const PACKS: Array<{ key: PackKey; kk: string; en: string; ru: string; emoji: string }> = [
  { key: "random", kk: "Аралас", en: "Random Mix", ru: "Случайный микс", emoji: "🎲" },
  ...VOCAB_CATEGORY_META,
];

function readBests(): Partial<Record<PackKey, number>> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

type Phase = "pick" | "play" | "over" | "mastered";

export default function FallingSozder() {
  const profile = useProfile();
  const { baseLanguage } = profile;
  const vocab = useVocab();
  const editorFileRef = useRef<HTMLInputElement>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [hintEditorOpen, setHintEditorOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState<PackKey>("family");
  const [bests, setBests] = useState<Partial<Record<PackKey, number>>>({});
  const [catches, setCatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [level, setLevel] = useState(1);
  const [baskets, setBaskets] = useState<VocabItem[]>([]);
  const [current, setCurrent] = useState<VocabItem | null>(null);
  const [banner, setBanner] = useState<{ level: number; words: string[] } | null>(null);
  const [y, setY] = useState(0);
  const [x, setX] = useState(50);

  const raf = useRef(0);
  const yRef = useRef(0);
  const lastTs = useRef(0);
  // Telemetry: when the current word started falling.
  const spawnedAt = useRef(0);
  const phaseRef = useRef<Phase>("pick");
  const currentRef = useRef<VocabItem | null>(null);
  const lastSlug = useRef<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expired = useRef(false); // word hit bottom, waiting out MISS_GRACE_MS for a late-but-in-time tap
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Level/word-pool state lives in refs so the rAF loop reads fresh values.
  const deck = useRef<VocabItem[]>([]); // full category deck, in intro order
  const pool = useRef<VocabItem[]>([]); // words active at the current level
  const freshSlugs = useRef<Set<string>>(new Set()); // introduced this level → spawn more often
  const wrongCount = useRef<Map<string, number>>(new Map());
  const rightCount = useRef<Map<string, number>>(new Map());
  const seen = useRef<Set<string>>(new Set());
  const correctSet = useRef<Set<string>>(new Set());
  const catchesRef = useRef(0);
  const missesRef = useRef(0);
  const levelRef = useRef(1);
  const catchesInLevel = useRef(0);

  useEffect(() => {
    setBests(readBests());
    return () => {
      cancelAnimationFrame(raf.current);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, []);

  // Weighted pick: fresh words show up often, words you missed come back,
  // mastered words fade — and the same word never falls twice in a row.
  const pickTarget = useCallback(() => {
    const candidates = pool.current.filter((w) => pool.current.length === 1 || w.slug !== lastSlug.current);
    const weights = candidates.map((w) => {
      if (freshSlugs.current.has(w.slug)) return 3;
      const wrong = wrongCount.current.get(w.slug) ?? 0;
      const right = rightCount.current.get(w.slug) ?? 0;
      if (wrong > 0) return 1 + 1.5 * wrong;
      return right >= 3 ? 0.5 : 1;
    });
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }, []);

  const spawn = useCallback(() => {
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
    expired.current = false;
    const target = pickTarget();
    const distractors = shuffle(pool.current.filter((w) => w.slug !== target.slug)).slice(0, 2);
    setBaskets(shuffle([target, ...distractors]));
    currentRef.current = target;
    setCurrent(target);
    lastSlug.current = target.slug;
    seen.current.add(target.slug);
    yRef.current = 0;
    setY(0);
    setX(15 + Math.random() * 70);
    spawnedAt.current = Date.now();
  }, [pickTarget]);

  const saveBest = useCallback(
    (cat: PackKey, reached: number) => {
      const next = { ...readBests() };
      if ((next[cat] ?? 0) < reached) {
        next[cat] = reached;
        try {
          localStorage.setItem(BEST_KEY, JSON.stringify(next));
        } catch {}
      }
      setBests(next);
    },
    [],
  );

  const finish = useCallback(
    (end: "over" | "mastered") => {
      phaseRef.current = end;
      setPhase(end);
      cancelAnimationFrame(raf.current);
      saveBest(category, levelRef.current);
      store.recordGameRun({
        game: "falling-sozder",
        score: catchesRef.current * 5 + (end === "mastered" ? 50 : 0),
        vocabSeen: [...seen.current],
        vocabCorrect: [...correctSet.current],
      });
    },
    [category, saveBest],
  );

  // Shared by the grace-timer elapsing and a wrong tap landing after the word
  // already reached bottom — both mean the same thing: this word is over.
  const resolveMiss = useCallback((alreadyLogged = false) => {
    playWrong();
    if (currentRef.current && !alreadyLogged) {
      logAnswer({
        gameSlug: "falling-sozder",
        itemId: vocabItemId(currentRef.current),
        promptKind: "text",
        response: null, // ran out of time rather than picking wrong
        isCorrect: false,
        latencyMs: spawnedAt.current ? Date.now() - spawnedAt.current : null,
        attemptIndex: catchesRef.current + missesRef.current + 1,
      });
    }
    missesRef.current += 1;
    setMisses(missesRef.current);
    if (missesRef.current >= MAX_MISS) {
      finish("over");
      return;
    }
    spawn();
    lastTs.current = 0;
  }, [finish, spawn]);

  const loopRef = useRef<(ts: number) => void>(() => {});
  const loop = useCallback(
    (ts: number) => {
      if (phaseRef.current !== "play") return;
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min((ts - lastTs.current) / 1000, MAX_FRAME_DT);
      lastTs.current = ts;
      // Every level starts at BASE_SPEED and ramps per catch; the ramp gets a
      // touch steeper at higher levels so late levels end harder.
      const ramp = RAMP_PER_CATCH + RAMP_LEVEL_BONUS * (levelRef.current - 1);
      const speed = BASE_SPEED + ramp * catchesInLevel.current;
      if (!expired.current) {
        yRef.current += speed * dt;
        setY(yRef.current);
        if (yRef.current >= FIELD) {
          // Hold here instead of resolving immediately — a tap already on its
          // way in for this word (see MISS_GRACE_MS above) still needs a
          // moment to arrive and land on the word it was actually meant for.
          yRef.current = FIELD;
          setY(FIELD);
          expired.current = true;
          expiryTimer.current = setTimeout(() => {
            if (!expired.current || phaseRef.current !== "play") return;
            resolveMiss();
          }, MISS_GRACE_MS);
        }
      }
      raf.current = requestAnimationFrame(loopRef.current);
    },
    [resolveMiss],
  );
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  function start(cat: PackKey) {
    const catDeck = cat === "random" ? vocab : vocab.filter((w) => w.category === cat);
    deck.current = shuffle(catDeck);
    pool.current = deck.current.slice(0, WORDS_AT_START);
    freshSlugs.current = new Set(pool.current.map((w) => w.slug));
    wrongCount.current = new Map();
    rightCount.current = new Map();
    seen.current = new Set();
    correctSet.current = new Set();
    catchesRef.current = 0;
    missesRef.current = 0;
    levelRef.current = 1;
    catchesInLevel.current = 0;
    lastSlug.current = null;
    setCategory(cat);
    setCatches(0);
    setMisses(0);
    setLevel(1);
    setBanner(null);
    phaseRef.current = "play";
    setPhase("play");
    spawn();
    lastTs.current = 0;
    raf.current = requestAnimationFrame(loop);
  }

  function levelUp() {
    // Clearing the last level ends the run *at* MAX_LEVEL. Bumping first meant
    // the scoreboard flashed "Lvl 11" and saved an 11 as the pack best.
    if (levelRef.current >= MAX_LEVEL) {
      finish("mastered");
      return false;
    }
    levelRef.current += 1;
    catchesInLevel.current = 0;
    setLevel(levelRef.current);
    // Layer in new words; once the deck is exhausted the level-ups are pure speed.
    const nextWords = deck.current.slice(pool.current.length, pool.current.length + WORDS_PER_LEVEL);
    pool.current = [...pool.current, ...nextWords];
    freshSlugs.current = new Set(nextWords.map((w) => w.slug));
    setBanner({ level: levelRef.current, words: nextWords.map((w) => w.kk) });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 2400);
    return true;
  }

  function tapBasket(item: VocabItem) {
    if (phaseRef.current !== "play" || !currentRef.current) return;
    // A word already past the bottom is only still "current" because it's
    // waiting out MISS_GRACE_MS for exactly this — a tap that was on its way
    // in before it landed. Resolve it now instead of letting the timer redo
    // this same work a moment later (which would cost a second life).
    const wasExpired = expired.current;
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
    expired.current = false;
    const target = currentRef.current;
    logAnswer({
      gameSlug: "falling-sozder",
      itemId: vocabItemId(target),
      promptKind: "text",
      response: item.slug,
      isCorrect: item.slug === target.slug,
      latencyMs: spawnedAt.current ? Date.now() - spawnedAt.current : null,
      attemptIndex: catchesRef.current + missesRef.current + 1,
    });
    if (item.slug === target.slug) {
      playCorrect();
      speakWord(item.kk);
      correctSet.current.add(item.slug);
      rightCount.current.set(item.slug, (rightCount.current.get(item.slug) ?? 0) + 1);
      freshSlugs.current.delete(item.slug);
      store.catchWord(true);
      catchesRef.current += 1;
      catchesInLevel.current += 1;
      setCatches(catchesRef.current);
      if (catchesRef.current === 8) store.awardWordCatcher();
      if (catchesInLevel.current >= CATCHES_PER_LEVEL) {
        if (!levelUp()) return; // category mastered
      }
      spawn();
      lastTs.current = 0;
    } else if (wasExpired) {
      resolveMiss(true); // the logAnswer above already recorded this attempt
    } else {
      // A wrong tap costs one life and ends the word. It used to leave the word
      // falling, so the same mistake also cost the miss when it hit the bottom
      // (two lives per tap), and a kid drumming on the baskets could burn all
      // three lives on a single word before it was halfway down.
      playWrong();
      wrongCount.current.set(target.slug, (wrongCount.current.get(target.slug) ?? 0) + 1);
      missesRef.current += 1;
      setMisses(missesRef.current);
      if (missesRef.current >= MAX_MISS) {
        finish("over");
        return;
      }
      spawn();
      lastTs.current = 0;
    }
  }

  async function attachHintTo(slug: string, file: File | undefined | null) {
    if (!file) return;
    const dataUrl = await resizeImageFile(file, 800);
    store.setVocabHint(slug, dataUrl);
  }

  const meta = PACKS.find((c) => c.key === category)!;
  const playing = phase === "play";
  const currentHint = current ? profile.vocabHints[current.slug] : null;

  return (
    <GameShell
      title="Falling Words"
      kk="Құлайтын сөздер"
      right={<Scoreboard label="Lvl" value={level} />}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_MISS }).map((_, i) => (
            <Heart key={i} size={22} className={i < MAX_MISS - misses ? "fill-terra text-terra" : "text-wolf/40"} />
          ))}
        </div>
        {playing && (
          <span className="rounded-full bg-warm/90 px-3 py-1 text-xs font-black text-steppe shadow-sm">
            {meta.kk}
          </span>
        )}
        <span className="font-extrabold text-steppe">Caught: {catches}</span>
      </div>

      {/* w-full, not mx-auto: GameShell's card is a flex *column*, and an auto
          cross-axis margin opts a flex item out of the default stretch. Every
          child of this field is absolutely positioned, so with mx-auto its
          content width was 0 and the whole play field collapsed to an
          invisible zero-width strip. */}
      <div
        className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-steppe to-steppe-700 bg-cover bg-center"
        style={{ height: FIELD + WORD_H + BASKET_ZONE, backgroundImage: currentHint ? `url(${currentHint})` : undefined }}
      >
        {currentHint && <div className="pointer-events-none absolute inset-0 bg-steppe/45" />}

        {/* falling word */}
        <AnimatePresence>
          {playing && current && (
            <div
              className="absolute -translate-x-1/2 rounded-2xl bg-gold px-4 py-2 text-xl font-black text-steppe-700 shadow-lg"
              style={{ top: y, left: `${x}%` }}
            >
              {baseText(current, baseLanguage)}
            </div>
          )}
        </AnimatePresence>

        {/* level-up banner, floats over play without pausing the game */}
        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-16 z-10 mx-auto w-fit rounded-2xl bg-gold px-5 py-2 text-center shadow-lg"
            >
              <div className="text-lg font-black text-steppe-700">Деңгей {banner.level}!</div>
              {banner.words.length > 0 && (
                <div className="text-sm font-bold text-steppe-700/80">New words: {banner.words.join(" · ")}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* baskets, regenerated every drop: the answer + 2 words from the pool */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 p-3">
          {(playing ? baskets : []).map((b) => (
            <button
              key={b.slug}
              onClick={() => tapBasket(b)}
              className="rounded-2xl border-4 border-gold/60 bg-warm/95 py-3 text-center text-base font-black text-steppe shadow-md transition active:scale-95"
            >
              {b.kk}
            </button>
          ))}
        </div>

        {phase === "pick" && hintEditorOpen && (
          <div className="absolute inset-0 flex flex-col bg-steppe/95 p-4 text-warm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-lg font-black">Picture hints</p>
                <p className="text-xs text-warm/70">Add a photo to a hard word. It becomes the background when that word falls.</p>
              </div>
              <Button size="sm" onClick={() => setHintEditorOpen(false)}>Done</Button>
            </div>
            <input
              ref={editorFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                if (editingSlug) attachHintTo(editingSlug, event.target.files?.[0]);
                event.currentTarget.value = "";
                setEditingSlug(null);
              }}
            />
            <div className="mt-3 flex-1 space-y-4 overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => {
                const words = vocab.filter((v) => v.category === cat);
                if (words.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-black uppercase tracking-wide text-warm/60">{CATEGORY_LABELS[cat]}</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {words.map((word) => {
                        const hint = profile.vocabHints[word.slug];
                        return (
                          <div key={word.slug} className="flex items-center gap-2 rounded-lg bg-white/10 p-1.5">
                            {hint ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={hint} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                            ) : (
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10 text-warm/40">
                                <ImagePlus size={16} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black">{word.kk}</p>
                              <p className="truncate text-[10px] text-warm/60">{baseText(word, baseLanguage)}</p>
                            </div>
                            <button
                              type="button"
                              title={hint ? "Replace hint" : "Add hint"}
                              aria-label={hint ? `Replace hint for ${word.kk}` : `Add hint for ${word.kk}`}
                              onClick={() => {
                                setEditingSlug(word.slug);
                                editorFileRef.current?.click();
                              }}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
                            >
                              <ImagePlus size={13} />
                            </button>
                            {hint && (
                              <button
                                type="button"
                                title="Remove hint"
                                aria-label={`Remove hint for ${word.kk}`}
                                onClick={() => store.clearVocabHint(word.slug)}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {phase === "pick" && !hintEditorOpen && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-steppe/85 p-4 text-center text-warm">
            <p className="text-2xl font-black">Pick a word pack</p>
            <p className="max-w-sm text-sm text-warm/85">
              Each pack starts with 3 words and adds more as you level up. Catch the Kazakh basket before the English word lands!
            </p>
            <button
              type="button"
              onClick={() => setHintEditorOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-warm transition hover:bg-white/25"
            >
              <ImagePlus size={16} /> Add picture hints
            </button>
            <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
              {PACKS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => start(c.key)}
                  className="rounded-2xl bg-warm/95 p-3 text-steppe shadow-md transition hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="text-sm font-black leading-tight break-words sm:text-base">{c.kk}</div>
                  <div className="mt-0.5 text-[11px] font-bold text-steppe/60">{baseText(c, baseLanguage)}</div>
                  {(bests[c.key] ?? 0) > 0 && (
                    <div className="mt-1 text-[11px] font-black text-terra">Best: Lvl {bests[c.key]}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === "over" || phase === "mastered") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-steppe/85 p-4 text-center text-warm">
            {phase === "mastered" ? (
              <>
                <Trophy size={44} className="text-gold" />
                <p className="text-3xl font-black">{meta.kk} mastered!</p>
                <p>You beat all {MAX_LEVEL} levels and caught {catches} words.</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black">Game over!</p>
                <p>
                  {baseText(meta, baseLanguage)}, you caught {catches} words and reached level {level}.
                </p>
              </>
            )}
            <GameStatsLine slug="falling-sozder" />
            <div className="flex gap-2">
              <Button variant="gold" size="lg" onClick={() => start(category)}>
                Play again
              </Button>
              <Button size="lg" onClick={() => { phaseRef.current = "pick"; setPhase("pick"); }}>
                Change pack
              </Button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
