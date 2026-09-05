"use client";

import { useSyncExternalStore } from "react";

export type ConceptState = {
  attempts: number;
  correct: number;
  mastery: number;
  lastSeen: number | null;
  nextReview: number | null;
  relatedErrors: string[];
};

export type QuizHistoryItem = {
  id: string;
  at: number;
  score: number;
  total: number;
  difficulty: number;
  concepts: string[];
  missedConcepts: string[];
};

export type LearningEvent = {
  name: string;
  at: number;
  variant?: ExperimentVariant;
  data?: Record<string, string | number | boolean | null>;
};

export type ExperimentVariant = "A" | "B" | "C" | "D";

export type LearnerState = {
  concepts: Record<string, ConceptState>;
  quizHistory: QuizHistoryItem[];
  interests: string[];
  preferredExerciseTypes: string[];
  skippedTopics: Record<string, number>;
  recentlyReviewed: string[];
  difficulty: number;
  lastActivityAt: number | null;
  experimentAssignments: Record<string, ExperimentVariant>;
  events: LearningEvent[];
};

const KEY = "s2s_learner_state_v1";
const DAY = 24 * 60 * 60 * 1000;
const EMPTY: LearnerState = {
  concepts: {},
  quizHistory: [],
  interests: [],
  preferredExerciseTypes: [],
  skippedTopics: {},
  recentlyReviewed: [],
  difficulty: 1,
  lastActivityAt: null,
  experimentAssignments: {},
  events: [],
};

let state: LearnerState | null = null;
const listeners = new Set<() => void>();

function fresh(): LearnerState {
  return JSON.parse(JSON.stringify(EMPTY)) as LearnerState;
}

function load(): LearnerState {
  if (state) return state;
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<LearnerState> | null;
    state = parsed
      ? {
          ...fresh(),
          ...parsed,
          concepts: parsed.concepts ?? {},
          quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
          interests: Array.isArray(parsed.interests) ? parsed.interests : [],
          preferredExerciseTypes: Array.isArray(parsed.preferredExerciseTypes) ? parsed.preferredExerciseTypes : [],
          skippedTopics: parsed.skippedTopics ?? {},
          recentlyReviewed: Array.isArray(parsed.recentlyReviewed) ? parsed.recentlyReviewed : [],
          experimentAssignments: parsed.experimentAssignments ?? {},
          events: Array.isArray(parsed.events) ? parsed.events : [],
        }
      : fresh();
  } catch {
    state = fresh();
  }
  return state;
}

