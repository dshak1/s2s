"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameShell } from "@/components/game/game-shell";
import { playCorrect, playWrong, playWin } from "@/lib/audio";
import { learnerStore, weakConcepts, strongConcepts, type ExperimentVariant } from "@/lib/learner-state";
import { conceptLabel, selectQuizQuestions, type QuizQuestion } from "@/content/adaptive-quiz";
import { store } from "@/lib/store";

const QUIZ_LENGTH = 5;

type AnswerRecord = {
  questionId: string;
  conceptId: string;
  selected: string;
  correct: boolean;
};

export default function AdaptiveQuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [done, setDone] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const variantRef = useRef<ExperimentVariant | undefined>(undefined);
  const startedRef = useRef(false);

  function startQuiz(review: boolean) {
    const learner = learnerStore.get();
    setQuestions(selectQuizQuestions(learner, QUIZ_LENGTH, review));
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setDone(false);
    setReviewOnly(review);
    const variant = variantRef.current;
    learnerStore.recordEvent({ name: "quiz_started", variant, data: { review } });
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    variantRef.current = learnerStore.getExperimentVariant();
    const review = new URLSearchParams(window.location.search).get("mode") === "review";
    startQuiz(review);
  }, []);

  const question = questions[index];
  const score = answers.filter((answer) => answer.correct).length;
  const progress = questions.length ? ((index + (checked ? 1 : 0)) / questions.length) * 100 : 0;

  const sessionWeak = useMemo(() => {
    const missed = answers.filter((answer) => !answer.correct).map((answer) => answer.conceptId);
    return [...new Set(missed)].map(conceptLabel);
  }, [answers]);

  const sessionStrong = useMemo(() => {
    const grouped = new Map<string, boolean[]>();
    for (const answer of answers) grouped.set(answer.conceptId, [...(grouped.get(answer.conceptId) ?? []), answer.correct]);
    return [...grouped.entries()]
      .filter(([, values]) => values.every(Boolean))
      .map(([id]) => conceptLabel(id));
  }, [answers]);

  function checkAnswer() {
    if (!question || !selected || checked) return;
    const correct = selected === question.answer;
    const record: AnswerRecord = {
      questionId: question.id,
      conceptId: question.conceptId,
      selected,
      correct,
    };
    setAnswers((current) => [...current, record]);
    learnerStore.recordAnswer(
      question.conceptId,
      correct,
      correct ? undefined : `${selected} → ${question.answer}`,
    );
    setChecked(true);
    if (correct) playCorrect();
    else playWrong();
  }

  function nextQuestion() {
    if (!checked) return;
    if (index + 1 < questions.length) {
      setIndex((value) => value + 1);
      setSelected(null);
      setChecked(false);
      return;
    }

    const finalAnswers = answers;
    const finalScore = finalAnswers.filter((answer) => answer.correct).length;
    const concepts = [...new Set(finalAnswers.map((answer) => answer.conceptId))];
    const missedConcepts = [...new Set(finalAnswers.filter((answer) => !answer.correct).map((answer) => answer.conceptId))];
    const learner = learnerStore.get();
    learnerStore.recordQuiz({
      score: finalScore,
      total: questions.length,
      difficulty: learner.difficulty,
      concepts,
      missedConcepts,
    });
    learnerStore.recordEvent({
      name: "quiz_completed",
      variant: variantRef.current,
      data: { score: finalScore, total: questions.length, review: reviewOnly },
    });
    store.recordGameRun({
      game: "adaptive-quiz",
      score: finalScore * 20,
      vocabSeen: concepts,
      vocabCorrect: [...new Set(finalAnswers.filter((answer) => answer.correct).map((answer) => answer.conceptId))],
    });
    playWin();
    setDone(true);
  }

  if (!questions.length) {
    return (
      <GameShell title="Adaptive Quiz" kk="Білім сынағы">
        <div className="mx-auto max-w-xl rounded-3xl border-4 border-felt bg-white p-8 text-center font-black text-steppe">
          Building a quiz for you…
        </div>
      </GameShell>
    );
  }

  if (done) {
    const currentLearner = learnerStore.get();
    const weak = sessionWeak.length ? sessionWeak : weakConcepts(currentLearner).map(conceptLabel);
    const strong = sessionStrong.length ? sessionStrong : strongConcepts(currentLearner).map(conceptLabel);
    return (
      <GameShell title="Adaptive Quiz" kk="Білім сынағы">
        <div className="mx-auto max-w-2xl rounded-[2rem] border-4 border-steppe bg-white p-6 shadow-[8px_9px_0_0_#244e84] sm:p-8">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold text-steppe">
              <Sparkles size={32} />
            </div>
            <h1 className="mt-4 text-4xl font-black text-steppe">{score} / {questions.length}</h1>
            <p className="mt-2 font-bold text-steppe/70">
              {score === questions.length ? "Perfect round." : score >= 4 ? "Strong round." : "Good practice — your next round will target the tricky parts."}
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl bg-[#e9f7e7] p-5">
              <h2 className="font-black text-steppe">Strong areas</h2>
              <p className="mt-2 text-sm font-bold text-steppe/75">
                {strong.length ? strong.join(", ") : "Still collecting enough evidence to call something mastered."}
              </p>
            </section>
            <section className="rounded-2xl bg-[#fff0e7] p-5">
              <h2 className="font-black text-steppe">Review next</h2>
              <p className="mt-2 text-sm font-bold text-steppe/75">
                {weak.length ? weak.join(", ") : "No weak area this round — the next quiz can step up slightly."}
              </p>
            </section>
          </div>

          <p className="mt-5 rounded-2xl bg-felt px-4 py-3 text-sm font-bold text-steppe/75">
            Next difficulty: {learnerStore.get().difficulty.toFixed(1)} / 5. Missed concepts are scheduled for spaced review instead of being repeated every round.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" onClick={() => startQuiz(false)}>
              <RotateCcw size={20} /> Another quiz
            </Button>
            {weak.length > 0 && (
              <Button variant="primary" size="lg" onClick={() => startQuiz(true)}>
                Review mistakes
              </Button>
            )}
            <Link href="/" className="inline-flex items-center justify-center rounded-2xl border-2 border-steppe bg-white px-6 py-4 text-lg font-extrabold text-steppe">
              Home
            </Link>
          </div>
        </div>
      </GameShell>
    );
  }

  if (!question) return null;
  const isCorrect = checked && selected === question.answer;

  return (
    <GameShell title="Adaptive Quiz" kk="Білім сынағы">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-steppe/70 hover:text-steppe">
            <ArrowLeft size={18} /> Home
          </Link>
          <div className="text-sm font-black text-steppe/65">Question {index + 1} of {questions.length}</div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-felt">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
        </div>

        <section className="mt-5 rounded-[2rem] border-4 border-steppe bg-white p-5 shadow-[7px_8px_0_0_#244e84] sm:p-7">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-terra">
            {question.topic} · level {question.difficulty}
          </div>
          <h1 className="mt-3 text-2xl font-black leading-tight text-steppe sm:text-3xl">{question.prompt}</h1>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {question.options.map((option) => {
              const picked = selected === option;
              const correct = option === question.answer;
              const revealClass = checked
                ? correct
                  ? "border-green-700 bg-[#e9f7e7]"
                  : picked
                    ? "border-terra bg-[#fff0e7]"
                    : "border-felt bg-white"
                : picked
                  ? "border-steppe bg-[#eef5ff]"
                  : "border-felt bg-white hover:border-steppe/40";
              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => setSelected(option)}
                  className={`min-h-24 rounded-2xl border-4 p-4 text-left text-base font-extrabold text-steppe transition active:translate-y-0.5 ${revealClass}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {!checked ? (
            <div className="mt-6 text-center">
              <Button variant="gold" size="lg" disabled={!selected} onClick={checkAnswer}>Check answer</Button>
            </div>
          ) : (
            <div className={`mt-6 rounded-2xl border-2 p-5 ${isCorrect ? "border-green-700 bg-[#e9f7e7]" : "border-terra bg-[#fff0e7]"}`}>
              <div className="flex items-center gap-2 text-lg font-black text-steppe">
                {isCorrect ? <CheckCircle2 className="text-green-700" /> : <XCircle className="text-terra" />}
                {isCorrect ? "Correct" : `Not quite — the answer is “${question.answer}”.`}
              </div>
              <p className="mt-3 font-bold leading-7 text-steppe/80">{question.explanation}</p>
              {!isCorrect && selected && (
                <p className="mt-3 rounded-xl bg-white/80 px-4 py-3 text-sm font-bold leading-6 text-steppe/75">
                  Why “{selected}” is wrong: {question.wrongExplanations[selected] ?? "It does not match the grammar or meaning required by the prompt."}
                </p>
              )}
              {question.note && <p className="mt-3 text-sm font-black text-steppe">Quick note: {question.note}</p>}
              <div className="mt-5 text-center">
                <Button variant={isCorrect ? "primary" : "gold"} size="lg" onClick={nextQuestion}>
                  {index + 1 === questions.length ? "See results" : "Next question"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </GameShell>
  );
}
