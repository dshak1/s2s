"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import {
  ReviewWorkshopButton,
  WorkshopReview,
  workshopWords,
} from "@/components/game/workshop-review";
import { GameStatsLine } from "@/components/game/game-stats-line";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { ReportQuestion } from "@/components/report-question";
import { ALPHABET } from "@/content/alphabet";
import { workshopDateLabel, type WorkshopSet } from "@/content/workshops";
import { GREETINGS, type Greeting } from "@/content/greetings";
import { type VocabItem } from "@/content/vocab";
import { playClip, playCorrect, playLetterPronunciation, playWin, playWrong, speakWord } from "@/lib/audio";
import { store, useProfile } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { greetingItemId, greetingSlug, letterItemId, parseItemId, vocabItemId } from "@/lib/items";
import { baseText } from "@/lib/lang";
import { shuffle } from "@/lib/utils";
import { useVocab } from "@/lib/vocab-packs";

// Learn merges what used to be three separate games — Sound It Out (letters),
// Greetings Quiz (phrases), and a general vocabulary quiz drawing on the same
// word list Falling Words and Spotlight Panic use — into one game that
// rotates format every round. Playing Learn is what "having learned it a
// little bit" before those games means.

type LetterCue = { cyr: string; latin: string; example: string; exampleEn: string; hint: string };

const SPECIAL_CUES: LetterCue[] = [
  { cyr: "Ә", latin: "Á", example: "Әке", exampleEn: "father", hint: "wide e sound" },
  { cyr: "Ғ", latin: "Ǵ", example: "Аға", exampleEn: "older brother", hint: "soft gh sound" },
  { cyr: "Қ", latin: "Q", example: "Қой", exampleEn: "sheep", hint: "deep q sound" },
  { cyr: "Ң", latin: "Ń", example: "Таң", exampleEn: "dawn", hint: "ng sound" },
  { cyr: "Ө", latin: "Ó", example: "Өзен", exampleEn: "river", hint: "rounded o sound" },
  { cyr: "Ұ", latin: "U", example: "Ұл", exampleEn: "son", hint: "short u sound" },
  { cyr: "Ү", latin: "Ú", example: "Үй", exampleEn: "house", hint: "front u sound" },
  { cyr: "Һ", latin: "H", example: "Гауһар", exampleEn: "jewel", hint: "breathy h sound" },
  { cyr: "І", latin: "I", example: "Іні", exampleEn: "younger brother", hint: "short i sound" },
].filter((cue) => ALPHABET.some((letter) => letter.cyr === cue.cyr));

const TOTAL = 8;
// Word rounds show up twice as often as letters or greetings — the general
// vocabulary pool is by far the biggest (90+ words vs. ~9 letters and a
// couple dozen greetings), so it carries most of the variety.
const KIND_SEQUENCE = ["word", "letter", "word", "greeting"] as const;
type Kind = (typeof KIND_SEQUENCE)[number];

type Round =
  | { kind: "letter"; mode: "hear-letter" | "match-audio"; answer: LetterCue; options: LetterCue[] }
  | { kind: "greeting"; mode: "hear-phrase" | "match-audio"; answer: Greeting; options: Greeting[] }
  | { kind: "word"; mode: "hear-word" | "match-audio"; answer: VocabItem; options: VocabItem[] };

// Deals from a shuffled, non-repeating copy of `source` — reshuffling once
// exhausted — instead of always walking the array from index 0. That's what
// made every replay open on the exact same letter/greeting/word before.
function dealNext<T>(deckRef: { current: T[] }, posRef: { current: number }, source: T[]): T {
  if (posRef.current >= deckRef.current.length) {
    deckRef.current = shuffle(source);
    posRef.current = 0;
  }
  const item = deckRef.current[posRef.current];
  posRef.current += 1;
  return item;
}

function pickOptions<T>(source: T[], answer: T, keyOf: (item: T) => string): T[] {
  const distractors = shuffle(source.filter((item) => keyOf(item) !== keyOf(answer))).slice(0, 2);
  return shuffle([answer, ...distractors]);
}

