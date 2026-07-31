"use client";

// Client-side profile store backed by localStorage. This is the working data
// layer for the demo so it runs with zero backend. When Supabase env vars are
// present it can be synced server-side later (see /supabase/migrations + the
// Supabase helpers) — the schema mirrors this shape 1:1.
import { useSyncExternalStore } from "react";
import { syncJoin, syncGameRun, syncArtifact, syncHomework } from "@/lib/supabase/sync";
import type { BadgeId } from "@/content/badges";
import { BADGES } from "@/content/badges";
import { toastBus } from "@/lib/toast";
import type { RegionId } from "@/content/regions";
import { REGIONS } from "@/content/regions";
import { JOURNEY, defaultWeekCodes, normalizeCode } from "@/content/journey";

const BADGE_IDS = BADGES.map((b) => b.id);

export type Artifact = {
  id: string;
  kind: "tanba" | "canva" | "story" | "background" | "homework";
  dataUrl: string;
  createdAt: number;
  // Optional labels — used by homework submissions ("what is it", date, title).
  meta?: { title?: string; date?: string; note?: string };
};

export type GameRun = {
  id: string;
  game: string;
  score: number;
  vocabSeen: string[];
  vocabCorrect: string[];
  at: number;
};

export type LetterStat = { level: number; correct: number };

export type Profile = {
  id: string;
  displayName: string;
  sessionCode: string | null;
  table: string | null;
  xp: number;
  streakWeeks: number;
  avatarArtifactId: string | null;
  unlockedWeeks: number;
  weeklyCodes: Record<RegionId, string>;
  regionProgress: RegionId[];
  vocabCorrect: Record<string, number>; // slug -> times correct
  letterStats: Record<string, LetterStat>; // cyr letter -> Leitner
  badges: BadgeId[];
  artifacts: Artifact[];
  gameRuns: GameRun[];
  pawPrints: string[]; // clue ids collected this session
  gameBackgrounds: Record<string, string>; // game slug -> uploaded background dataUrl
  homeCoverId: string | null; // KidCover id chosen as the home-page background
};

const KEY = "s2s_profile_v1";

function freshProfile(): Profile {
  return {
    id: crypto.randomUUID(),
    displayName: "Demo Kid",
    sessionCode: null,
    table: null,
    xp: 0,
    streakWeeks: 1,
    avatarArtifactId: null,
    unlockedWeeks: 1,
    weeklyCodes: defaultWeekCodes(),
    regionProgress: ["almaty"], // first region starts unlocked
    vocabCorrect: {},
    letterStats: {},
    badges: [],
    artifacts: [],
    gameRuns: [],
    pawPrints: [],
    gameBackgrounds: {},
    homeCoverId: null,
  };
}

const SERVER_PROFILE: Profile = {
  ...freshProfile(),
  id: "server-profile",
};

let state: Profile | null = null;
const listeners = new Set<() => void>();

function load(): Profile {
  if (state) return state;
  if (typeof window === "undefined") return SERVER_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    state = normalizeProfile(raw ? { ...freshProfile(), ...JSON.parse(raw) } : freshProfile());
  } catch {
    state = freshProfile();
  }
  return state!;
}

function normalizeProfile(profile: Profile): Profile {
  const fallbackCodes = defaultWeekCodes();
  const unlockedWeeks = Number.isFinite(profile.unlockedWeeks)
    ? Math.min(JOURNEY.length, Math.max(1, Math.floor(profile.unlockedWeeks)))
    : 1;
  return {
    ...profile,
    unlockedWeeks,
    weeklyCodes: { ...fallbackCodes, ...(profile.weeklyCodes ?? {}) },
    regionProgress: profile.regionProgress?.length ? profile.regionProgress : ["almaty"],
    gameBackgrounds: profile.gameBackgrounds ?? {},
    homeCoverId: profile.homeCoverId ?? null,
  };
}

