"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, Lightbulb, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/store";
import {
  learnerStore,
  learnerContextSummary,
  useLearnerState,
  weakConcepts,
  type ExperimentVariant,
} from "@/lib/learner-state";
import { selectDailyFact } from "@/content/daily-facts";
import { conceptLabel } from "@/content/adaptive-quiz";

export function DynamicLearningHome() {
  const profile = useProfile();
  const learner = useLearnerState();
  const [variant, setVariant] = useState<ExperimentVariant>("B");
  const fact = useMemo(() => selectDailyFact(learner), [learner]);
  const weak = weakConcepts(learner, 1)[0];

  useEffect(() => {
    const assigned = learnerStore.getExperimentVariant();
    setVariant(assigned);
    learnerStore.recordEvent({ name: "home_variant_exposed", variant: assigned });
  }, []);

  const name = profile.displayName === "Demo Kid" ? "learner" : profile.displayName;
  const suggestion = weak
    ? `You’ve been working on ${conceptLabel(weak)}. Want a quick review?`
    : "Start with five questions and we’ll learn what to practice next.";

  return (
    <section className="mt-8 max-w-2xl rounded-[2rem] border-4 border-steppe/15 bg-white/90 p-5 text-left shadow-[6px_7px_0_0_rgba(36,78,132,.12)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terra">Welcome back, {name}</p>
          <h2 className="mt-1 text-2xl font-black text-steppe">What would you like to do?</h2>
        </div>
        <span className="rounded-full bg-felt px-3 py-1 text-xs font-black text-steppe/70" title="Learning-home experiment assignment">
          learning flow {variant}
        </span>
      </div>

      {variant === "A" && (
        <div className="mt-5 rounded-2xl bg-[#fff3cf] p-4">
          <div className="font-black text-steppe">No setup. Just start.</div>
          <p className="mt-1 text-sm font-bold text-steppe/70">A five-question quiz adapts as you answer.</p>
          <TrackedLink href="/quiz" variant={variant} event="home_quiz_clicked" className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 font-black text-steppe shadow-[3px_4px_0_0_#b8960a]">
            <Brain size={19} /> Take a quiz
          </TrackedLink>
        </div>
      )}

      {variant === "C" && (
        <div className="mt-5 rounded-2xl bg-[#e9f7e7] p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="mt-0.5 shrink-0 text-steppe" size={21} />
            <div>
              <div className="font-black text-steppe">Personalized suggestion</div>
              <p className="mt-1 text-sm font-bold leading-6 text-steppe/75">{suggestion}</p>
              <TrackedLink href={weak ? "/quiz?mode=review" : "/quiz"} variant={variant} event="home_personalized_clicked" className="mt-3 inline-flex rounded-2xl bg-steppe px-5 py-3 font-black text-white shadow-[3px_4px_0_0_#122e57]">
                {weak ? "3-minute review" : "Start learning"}
              </TrackedLink>
            </div>
          </div>
        </div>
      )}

      <div className={`mt-5 rounded-2xl border-2 border-gold/60 bg-[#fffdf5] p-4 ${variant === "D" ? "ring-2 ring-gold/30" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-steppe">
            <Lightbulb size={20} />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.15em] text-terra">Fact of the day</div>
            <h3 className="mt-1 font-black text-steppe">{fact.title}</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-steppe/75">{fact.teaser}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TrackedLink href={`/facts/${fact.slug}`} variant={variant} event="fact_opened" className="rounded-xl border-2 border-steppe px-3 py-2 text-sm font-black text-steppe">
                Learn more
              </TrackedLink>
              {variant === "D" && (
                <TrackedLink href="/quiz" variant={variant} event="fact_quiz_clicked" className="rounded-xl bg-gold px-3 py-2 text-sm font-black text-steppe">
                  Try a related question
                </TrackedLink>
              )}
            </div>
          </div>
        </div>
      </div>

      {variant === "B" && (
        <p className="mt-4 text-sm font-bold text-steppe/70">Pick whatever feels interesting — the app will remember what helps and what you skip.</p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <TrackedLink href="/quiz" variant={variant} event="home_quiz_clicked" className="flex items-center gap-3 rounded-2xl bg-steppe px-4 py-3 font-black text-white shadow-[3px_4px_0_0_#122e57]">
          <Brain size={20} /> Take a quiz
        </TrackedLink>
        <TrackedLink href="/quiz?mode=review" variant={variant} event="home_review_clicked" className="flex items-center gap-3 rounded-2xl border-2 border-steppe bg-white px-4 py-3 font-black text-steppe">
          <RefreshCw size={20} /> Review mistakes
        </TrackedLink>
        <TrackedLink href="/play/learn" variant={variant} event="home_learn_clicked" className="flex items-center gap-3 rounded-2xl border-2 border-steppe bg-white px-4 py-3 font-black text-steppe">
          <BookOpen size={20} /> Learn 5 new words
        </TrackedLink>
        <TrackedLink href="/play" variant={variant} event="home_conversation_clicked" className="flex items-center gap-3 rounded-2xl border-2 border-steppe bg-white px-4 py-3 font-black text-steppe">
          <MessageCircle size={20} /> Practice conversation
        </TrackedLink>
      </div>

      <details className="mt-4 rounded-xl bg-felt/70 px-4 py-3 text-xs font-bold text-steppe/70">
        <summary className="cursor-pointer font-black text-steppe">Why this was suggested</summary>
        <p className="mt-2 leading-5">{learnerContextSummary(learner)}</p>
      </details>
    </section>
  );
}

function TrackedLink({
  href,
  variant,
  event,
  className,
  children,
}: {
  href: string;
  variant: ExperimentVariant;
  event: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => learnerStore.recordEvent({ name: event, variant, data: { href } })}
    >
      {children}
    </Link>
  );
}
