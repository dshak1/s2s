"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { GREETINGS, type Greeting } from "@/content/greetings";
import { playClip, playCorrect, playWrong, playWin } from "@/lib/audio";
import { store } from "@/lib/store";

type RoundMode = "hear-phrase" | "match-audio";
type Round = {
  mode: RoundMode;
  answer: Greeting;
  options: Greeting[];
};

const TOTAL = 6;

function speak(greeting: Greeting) {
  playClip(greeting.audio, greeting.kk);
}

function buildRound(previous?: string, index = 0): Round {
  const pool = GREETINGS.filter((g) => g.kk !== previous);
  const answer = pool[index % pool.length] ?? GREETINGS[0];
  const distractors = GREETINGS.filter((g) => g.kk !== answer.kk);
  const options = [answer, distractors[index % distractors.length], distractors[(index + 3) % distractors.length]];
  const offset = index % options.length;
  return {
    mode: index % 2 === 0 ? "hear-phrase" : "match-audio",
    answer,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  };
}

export default function GreetingsQuiz() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => buildRound(undefined, 0));
  const [picked, setPicked] = useState<string | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"guess" | "right" | "wrong" | "done">("guess");
  const [burst, setBurst] = useState(false);

  const prompt = useMemo(() => {
    if (round.mode === "hear-phrase") return "Listen — which Kazakh greeting is this?";
    return `Which sound says “${round.answer.kk}”?`;
  }, [round]);

  const finish = useCallback((finalScore: number) => {
    setPhase("done");
    playWin();
    store.recordGameRun({
      game: "greetings-quiz",
      score: finalScore * 12,
      vocabSeen: [],
      vocabCorrect: [],
    });
  }, []);

  useEffect(() => {
    if (round.mode !== "hear-phrase" || phase !== "guess") return;
    const id = window.setTimeout(() => speak(round.answer), 250);
    return () => window.clearTimeout(id);
  }, [phase, round]);

  function check() {
    if (!picked || phase !== "guess") return;
    const correct = picked === round.answer.kk;
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
    setRound(buildRound(round.answer.kk, nextIndex));
    setPicked(null);
    setPhase("guess");
  }

  function replay() {
    setRoundIndex(0);
    setRound(buildRound(undefined, 0));
    setPicked(null);
    setLives(3);
    setScore(0);
    setPhase("guess");
  }

  return (
    <GameShell
      title="Greetings Quiz"
      kk="Сәлемдесу"
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
              Everyday Kazakh greetings
            </p>
            <h1 className="mt-2 text-2xl font-black text-steppe sm:text-3xl">{prompt}</h1>
          </div>

          {round.mode === "hear-phrase" ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => speak(round.answer)}
                aria-label={`Play greeting ${round.answer.kk}`}
                className="grid h-32 w-32 place-items-center rounded-full bg-steppe text-gold shadow-xl shadow-steppe/20 transition active:scale-95"
              >
                <Volume2 size={56} />
              </button>
              <span className="text-sm font-black text-wolf">Tap to hear again</span>
            </div>
          ) : (
            <div className="grid min-h-32 w-full max-w-md place-items-center rounded-[2rem] bg-steppe px-6 py-5 text-center text-4xl font-black text-gold shadow-xl shadow-steppe/20 sm:text-5xl">
              {round.answer.kk}
            </div>
          )}

          <div className="grid w-full gap-3 sm:grid-cols-3">
            {round.options.map((option, index) => {
              const selected = picked === option.kk;
              const correct = option.kk === round.answer.kk;
              const reveal = phase !== "guess";
              return (
                <button
                  key={option.kk}
                  disabled={phase !== "guess"}
                  onClick={() => {
                    setPicked(option.kk);
                    if (round.mode === "match-audio") speak(option);
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
                  {round.mode === "hear-phrase" ? (
                    <>
                      <div className="text-2xl font-black text-steppe sm:text-3xl">{option.kk}</div>
                      {reveal && <div className="mt-2 text-sm font-black text-wolf">{option.latin} · {option.en}</div>}
                    </>
                  ) : (
                    <>
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-steppe text-gold">
                        <Volume2 size={28} />
                      </div>
                      <div className="mt-3 text-lg font-black text-steppe">Sound {index + 1}</div>
                      {reveal && <div className="mt-1 text-sm font-bold text-wolf">{option.kk} · {option.en}</div>}
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
              ? `The answer was “${round.answer.kk}” — ${round.answer.en}.`
              : `${round.answer.latin} · meaning appears after you check.`}
          </div>
        </div>
      )}
    </GameShell>
  );
}