function persist() {
  if (typeof window !== "undefined" && state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function update(fn: (p: Profile) => void) {
  const p = load();
  fn(p);
  persist();
}

export const store = {
  get: load,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  joinSession(code: string, name: string, table: string) {
    update((p) => {
      p.sessionCode = code.toUpperCase();
      p.displayName = name || p.displayName;
      p.table = table;
      p.pawPrints = [];
      award(p, "aul_member");
    });
    syncJoin(load(), code, table).catch(() => {});
  },

  setDisplayName(name: string) {
    update((p) => { p.displayName = name; });
  },

  addArtifact(kind: Artifact["kind"], dataUrl: string): string {
    const id = crypto.randomUUID();
    const artifact: Artifact = { id, kind, dataUrl, createdAt: Date.now() };
    update((p) => {
      p.artifacts.unshift(artifact);
      if (kind === "tanba") {
        p.avatarArtifactId = id;
        award(p, "tanba_artist");
        p.xp += 30;
      }
      if (kind === "story") {
        award(p, "storyteller");
        p.xp += 25;
      }
    });
    const p = load();
    syncArtifact(p.id, p.avatarArtifactId, artifact).catch(() => {});
    return id;
  },

  setAvatar(artifactId: string) {
    update((p) => { p.avatarArtifactId = artifactId; });
  },

  setHomeCover(coverId: string | null) {
    update((p) => { p.homeCoverId = coverId; });
  },

  // Homework submission: stored like any artifact (offline-first), plus a
  // best-effort sync to the homework_items table when Supabase is wired up.
  addHomework(dataUrl: string, meta: { title?: string; date?: string; note?: string }): string {
    const id = crypto.randomUUID();
    const artifact: Artifact = { id, kind: "homework", dataUrl, createdAt: Date.now(), meta };
    update((p) => {
      p.artifacts.unshift(artifact);
      p.xp += 20;
    });
    const p = load();
    syncHomework(p.id, p.displayName, artifact).catch(() => {});
    return id;
  },

  // Per-game custom background. Stores the dataUrl locally (so it renders offline)
  // and fires the same artifact sync used for avatars to back it up to Supabase.
  setGameBackground(slug: string, dataUrl: string) {
    const id = crypto.randomUUID();
    const artifact: Artifact = { id, kind: "background", dataUrl, createdAt: Date.now() };
    update((p) => {
      p.artifacts.unshift(artifact);
      p.gameBackgrounds[slug] = dataUrl;
    });
    const p = load();
    syncArtifact(p.id, p.avatarArtifactId, artifact).catch(() => {});
  },

  clearGameBackground(slug: string) {
    update((p) => { delete p.gameBackgrounds[slug]; });
  },

  setWeekCode(stopId: RegionId, code: string) {
    update((p) => {
      p.weeklyCodes[stopId] = normalizeCode(code) || defaultWeekCodes()[stopId];
    });
  },

  unlockWeekWithCode(code: string): { ok: boolean; message: string; stopName?: string } {
    const normalized = normalizeCode(code);
    const p = load();
    if (p.unlockedWeeks >= JOURNEY.length) {
      return { ok: true, message: "Whole Silk Road complete — replay any game for more points." };
    }
    const nextStop = JOURNEY[p.unlockedWeeks];
    const expected = normalizeCode(p.weeklyCodes[nextStop.id] ?? nextStop.defaultCode);
    if (!normalized || normalized !== expected) {
      return { ok: false, message: "Ask your facilitator for today's code." };
    }
    update((profile) => {
      profile.unlockedWeeks = Math.min(JOURNEY.length, profile.unlockedWeeks + 1);
      if (!profile.regionProgress.includes(nextStop.id)) {
        profile.regionProgress.push(nextStop.id);
      }
      profile.xp += 50;
      award(profile, "explorer");
    });
    return { ok: true, message: `${nextStop.name} unlocked! +50 points`, stopName: nextStop.name };
  },

  unlockRegion(id: RegionId) {
    update((p) => {
      if (!p.regionProgress.includes(id)) {
        p.regionProgress.push(id);
        p.xp += 20;
        award(p, "explorer");
      }
    });
  },

  recordGameRun(run: Omit<GameRun, "id" | "at">) {
    const newRun: GameRun = { ...run, id: crypto.randomUUID(), at: Date.now() };
    update((p) => {
      p.gameRuns.unshift(newRun);
      p.gameRuns = p.gameRuns.slice(0, 20);
      for (const slug of run.vocabCorrect) {
        p.vocabCorrect[slug] = (p.vocabCorrect[slug] ?? 0) + 1;
      }
      p.xp += run.score;
      if (run.game === "sozdik-match") award(p, "first_match");
      if (run.game === "memory-match") award(p, "memory_master");
    });
    const p = load();
    syncGameRun(p.id, p.sessionCode, newRun).catch(() => {});
  },

  answerLetter(cyr: string, correct: boolean) {
    update((p) => {
      const s = p.letterStats[cyr] ?? { level: 0, correct: 0 };
      if (correct) {
        s.correct += 1;
        s.level = Math.min(5, s.level + 1);
        p.xp += 5;
      } else {
        s.level = Math.max(0, s.level - 1);
      }
      p.letterStats[cyr] = s;
      if (masteredLetterCount(p) >= 36) award(p, "first_yurt");
    });
  },

  catchWord(correct: boolean) {
    update((p) => {
      if (correct) p.xp += 5;
    });
  },

  awardWordCatcher() {
    update((p) => award(p, "word_catcher"));
  },

  addPawPrint(clueId: string) {
    update((p) => {
      if (!p.pawPrints.includes(clueId)) {
        p.pawPrints.push(clueId);
        p.xp += 10;
        if (p.pawPrints.length >= 8) award(p, "snow_tracker");
      }
    });
  },

  award(id: BadgeId) {
    update((p) => award(p, id));
  },

  reset() {
    state = freshProfile();
    persist();
  },

  // --- debug-only helpers (safe to call in prod; just XP/unlock manipulation) ---
  debugUnlockAll() {
    update((p) => {
      p.unlockedWeeks = JOURNEY.length;
      p.regionProgress = REGIONS.map((r) => r.id);
      p.xp = Math.max(p.xp, 9999);
      JOURNEY.forEach((stop) => {
        if (!p.regionProgress.includes(stop.id)) p.regionProgress.push(stop.id);
        award(p, "explorer");
      });
    });
  },

  debugSetWeek(week: number) {
    const target = Math.min(JOURNEY.length, Math.max(1, week));
    update((p) => {
      p.unlockedWeeks = target;
      p.regionProgress = REGIONS.slice(0, target).map((r) => r.id);
    });
  },

  debugAwardAllBadges() {
    update((p) => {
      BADGE_IDS.forEach((id) => award(p, id));
    });
  },

  debugMaxXp() {
    update((p) => { p.xp = 99999; });
  },
};

function award(p: Profile, id: BadgeId) {
  if (!p.badges.includes(id)) {
    p.badges.push(id);
    p.xp += 15;
    const badge = BADGES.find((b) => b.id === id);
    if (badge) toastBus.show({ title: `${badge.symbol} ${badge.name}`, body: badge.hint, duration: 4500 });
  }
}

export function masteredLetterCount(p: Profile): number {
  return Object.values(p.letterStats).filter((s) => s.level >= 3).length;
}

export function isVocabMastered(p: Profile, slug: string): boolean {
  return (p.vocabCorrect[slug] ?? 0) >= 2;
}

// React hook
export function useProfile(): Profile {
  return useSyncExternalStore(store.subscribe, store.get, () => SERVER_PROFILE);
}