// Shared by the normal rotation and mistake-practice: builds one round for a
// given answer, always drawing distractors from the *full* category pool
// (not just whatever's in the mistakes subset — that could be too small to
// fill 3 options).
function roundFor(
  kind: Kind,
  index: number,
  answer: LetterCue | Greeting | VocabItem,
  pool: { letter: LetterCue[]; greeting: Greeting[]; word: VocabItem[] },
): Round {
  if (kind === "letter") {
    const a = answer as LetterCue;
    return { kind: "letter", mode: index % 2 === 0 ? "hear-letter" : "match-audio", answer: a, options: pickOptions(pool.letter, a, (c) => c.cyr) };
  }
  if (kind === "greeting") {
    const a = answer as Greeting;
    return { kind: "greeting", mode: index % 2 === 0 ? "hear-phrase" : "match-audio", answer: a, options: pickOptions(pool.greeting, a, (g) => g.kk) };
  }
  const a = answer as VocabItem;
  return { kind: "word", mode: index % 2 === 0 ? "hear-word" : "match-audio", answer: a, options: pickOptions(pool.word, a, (v) => v.slug) };
}

type MistakeEntry = { kind: Kind; item: LetterCue | Greeting | VocabItem };

// profile.mistakes is keyed by the same item ids logAnswer/ReportQuestion
// use everywhere else (see lib/items.ts) — decode each id back to the
// content object it names, dropping any that no longer resolve (content
// edited/removed since the miss was recorded).
function resolveMistakeItems(mistakes: Record<string, number>, vocab: VocabItem[]): MistakeEntry[] {
  const entries: MistakeEntry[] = [];
  for (const id of Object.keys(mistakes)) {
    const parsed = parseItemId(id);
    if (!parsed) continue;
    if (parsed.kind === "letter") {
      const cue = SPECIAL_CUES.find((c) => c.cyr === parsed.refSlug);
      if (cue) entries.push({ kind: "letter", item: cue });
    } else if (parsed.kind === "greeting") {
      const g = GREETINGS.find((g) => greetingSlug(g.audio) === parsed.refSlug);
      if (g) entries.push({ kind: "greeting", item: g });
    } else if (parsed.kind === "vocab") {
      const v = vocab.find((v) => v.slug === parsed.refSlug);
      if (v) entries.push({ kind: "word", item: v });
    }
  }
  return entries;
}

function answerKey(round: Round): string {
  if (round.kind === "letter") return round.answer.cyr;
  if (round.kind === "greeting") return round.answer.kk;
  return round.answer.slug;
}

function playRoundAudio(round: Round, option?: LetterCue | Greeting | VocabItem) {
  if (round.kind === "letter") {
    const cue = (option as LetterCue) ?? round.answer;
    playLetterPronunciation(cue.cyr, cue.example);
  } else if (round.kind === "greeting") {
    const greeting = (option as Greeting) ?? round.answer;
    playClip(greeting.audio, greeting.kk);
  } else {
    const word = (option as VocabItem) ?? round.answer;
    speakWord(word.kk);
  }
}