function persist() {
  if (!state || typeof window === "undefined") return;
  state = { ...state };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

function update(fn: (draft: LearnerState) => void) {
  const draft = load();
  fn(draft);
  draft.lastActivityAt = Date.now();
  persist();
}

function conceptOrDefault(id: string): ConceptState {
  return load().concepts[id] ?? {
    attempts: 0,
    correct: 0,
    mastery: 0,
    lastSeen: null,
    nextReview: null,
    relatedErrors: [],
  };
}

function reviewDelay(mastery: number, correct: boolean) {
  if (!correct) return DAY;
  if (mastery >= 0.85) return 21 * DAY;
  if (mastery >= 0.7) return 7 * DAY;
  return 3 * DAY;
}

export const learnerStore = {
  get: load,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  recordAnswer(conceptId: string, correct: boolean, errorTag?: string) {
    update((draft) => {
      const old = draft.concepts[conceptId] ?? conceptOrDefault(conceptId);
      const attempts = old.attempts + 1;
      const correctCount = old.correct + (correct ? 1 : 0);
      // Beta(1,1) prior prevents a single lucky answer from becoming "mastered".
      const mastery = (correctCount + 1) / (attempts + 2);
      const now = Date.now();
      draft.concepts[conceptId] = {
        attempts,
        correct: correctCount,
        mastery,
        lastSeen: now,
        nextReview: now + reviewDelay(mastery, correct),
        relatedErrors: errorTag && !correct
          ? [errorTag, ...old.relatedErrors.filter((tag) => tag !== errorTag)].slice(0, 5)
          : old.relatedErrors,
      };
      draft.recentlyReviewed = [conceptId, ...draft.recentlyReviewed.filter((id) => id !== conceptId)].slice(0, 12);
    });
  },

  recordQuiz(result: Omit<QuizHistoryItem, "id" | "at">) {
    update((draft) => {
      draft.quizHistory.unshift({ ...result, id: crypto.randomUUID(), at: Date.now() });
      draft.quizHistory = draft.quizHistory.slice(0, 50);
      const accuracy = result.total ? result.score / result.total : 0;
      if (accuracy >= 0.8) draft.difficulty = Math.min(5, draft.difficulty + 0.25);
      else if (accuracy < 0.5) draft.difficulty = Math.max(1, draft.difficulty - 0.25);
    });
  },

  setInterest(topic: string, enabled = true) {
    update((draft) => {
      draft.interests = enabled
        ? [...new Set([...draft.interests, topic])]
        : draft.interests.filter((item) => item !== topic);
    });
  },

  recordSkip(topic: string) {
    update((draft) => {
      draft.skippedTopics[topic] = (draft.skippedTopics[topic] ?? 0) + 1;
    });
  },

  recordEvent(event: Omit<LearningEvent, "at">) {
    update((draft) => {
      draft.events.unshift({ ...event, at: Date.now() });
      draft.events = draft.events.slice(0, 500);
    });
  },

  getExperimentVariant(experiment = "learning-home-v1"): ExperimentVariant {
    const current = load().experimentAssignments[experiment];
    if (current) return current;
    const variants: ExperimentVariant[] = ["A", "B", "C", "D"];
    const variant = variants[Math.floor(Math.random() * variants.length)] ?? "B";
    update((draft) => {
      draft.experimentAssignments[experiment] = variant;
    });
    return variant;
  },
};

export function useLearnerState(): LearnerState {
  return useSyncExternalStore(learnerStore.subscribe, learnerStore.get, () => EMPTY);
}

export function weakConcepts(input: LearnerState, limit = 3): string[] {
  return Object.entries(input.concepts)
    .filter(([, value]) => value.attempts > 0)
    .sort((a, b) => a[1].mastery - b[1].mastery || (a[1].lastSeen ?? 0) - (b[1].lastSeen ?? 0))
    .slice(0, limit)
    .map(([id]) => id);
}

export function strongConcepts(input: LearnerState, limit = 3): string[] {
  return Object.entries(input.concepts)
    .filter(([, value]) => value.attempts >= 2)
    .sort((a, b) => b[1].mastery - a[1].mastery)
    .slice(0, limit)
    .map(([id]) => id);
}

export function dueForReview(input: LearnerState, now = Date.now()): string[] {
  return Object.entries(input.concepts)
    .filter(([, value]) => value.nextReview !== null && value.nextReview <= now)
    .sort((a, b) => (a[1].nextReview ?? 0) - (b[1].nextReview ?? 0))
    .map(([id]) => id);
}

export function shouldReviewConcept(input: LearnerState, conceptId: string, now = Date.now()): boolean {
  const concept = input.concepts[conceptId];
  if (!concept || concept.attempts === 0) return true;
  if (concept.nextReview !== null && concept.nextReview <= now) return true;
  return concept.mastery < 0.85;
}

export function learnerContextSummary(input: LearnerState): string {
  const weak = weakConcepts(input, 4);
  const strong = strongConcepts(input, 4);
  const unseenPastTense = !input.concepts["grammar.past-tense"];
  const parts = [
    `Learner difficulty is ${input.difficulty.toFixed(1)} / 5.`,
    strong.length ? `Strong on: ${strong.join(", ")}.` : "No concepts are firmly mastered yet.",
    weak.length ? `Prioritize review of: ${weak.join(", ")}.` : "No repeated weak area has emerged yet.",
    unseenPastTense ? "Past tense has not been studied; avoid relying on it." : "Past tense has been introduced.",
    input.interests.length ? `Interests: ${input.interests.join(", ")}.` : "No explicit interests recorded yet.",
    "Avoid over-repeating mastered concepts unless they are due for spaced review.",
  ];
  return parts.join(" ");
}

export function summarizeExperimentEvents(events: LearningEvent[]) {
  const variants: ExperimentVariant[] = ["A", "B", "C", "D"];
  return variants.map((variant) => {
    const rows = events.filter((event) => event.variant === variant);
    const exposures = rows.filter((event) => event.name === "home_variant_exposed").length;
    const quizStarts = rows.filter((event) => event.name === "quiz_started").length;
    const quizCompletes = rows.filter((event) => event.name === "quiz_completed").length;
    return {
      variant,
      exposures,
      quizStarts,
      quizCompletes,
      startRate: exposures ? quizStarts / exposures : 0,
      completionRate: quizStarts ? quizCompletes / quizStarts : 0,
    };
  });
}
