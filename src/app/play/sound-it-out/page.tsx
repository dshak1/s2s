"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { ALPHABET } from "@/content/alphabet";
import { playCorrect, playLetterPronunciation, playWrong, playWin } from "@/lib/audio";
import { store } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { letterItemId } from "@/lib/items";

type LetterCue = {
  cyr: string;
  latin: string;
  example: string;
  exampleEn: string;
  hint: string;
};

type RoundMode = "hear-letter" | "match-audio";
type Round = {
  mode: RoundMode;
  answer: LetterCue;
  options: LetterCue[];
};

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

const TOTAL = 6;

function buildRound(previous?: string, index = 0): Round {
  const pool = SPECIAL_CUES.filter((cue) => cue.cyr !== previous);
  const answer = pool[index % pool.length] ?? SPECIAL_CUES[0];
  const distractors = SPECIAL_CUES.filter((cue) => cue.cyr !== answer.cyr);
  const options = [answer, distractors[index % distractors.length], distractors[(index + 3) % distractors.length]];
  const offset = index % options.length;
  return {
    mode: index % 2 === 0 ? "hear-letter" : "match-audio",
    answer,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  };
}

function playCue(cue: LetterCue) {
  playLetterPronunciation(cue.cyr, cue.example);
}

export default function SoundItOut() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => buildRound(undefined, 0));
  const [picked, setPicked] = useState<string | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"guess" | "right" | "wrong" | "done">("guess");
  const [burst, setBurst] = useState(false);
  // Telemetry: when this round was first shown, and how often the clip replayed.
  const shownAt = useRef(Date.now());
  const audioPlays = useRef(0);

  const prompt = useMemo(() => {
    if (round.mode === "hear-letter") return "Listen, which Kazakh letter makes this sound?";
    return `Which sound matches ${round.answer.cyr}?`;
  }, [round]);

  const finish = useCallback((finalScore: number) => {
    setPhase("done");
    playWin();
    store.recordGameRun({
      game: "sound-it-out",
      score: finalScore * 12,
      vocabSeen: [],
      vocabCorrect: [],
    });
  }, []);

  useEffect(() => {
    if (round.mode !== "hear-letter" || phase !== "guess") return;
    const id = window.setTimeout(() => playCue(round.answer), 250);
    return () => window.clearTimeout(id);
  }, [phase, round]);

  function check() {
    if (!picked || phase !== "guess") return;
    const correct = picked === round.answer.cyr;
    store.answerLetter(round.answer.cyr, correct);
    logAnswer({
      gameSlug: "sound-it-out",
      itemId: letterItemId(round.answer.cyr),
      promptKind: round.mode === "hear-letter" ? "audio" : "text",
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
    if (roundIndex + 1 >= TOTAL) {
      finish(score);
      return;
    }
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setRound(buildRound(round.answer.cyr, nextIndex));
    setPicked(null);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  function replay() {
    setRoundIndex(0);
    setRound(buildRound(undefined, 0));
    setPicked(null);
    setLives(3);
    setScore(0);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  return (
    <GameShell
      title="Sound It Out"
      kk="Дыбыс"
      right={<Scoreboard label="♥" value={`${lives}`} />}
    >
      {burst && <Confetti count={45} />}

      {phase === "done" ? (
        <div className="mx-auto max-w-xl rounded-2xl bg-steppe p-7 text-center text-warm shadow-xl">
          <div className="text-3xl font-black text-gold">Round complete!</div>
          <p className="mt-2 text-lg font-bold">{score} / {TOTAL} correct · +{score * 12} points</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="gold" size="lg" onClick={replay}>Replay</Button>
            <Button variant="outline" size="lg" onClick={() => history.back()}>Back</Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-felt">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${(roundIndex / TOTAL) * 100}%` }}
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-terra">
              Focus letters · Ә Ғ Қ Ң Ө Ұ Ү Һ І
            </p>
            <h1 className="mt-2 text-2xl font-black text-steppe sm:text-3xl">{prompt}</h1>
          </div>

          {round.mode === "hear-letter" ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  audioPlays.current += 1;
                  playCue(round.answer);
                }}
                aria-label={`Play pronunciation for ${round.answer.cyr}`}
                className="grid h-32 w-32 place-items-center rounded-full bg-steppe text-gold shadow-xl shadow-steppe/20 transition active:scale-95"
              >
                <Volume2 size={56} />
              </button>
              <span className="text-sm font-black text-wolf">Tap to hear again</span>
            </div>
          ) : (
            <div className="grid h-32 w-32 place-items-center rounded-[2rem] bg-steppe text-7xl font-black text-gold shadow-xl shadow-steppe/20">
              {round.answer.cyr}
            </div>
          )}

          <div className="grid w-full gap-3 sm:grid-cols-3">
            {round.options.map((option, index) => {
              const selected = picked === option.cyr;
              const correct = option.cyr === round.answer.cyr;
              const reveal = phase !== "guess";
              return (
                <button
                  key={option.cyr}
                  onClick={() => {
                    // After the reveal, taps just replay the option's sound.
                    if (phase !== "guess") {
                      playCue(option);
                      return;
                    }
                    setPicked(option.cyr);
                    if (round.mode === "match-audio") playCue(option);
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
                  {round.mode === "hear-letter" ? (
                    <>
                      <div className="text-6xl font-black text-steppe">{option.cyr}</div>
                      {reveal && <div className="mt-2 text-sm font-black text-wolf">{option.latin} · {option.example}</div>}
                    </>
                  ) : (
                    <>
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-steppe text-gold">
                        <Volume2 size={28} />
                      </div>
                      <div className="mt-3 text-lg font-black text-steppe">Sound {index + 1}</div>
                      {reveal && <div className="mt-1 text-sm font-bold text-wolf">{option.example} · {option.exampleEn}</div>}
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
                {roundIndex + 1 >= TOTAL ? "See results" : "Next"}
              </Button>
            )}
          </div>

          <div className="rounded-2xl bg-felt px-4 py-3 text-center text-sm font-bold text-steppe-700">
            {phase === "wrong"
              ? `The answer was ${round.answer.cyr}, as in ${round.answer.example} (${round.answer.exampleEn}).`
              : `${round.answer.hint} · example word appears after you check.`}
          </div>
        </div>
      )}
    </GameShell>
  );
}
