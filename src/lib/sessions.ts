"use client";

// Lightweight live-session layer for the demo. Uses localStorage + a
// BroadcastChannel so a projector tab and kid tabs on the same machine sync in
// real time (exactly the in-room workshop setup). When Supabase is configured
// this is the seam to swap for Realtime channels — the shapes match the schema.
import { useSyncExternalStore } from "react";
import {
  syncSessionCreate,
  syncSessionMember,
  syncLaunchGame,
  subscribeRealtimeSession,
} from "@/lib/supabase/sync";

export type Member = {
  id: string;
  name: string;
  table: string;
  avatar?: string | null;
  paws: string[]; // clue ids collected
};

export type SessionState = {
  code: string;
  createdAt: number;
  currentGame: string | null;
  members: Member[];
};

const PREFIX = "s2s_session_";
const chan = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("s2s") : null;
const listeners = new Map<string, Set<() => void>>();
// Cache stable snapshot references so useSyncExternalStore doesn't loop.
const cache = new Map<string, SessionState>();
// Realtime unsubscribe functions keyed by session code.
const rtUnsubs = new Map<string, () => void>();

function key(code: string) {
  return PREFIX + code.toUpperCase();
}
function empty(code: string): SessionState {
  return { code: code.toUpperCase(), createdAt: 0, currentGame: null, members: [] };
}
function readRaw(code: string): SessionState {
  if (typeof window === "undefined") return empty(code);
  try {
    const raw = localStorage.getItem(key(code));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return empty(code);
}
function read(code: string): SessionState {
  const c = code.toUpperCase();
  if (!cache.has(c)) cache.set(c, readRaw(c));
  return cache.get(c)!;
}
function refresh(code: string) {
  cache.set(code.toUpperCase(), readRaw(code));
  notify(code);
}
function write(state: SessionState) {
  const next = { ...state, code: state.code.toUpperCase() };
  localStorage.setItem(key(next.code), JSON.stringify(next));
  cache.set(next.code, next);
  chan?.postMessage({ code: next.code });
  notify(next.code);
}
function notify(code: string) {
  listeners.get(code.toUpperCase())?.forEach((cb) => cb());
}

if (chan) {
  chan.onmessage = (e) => { if (e.data?.code) refresh(e.data.code); };
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith(PREFIX)) refresh(e.key.slice(PREFIX.length));
  });
}

export const sessions = {
  create(code: string) {
    const s = read(code);
    write({ ...s, code: code.toUpperCase(), createdAt: Date.now() });
    syncSessionCreate(code).catch(() => {});
  },
  registerJoin(code: string, member: Omit<Member, "paws">) {
    const s = read(code);
    const existing = s.members.find((m) => m.id === member.id);
    if (existing) {
      existing.name = member.name;
      existing.table = member.table;
      existing.avatar = member.avatar;
    } else {
      s.members.push({ ...member, paws: [] });
    }
    write(s);
    syncSessionMember(code, member).catch(() => {});
  },
  recordPaw(code: string, memberId: string, clueId: string) {
    const s = read(code);
    const m = s.members.find((x) => x.id === memberId);
    if (m && !m.paws.includes(clueId)) {
      m.paws.push(clueId);
      write(s);
    }
  },
  launchGame(code: string, game: string | null) {
    write({ ...read(code), currentGame: game });
    syncLaunchGame(code, game).catch(() => {});
  },
  get: read,
  subscribe(code: string, cb: () => void) {
    const c = code.toUpperCase();
    if (!listeners.has(c)) {
      listeners.set(c, new Set());
      // Wire Supabase Realtime on first subscriber (no-op when env vars absent).
      const unsub = subscribeRealtimeSession(c, (members) => {
        const current = readRaw(c);
        cache.set(c, { ...current, members });
        notify(c);
      });
      rtUnsubs.set(c, unsub);
    }
    listeners.get(c)!.add(cb);
    return () => {
      const set = listeners.get(c);
      set?.delete(cb);
      if (set?.size === 0) {
        rtUnsubs.get(c)?.();
        rtUnsubs.delete(c);
        listeners.delete(c);
      }
    };
  },
};

export function useSession(code: string): SessionState {
  return useSyncExternalStore(
    (cb) => sessions.subscribe(code, cb),
    () => read(code),
    () => ({ code, createdAt: 0, currentGame: null, members: [] }),
  );
}