export default function Learn() {
  const profile = useProfile();
  const { baseLanguage } = profile;
  const vocab = useVocab();
  const [mode, setMode] = useState<"normal" | "mistakes" | "workshop">("normal");
  // The workshop being drilled, kept for the labels; the words themselves are
  // in workshopDeck below.
  const [workshopSet, setWorkshopSet] = useState<WorkshopSet | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [endless, setEndless] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"guess" | "right" | "wrong" | "done">("guess");
  const [burst, setBurst] = useState(false);
  // profile.mistakes is mutated in place (see store.ts), so its object
  // identity never changes — recomputed on every render instead of memoized
  // on that reference. Cheap: a handful of ids, each a linear find().
  const mistakeEntries = resolveMistakeItems(profile.mistakes, vocab);
  const shownAt = useRef(Date.now());
  const audioPlays = useRef(0);

  const letterDeck = useRef<LetterCue[]>([]);
  const letterPos = useRef(0);
  const greetingDeck = useRef<Greeting[]>([]);
  const greetingPos = useRef(0);
  const wordDeck = useRef<VocabItem[]>([]);
  const wordPos = useRef(0);
  const vocabRef = useRef(vocab);
  useEffect(() => { vocabRef.current = vocab; }, [vocab]);

  const seenSlugs = useRef<Set<string>>(new Set());
  const correctSlugs = useRef<Set<string>>(new Set());

  const buildRound = useCallback((index: number): Round => {
    const kind: Kind = KIND_SEQUENCE[index % KIND_SEQUENCE.length];
    const pool = { letter: SPECIAL_CUES, greeting: GREETINGS, word: vocabRef.current };
    if (kind === "letter") return roundFor("letter", index, dealNext(letterDeck, letterPos, SPECIAL_CUES), pool);
    if (kind === "greeting") return roundFor("greeting", index, dealNext(greetingDeck, greetingPos, GREETINGS), pool);
    return roundFor("word", index, dealNext(wordDeck, wordPos, vocabRef.current), pool);
  }, []);

  // Frozen at the moment "Practice mistakes" is pressed — profile.mistakes
  // shrinks live as items are answered correctly again (trackMistake), and
  // indexing into a list that's mutating under it would skip/repeat entries.
  // One stop's words, shuffled, dealt one per round: a workshop set is short
  // (8-10 words) and the point is to see all of it, not a random eight.
  const workshopDeck = useRef<VocabItem[]>([]);

  const buildWorkshopRound = useCallback((index: number): Round => {
    const words = workshopDeck.current;
    const answer = words[index % words.length];
    // Distractors come from the same workshop, so a kid is choosing between
    // words they actually sat in a room and learned together.
    return roundFor("word", index, answer, { letter: SPECIAL_CUES, greeting: GREETINGS, word: words });
  }, []);

  const practiceDeckRef = useRef<MistakeEntry[]>([]);
  const buildMistakeRound = useCallback((index: number): Round => {
    const entry = practiceDeckRef.current[index % practiceDeckRef.current.length];
    return roundFor(entry.kind, index, entry.item, { letter: SPECIAL_CUES, greeting: GREETINGS, word: vocabRef.current });
  }, []);

  useEffect(() => {
    setRound(buildRound(0));
    // Only on mount — replay() rebuilds explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = useMemo(() => {
    if (!round) return "";
    if (round.kind === "letter") {
      return round.mode === "hear-letter" ? "Listen, which Kazakh letter makes this sound?" : `Which sound matches ${round.answer.cyr}?`;
    }
    if (round.kind === "greeting") {
      return round.mode === "hear-phrase" ? "Listen, which Kazakh greeting is this?" : `Which sound says “${round.answer.kk}”?`;
    }
    return round.mode === "hear-word" ? "Listen, which Kazakh word is this?" : `Which sound says “${round.answer.kk}”?`;
  }, [round]);

  const finish = useCallback((finalScore: number) => {
    setPhase("done");
    playWin();
    store.recordGameRun({
      game: "learn",
      score: finalScore * 12,
      vocabSeen: [...seenSlugs.current],
      vocabCorrect: [...correctSlugs.current],
    });
  }, []);

  useEffect(() => {
    if (!round) return;
    const playsOnLoad = round.mode === "hear-letter" || round.mode === "hear-phrase" || round.mode === "hear-word";
    if (!playsOnLoad || phase !== "guess") return;
    const id = window.setTimeout(() => playRoundAudio(round), 250);
    return () => window.clearTimeout(id);
  }, [phase, round]);

  function itemIdFor(r: Round) {
    if (r.kind === "letter") return letterItemId(r.answer.cyr);
    if (r.kind === "greeting") return greetingItemId(r.answer);
    return vocabItemId(r.answer);
  }

  function check() {
    if (!picked || phase !== "guess" || !round) return;
    const correct = picked === answerKey(round);
    if (round.kind === "letter") store.answerLetter(round.answer.cyr, correct);
    if (round.kind === "word") {
      seenSlugs.current.add(round.answer.slug);
      if (correct) correctSlugs.current.add(round.answer.slug);
    }
    store.trackMistake(itemIdFor(round), correct);
    logAnswer({
      gameSlug: "learn",
      itemId: itemIdFor(round),
      promptKind: (round.mode === "hear-letter" || round.mode === "hear-phrase" || round.mode === "hear-word") ? "audio" : "text",
      response: picked,
      isCorrect: correct,
      latencyMs: Date.now() - shownAt.current,
      attemptIndex: roundIndex + 1,
      audioPlays: audioPlays.current,
    });
    if (correct) {
      const nextScore = score + 1;
      setScore(nextScore);
      setPhase("right");
      setBurst(true);
      playCorrect();
      window.setTimeout(() => setBurst(false), 900);
      return;
    }
    const nextLives = Math.max(0, lives - 1);
    setLives(nextLives);
    setPhase("wrong");
    playWrong();
    if (nextLives === 0) window.setTimeout(() => finish(score), 500);
  }

  function next() {
    const total =
      mode === "mistakes"
        ? practiceDeckRef.current.length
        : mode === "workshop"
          ? workshopDeck.current.length
          : TOTAL;
    if (!endless && roundIndex + 1 >= total) {
      finish(score);
      return;
    }
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setRound(
      mode === "mistakes"
        ? buildMistakeRound(nextIndex)
        : mode === "workshop"
          ? buildWorkshopRound(nextIndex)
          : buildRound(nextIndex),
    );
    setPicked(null);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  function replay() {
    letterDeck.current = [];
    letterPos.current = 0;
    greetingDeck.current = [];
    greetingPos.current = 0;
    wordDeck.current = [];
    wordPos.current = 0;
    seenSlugs.current = new Set();
    correctSlugs.current = new Set();
    setMode("normal");
    setWorkshopSet(null);
    setEndless(false);
    setRoundIndex(0);
    setRound(buildRound(0));
    setPicked(null);
    setLives(3);
    setScore(0);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  // Kicks off a session drawn only from what's currently in profile.mistakes
  // — snapshotted into practiceDeckRef so items clearing mid-session (a
  // correct answer removes them, see store.trackMistake) don't reshuffle
  // indices out from under the in-progress round.
  function startMistakePractice() {
    const entries = shuffle(mistakeEntries);
    if (entries.length === 0) return;
    practiceDeckRef.current = entries;
    seenSlugs.current = new Set();
    correctSlugs.current = new Set();
    setMode("mistakes");
    setEndless(false);
    setRoundIndex(0);
    setRound(roundFor(entries[0].kind, 0, entries[0].item, { letter: SPECIAL_CUES, greeting: GREETINGS, word: vocabRef.current }));
    setPicked(null);
    setLives(3);
    setScore(0);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  /** Drill one workshop's words, in a shuffled order, one round each.
   *  Same rounds Learn already builds for a word — hear it, or match the
   *  sound — just drawn from a single workshop's list. */
  function startWorkshop(set: WorkshopSet) {
    const words = shuffle(workshopWords(vocab, set));
    if (words.length < 3) return;
    workshopDeck.current = words;
    seenSlugs.current = new Set();
    correctSlugs.current = new Set();
    setWorkshopSet(set);
    setMode("workshop");
    setReviewing(false);
    setEndless(false);
    setRoundIndex(0);
    setRound(roundFor("word", 0, words[0], { letter: SPECIAL_CUES, greeting: GREETINGS, word: words }));
    setPicked(null);
    setLives(3);
    setScore(0);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  // Offered on the results screen after a normal 8-round set — the base run
  // already recorded/scored normally; this just keeps the same rotation
  // (decks reshuffle forever already, see dealNext) going past it with a
  // fresh scoreboard for whatever comes next.
  function continueEndless() {
    setEndless(true);
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setRound(buildRound(nextIndex));
    setPicked(null);
    setLives(3);
    setScore(0);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  if (!round) return null;

  const playsOnLoad = round.mode === "hear-letter" || round.mode === "hear-phrase" || round.mode === "hear-word";
  const kindLabel =
    mode === "workshop" && workshopSet
      ? `Workshop ${workshopSet.number} · ${workshopDateLabel(workshopSet.date)} · ${workshopSet.title}`
      : round.kind === "letter"
        ? "Focus letters · Ә Ғ Қ Ң Ө Ұ Ү Һ І"
        : round.kind === "greeting"
          ? "Everyday Kazakh greetings"
          : "Kazakh vocabulary";
  const effectiveTotal =
    mode === "mistakes"
      ? practiceDeckRef.current.length
      : mode === "workshop"
        ? workshopDeck.current.length
        : TOTAL;

  return (
    <GameShell title="Learn" kk="Үйрен" right={<Scoreboard label="♥" value={`${lives}`} />}>
      {burst && <Confetti count={45} />}

      {reviewing && (
        <WorkshopReview
          vocab={vocab}
          baseLanguage={baseLanguage}
          onPractice={startWorkshop}
          onClose={() => setReviewing(false)}
        />
      )}

      {phase === "done" ? (
        <div className="mx-auto max-w-xl rounded-2xl bg-steppe p-7 text-center text-warm shadow-xl">
          <div className="text-3xl font-black text-gold">
            {mode === "mistakes"
              ? "Mistakes cleared!"
              : mode === "workshop" && workshopSet
                ? `${workshopSet.title} done!`
                : "Round complete!"}
          </div>
          <p className="mt-2 text-lg font-bold">{score} / {effectiveTotal} correct · +{score * 12} points</p>
          <div className="mt-3"><GameStatsLine slug="learn" /></div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {mode === "normal" && (
              <Button variant="primary" size="lg" onClick={continueEndless}>Keep going ♾️</Button>
            )}
            {mode === "workshop" && (
              <Button variant="primary" size="lg" onClick={() => setReviewing(true)}>Another workshop</Button>
            )}
            <Button variant="gold" size="lg" onClick={replay}>Replay</Button>
            <Button variant="outline" size="lg" onClick={() => history.back()}>Back</Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-felt">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: endless ? "100%" : `${(roundIndex / effectiveTotal) * 100}%` }} />
          </div>

          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-terra">
              {endless ? `Endless · round ${roundIndex + 1}` : kindLabel}
            </p>
            <h1 className="mt-2 text-2xl font-black text-steppe sm:text-3xl">{prompt}</h1>
            <div className="flex flex-wrap items-center justify-center gap-x-4">
              {mode === "normal" ? (
                <>
                  {mistakeEntries.length > 0 && (
                    <button type="button" onClick={startMistakePractice} className="mt-1 text-xs font-black text-steppe/60 underline decoration-dotted">
                      🎯 Practice {mistakeEntries.length} you missed before
                    </button>
                  )}
                  <ReviewWorkshopButton onOpen={() => setReviewing(true)} />
                </>
              ) : (
                <button type="button" onClick={replay} className="mt-1 text-xs font-black text-steppe/60 underline decoration-dotted">
                  ↩ Back to the full mix
                </button>
              )}
            </div>
          </div>

          {playsOnLoad ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => { audioPlays.current += 1; playRoundAudio(round); }}
                aria-label="Play pronunciation"
                className="grid h-32 w-32 place-items-center rounded-full bg-steppe text-gold shadow-xl shadow-steppe/20 transition active:scale-95"
              >
                <Volume2 size={56} />
              </button>
              <span className="text-sm font-black text-wolf">Tap to hear again</span>
            </div>
          ) : round.kind === "letter" ? (
            <div className="grid h-32 w-32 place-items-center rounded-[2rem] bg-steppe text-7xl font-black text-gold shadow-xl shadow-steppe/20">
              {round.answer.cyr}
            </div>
          ) : (
            <div className="grid min-h-32 w-full max-w-md place-items-center rounded-[2rem] bg-steppe px-6 py-5 text-center text-4xl font-black text-gold shadow-xl shadow-steppe/20 sm:text-5xl">
              {round.answer.kk}
            </div>
          )}

          <div className="grid w-full gap-3 sm:grid-cols-3">
            {round.options.map((option, index) => {
              const key = round.kind === "letter" ? (option as LetterCue).cyr : round.kind === "greeting" ? (option as Greeting).kk : (option as VocabItem).slug;
              const optionText = round.kind === "letter" ? (option as LetterCue).cyr : round.kind === "greeting" ? (option as Greeting).kk : (option as VocabItem).kk;
              const selected = picked === key;
              const correct = key === answerKey(round);
              const reveal = phase !== "guess";
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (phase !== "guess") {
                      playRoundAudio(round, option);
                      return;
                    }
                    setPicked(key);
                    if (round.mode === "match-audio") playRoundAudio(round, option);
                  }}
                  className={`min-h-36 rounded-2xl border-4 bg-white p-4 text-center shadow-sm transition active:scale-95 ${
                    reveal && correct
                      ? "border-green-600"
                      : reveal && selected
                        ? "border-terra"
                        : selected
                          ? "border-steppe"
                          : "border-felt"
                  }`}
                >
                  {round.kind === "letter" ? (
                    round.mode === "hear-letter" ? (
                      <>
                        <div className="text-6xl font-black text-steppe">{optionText}</div>
                        {reveal && <div className="mt-2 text-sm font-black text-wolf">{(option as LetterCue).latin} · {(option as LetterCue).example}</div>}
                      </>
                    ) : (
                      <>
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-steppe text-gold"><Volume2 size={28} /></div>
                        <div className="mt-3 text-lg font-black text-steppe">Sound {index + 1}</div>
                        {reveal && <div className="mt-1 text-sm font-bold text-wolf">{(option as LetterCue).example} · {(option as LetterCue).exampleEn}</div>}
                      </>
                    )
                  ) : round.mode === "hear-phrase" || round.mode === "hear-word" ? (
                    <>
                      <div className="text-2xl font-black text-steppe sm:text-3xl">{optionText}</div>
                      {reveal && (
                        <div className="mt-2 text-sm font-black text-wolf">
                          {round.kind === "greeting" ? (option as Greeting).latin : (option as VocabItem).latin} · {baseText(option as Greeting | VocabItem, baseLanguage)}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-steppe text-gold"><Volume2 size={28} /></div>
                      <div className="mt-3 text-lg font-black text-steppe">Sound {index + 1}</div>
                      {reveal && <div className="mt-1 text-sm font-bold text-wolf">{optionText} · {baseText(option as Greeting | VocabItem, baseLanguage)}</div>}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="min-h-12">
            {phase === "guess" ? (
              <Button variant="gold" size="lg" disabled={!picked} onClick={check}>Check</Button>
            ) : (
              <Button variant={phase === "right" ? "primary" : "gold"} size="lg" onClick={next}>
                {!endless && roundIndex + 1 >= effectiveTotal ? "See results" : "Next"}
              </Button>
            )}
          </div>

          <div className="rounded-2xl bg-felt px-4 py-3 text-center text-sm font-bold text-steppe-700">
            {phase === "wrong"
              ? round.kind === "letter"
                ? `The answer was ${round.answer.cyr}, as in ${round.answer.example} (${round.answer.exampleEn}).`
                : `The answer was “${round.answer.kk}”, ${baseText(round.answer, baseLanguage)}.`
              : round.kind === "letter"
                ? `${round.answer.hint} · example word appears after you check.`
                : `Meaning appears after you check.`}
          </div>

          {phase !== "guess" && <ReportQuestion itemId={itemIdFor(round)} gameSlug="learn" />}
        </div>
      )}
    </GameShell>
  );
}
