"use client";

// Client-side profile store backed by localStorage. This is the working data
// layer for the demo so it runs with zero backend. When Supabase env vars are
// present it can be synced server-side later (see /supabase/migrations + the
// Supabase helpers) — the schema mirrors this shape 1:1.
import { useSyncExternalStore } from "react";
import {
  syncJoin,
  syncGameRun,
  syncArtifact,
  syncHomework,
  syncDeleteArtifact,
  syncProfileState,
  fetchProfileArt,
  fetchProfileState,
  claimProfile,
} from "@/lib/supabase/sync";
import type { BadgeId } from "@/content/badges";
import { BADGES } from "@/content/badges";
import { toastBus } from "@/lib/toast";
import type { RegionId } from "@/content/regions";
import { REGIONS } from "@/content/regions";
import { JOURNEY, defaultWeekCodes, normalizeCode } from "@/content/journey";
import { weeklyChallengeSlug, WEEKLY_XP_MULTIPLIER } from "@/lib/weekly-challenge";
import type { BaseLanguage } from "@/lib/lang";

const BADGE_IDS = BADGES.map((b) => b.id);

export type Artifact = {
  id: string;
  kind: "tanba" | "canva" | "story" | "background" | "homework" | "runner";
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

// Per-game lifetime aggregate — plays/best/total score across every run of
// that game slug, not just the rolling 20-entry gameRuns log (which is
// shared across all games and would lose older per-game history fast).
export type GameStat = { plays: number; bestScore: number; totalScore: number };

export type CustomGame = {
  id: string;
  title: string;
  mechanic: "steppe-sprint";
  vocabSlugs: string[];
  backgroundArtifactId: string | null;
  backgroundTemplateId: string | null;
  createdAt: number;
};

export type Profile = {
  id: string;
  displayName: string;
  sessionCode: string | null;
  table: string | null;
  xp: number;
  streakWeeks: number;
  avatarArtifactId: string | null;
  /** say-and-shift's runner character, kept separate from the profile avatar. */
  runnerArtifactId: string | null;
  unlockedWeeks: number;
  weeklyCodes: Record<RegionId, string>;
  regionProgress: RegionId[];
  vocabCorrect: Record<string, number>; // slug -> times correct
  letterStats: Record<string, LetterStat>; // cyr letter -> Leitner
  mistakes: Record<string, number>; // item id (see lib/items.ts) -> times missed, most recent attempt correct clears it
  badges: BadgeId[];
  artifacts: Artifact[];
  gameRuns: GameRun[];
  gameStats: Record<string, GameStat>; // game slug -> lifetime plays/best/total (local device only, not synced)
  vocabHints: Record<string, string>; // vocab slug -> kid-attached mnemonic image dataUrl
  pawPrints: string[]; // clue ids collected this session
  gameBackgrounds: Record<string, string>; // game slug -> uploaded background dataUrl
  homeCoverId: string | null; // KidCover id chosen as the home-page background
  baseLanguage: BaseLanguage; // language prompts are explained in; Kazakh is always what's taught
  customGames: CustomGame[];
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
    runnerArtifactId: null,
    unlockedWeeks: 1,
    weeklyCodes: defaultWeekCodes(),
    regionProgress: ["almaty"], // first region starts unlocked
    vocabCorrect: {},
    letterStats: {},
    mistakes: {},
    badges: [],
    artifacts: [],
    gameRuns: [],
    gameStats: {},
    vocabHints: {},
    pawPrints: [],
    gameBackgrounds: {},
    homeCoverId: null,
    baseLanguage: "en",
    customGames: [],
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
    runnerArtifactId: profile.runnerArtifactId ?? null,
    gameStats: profile.gameStats ?? {},
    vocabHints: profile.vocabHints ?? {},
    mistakes: profile.mistakes ?? {},
    gameBackgrounds: profile.gameBackgrounds ?? {},
    homeCoverId: profile.homeCoverId ?? null,
    // English is the only base language now — every kid here is schooled in
    // English, and the toggle UI is gone. Force it regardless of any value
    // (e.g. "ru") a profile may have picked up while the toggle still existed.
    baseLanguage: "en",
    customGames: Array.isArray(profile.customGames)
      ? profile.customGames.filter(
          (game) =>
            game &&
            typeof game.id === "string" &&
            typeof game.title === "string" &&
            game.mechanic === "steppe-sprint" &&
            Array.isArray(game.vocabSlugs),
        )
      : [],
  };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

// Debounced push to the server on every change, not only at join. xp,
// region progress, vocab mastery, letter mastery and the home background
// choice used to reach the server exactly once, when a kid joined a session.
// Everything earned after that stayed local-only until they rejoined,
// which most never do mid-play. A recovery code used on a second device then
// pulled whatever the server had from that one join, not what the kid
// actually has now. The debounce collapses the bursts of updates a single
// game round produces into one request after things go quiet.
function scheduleServerSync() {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    const p = load();
    if (p.id === "server-profile") return;
    syncProfileState(p).catch(() => {});
  }, 2000);
}

// Artifacts and hint images are base64 photos living in the same localStorage
// blob as the rest of the profile — a kid who draws/uploads a lot over a long
// session can hit the ~5-10MB per-origin quota. localStorage.setItem throws
// synchronously when that happens, and it was uncaught: the in-memory change
// (e.g. a just-added vocab hint) looked like it worked for the rest of that
// session, then silently never made it to disk, gone on next visit. Trim the
// biggest thing profiles accumulate — artifacts — and retry once before
// giving up, and always tell the kid if a save genuinely didn't stick.
function writeToStorage(): boolean {
  if (typeof window === "undefined" || !state) return true;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    if (state.artifacts.length > 20) {
      state.artifacts = state.artifacts.slice(0, 20);
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      } catch {
        // fall through
      }
    }
    return false;
  }
}

function persist() {
  const saved = writeToStorage();
  listeners.forEach((l) => l());
  if (!saved) {
    toastBus.show({
      title: "Couldn't save that",
      body: "Storage is full — delete a few old drawings or homework photos from your gallery, then try again.",
      icon: "⚠️",
      duration: 6000,
    });
  }
  scheduleServerSync();
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
      p.artifacts = p.artifacts.slice(0, 60);
      if (kind === "tanba") {
        p.avatarArtifactId = id;
        award(p, "tanba_artist");
        p.xp += 30;
      }
      if (kind === "story") {
        award(p, "storyteller");
        p.xp += 25;
      }
      if (kind === "runner") {
        p.runnerArtifactId = id;
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

  setBaseLanguage(lang: BaseLanguage) {
    update((p) => { p.baseLanguage = lang; });
  },

  // Homework submission: stored like any artifact (offline-first), plus a
  // best-effort sync to the homework_items table when Supabase is wired up.
  addHomework(dataUrl: string, meta: { title?: string; date?: string; note?: string }): string {
    const id = crypto.randomUUID();
    const artifact: Artifact = { id, kind: "homework", dataUrl, createdAt: Date.now(), meta };
    update((p) => {
      p.artifacts.unshift(artifact);
      p.artifacts = p.artifacts.slice(0, 60);
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
      p.artifacts = p.artifacts.slice(0, 60);
      p.gameBackgrounds[slug] = dataUrl;
    });
    const p = load();
    syncArtifact(p.id, p.avatarArtifactId, artifact).catch(() => {});
  },

  clearGameBackground(slug: string) {
    update((p) => { delete p.gameBackgrounds[slug]; });
  },

  createCustomGame(input: {
    title: string;
    vocabSlugs: string[];
    backgroundDataUrl?: string | null;
    backgroundArtifactId?: string | null;
    backgroundTemplateId?: string | null;
  }): CustomGame {
    const backgroundArtifactId = input.backgroundDataUrl
      ? store.addArtifact("background", input.backgroundDataUrl)
      : (input.backgroundArtifactId ?? null);
    const game: CustomGame = {
      id: crypto.randomUUID(),
      title: input.title.trim().slice(0, 40) || "My Steppe Sprint",
      mechanic: "steppe-sprint",
      vocabSlugs: [...new Set(input.vocabSlugs)].slice(0, 24),
      backgroundArtifactId,
      backgroundTemplateId: input.backgroundTemplateId ?? null,
      createdAt: Date.now(),
    };
    update((p) => {
      p.customGames.unshift(game);
      p.customGames = p.customGames.slice(0, 12);
    });
    return game;
  },

  deleteCustomGame(gameId: string) {
    update((p) => {
      p.customGames = p.customGames.filter((game) => game.id !== gameId);
    });
  },

  // Removes a drawing/homework/runner from the gallery. Clears the avatar or
  // runner reference too if that's what got deleted, so the profile doesn't
  // point at an artifact that no longer exists.
  deleteArtifact(artifactId: string) {
    const p = load();
    const artifact = p.artifacts.find((a) => a.id === artifactId);
    update((profile) => {
      profile.artifacts = profile.artifacts.filter((a) => a.id !== artifactId);
      if (profile.avatarArtifactId === artifactId) profile.avatarArtifactId = null;
      if (profile.runnerArtifactId === artifactId) profile.runnerArtifactId = null;
    });
    if (artifact) syncDeleteArtifact(p.id, artifactId, artifact.kind).catch(() => {});
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
      return { ok: true, message: "Whole Silk Road complete, replay any game for more points." };
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

  /** Kid attaches a memory-hint image to a word — "sister looks like a monkey" — so it appears as the background whenever that word comes up. */
  setVocabHint(slug: string, dataUrl: string) {
    update((p) => { p.vocabHints[slug] = dataUrl; });
  },

  clearVocabHint(slug: string) {
    update((p) => { delete p.vocabHints[slug]; });
  },

  recordGameRun(run: Omit<GameRun, "id" | "at">) {
    const newRun: GameRun = { ...run, id: crypto.randomUUID(), at: Date.now() };
    update((p) => {
      p.gameRuns.unshift(newRun);
      p.gameRuns = p.gameRuns.slice(0, 20);
      const stat = p.gameStats[run.game] ?? { plays: 0, bestScore: 0, totalScore: 0 };
      p.gameStats[run.game] = {
        plays: stat.plays + 1,
        bestScore: Math.max(stat.bestScore, run.score),
        totalScore: stat.totalScore + run.score,
      };
      for (const slug of run.vocabCorrect) {
        p.vocabCorrect[slug] = (p.vocabCorrect[slug] ?? 0) + 1;
      }
      // Weekly challenge doubles the XP a run banks, not the run's own score
      // (gameStats/bestScore stay the game's real number — only the profile's
      // XP total gets the bonus).
      p.xp += run.game === weeklyChallengeSlug() ? run.score * WEEKLY_XP_MULTIPLIER : run.score;
      if (run.game === "sozdik-match") award(p, "first_match");
      if (run.game === "memory-match") award(p, "memory_master");
    });
    const p = load();
    syncGameRun(p.id, p.sessionCode, newRun).catch(() => {});
    maybeShowRecoveryHint();
  },

  /** Feeds Learn's "practice your mistakes" mode — miss an item and it's
   * added to the pool; get it right again (in any mode) and it drops out. */
  trackMistake(itemId: string, correct: boolean) {
    update((p) => {
      if (correct) {
        delete p.mistakes[itemId];
      } else {
        p.mistakes[itemId] = (p.mistakes[itemId] ?? 0) + 1;
      }
    });
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

  /**
   * Pull anything this profile made or earned that is not on this device.
   *
   * Local stays the source of truth so the app still works offline; the server
   * only fills gaps. Artifacts merge by id, newest first. XP takes the higher
   * value and progress takes the union rather than overwriting, so playing on
   * two devices can only ever add up, never roll back. Until this existed,
   * every drawing and homework photo (and, before 0021, all progress) lived on
   * exactly one browser and a cleared cache looked identical to "my work was
   * deleted".
   */
  async hydrateFromServer() {
    const p = load();
    if (p.id === "server-profile") return;

    const [remoteArtifacts, remoteState] = await Promise.all([
      fetchProfileArt(p.id),
      fetchProfileState(p.id),
    ]);

    update((profile) => {
      if (remoteArtifacts.length > 0) {
        const seen = new Set(profile.artifacts.map((a) => a.id));
        const missing = remoteArtifacts.filter((a) => !seen.has(a.id));
        if (missing.length > 0) {
          profile.artifacts = [...profile.artifacts, ...missing].sort(
            (a, b) => b.createdAt - a.createdAt,
          );
        }
      }

      if (remoteState) {
        profile.xp = Math.max(profile.xp, remoteState.xp);
        for (const region of remoteState.regionProgress as RegionId[]) {
          if (!profile.regionProgress.includes(region)) profile.regionProgress.push(region);
        }
        for (const [slug, count] of Object.entries(remoteState.vocabCorrect)) {
          profile.vocabCorrect[slug] = Math.max(profile.vocabCorrect[slug] ?? 0, count);
        }
        for (const [cyr, stat] of Object.entries(remoteState.letterStats)) {
          const local = profile.letterStats[cyr];
          if (!local || stat.level > local.level || (stat.level === local.level && stat.correct > local.correct)) {
            profile.letterStats[cyr] = stat;
          }
        }
        if (!profile.homeCoverId && remoteState.homeCoverId) {
          profile.homeCoverId = remoteState.homeCoverId;
        }
        const localGames = new Map(profile.customGames.map((game) => [game.id, game]));
        for (const game of remoteState.customGames) localGames.set(game.id, game);
        profile.customGames = [...localGames.values()]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 12);
        // baseLanguage stays "en" — never adopt a remote "ru" value.
      }
    });
  },

  /**
   * Adopt a profile on a new device from its recovery code. Replaces the local
   * id, then hydrates, so the kid sees their gallery instead of a blank one.
   */
  async adoptByCode(code: string): Promise<{ ok: boolean; name?: string }> {
    const found = await claimProfile(code);
    if (!found) return { ok: false };

    update((p) => {
      p.id = found.id;
      p.displayName = found.display_name || p.displayName;
      p.xp = Math.max(p.xp, found.xp ?? 0);
      p.artifacts = [];
    });

    await store.hydrateFromServer();
    return { ok: true, name: found.display_name };
  },

  /**
   * Adopt a profile by id rather than recovery code: what happens when the
   * URL in `/profile/[id]` names a different kid than the one on this device.
   * Same shape as adoptByCode, minus the code lookup.
   */
  async adoptById(id: string): Promise<{ ok: boolean; name?: string }> {
    const found = await fetchProfileState(id);
    if (!found) return { ok: false };

    update((p) => {
      p.id = id;
      p.displayName = found.displayName || p.displayName;
      p.xp = Math.max(p.xp, found.xp ?? 0);
      p.artifacts = [];
    });

    await store.hydrateFromServer();
    return { ok: true, name: found.displayName };
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

const RECOVERY_HINT_KEY = "s2s_recovery_hint_shown";

// Shown once per device, at the end of a game run, so a kid who plays on
// several devices finds out the code exists before they need it rather than
// after they lose a gallery to a cleared cache.
function maybeShowRecoveryHint() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(RECOVERY_HINT_KEY)) return;
  localStorage.setItem(RECOVERY_HINT_KEY, "1");
  toastBus.show({
    title: "Playing on another device?",
    body: "Your code is on your profile page. Use it there to bring your drawings and points along.",
    icon: "🔑",
    duration: 6000,
  });
}

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

/** Plays/best/average for one game slug, for a results-screen progress line. */
export function gameStatsFor(p: Profile, slug: string): { plays: number; best: number; average: number } {
  const stat = p.gameStats[slug];
  if (!stat || stat.plays === 0) return { plays: 0, best: 0, average: 0 };
  return { plays: stat.plays, best: stat.bestScore, average: Math.round(stat.totalScore / stat.plays) };
}

// React hook
export function useProfile(): Profile {
  return useSyncExternalStore(store.subscribe, store.get, () => SERVER_PROFILE);
}
