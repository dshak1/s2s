"use client";

import { getSupabaseBrowser } from "./client";
import { captureError } from "@/lib/monitoring";
import type { Profile, GameRun, Artifact, LetterStat, CustomGame } from "@/lib/store";
import type { BaseLanguage } from "@/lib/lang";
import { kidArtUrl } from "@/lib/kid-art-url";

/**
 * Everything this profile has made, from the server.
 *
 * Reads go through SECURITY DEFINER functions rather than RLS, because an
 * anonymous kid has no identity a policy could match on. Knowing the profile id
 * is the credential; see 0018_kid_recovery.sql.
 */
export async function fetchProfileArt(profileId: string): Promise<Artifact[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];

  const [art, homework] = await Promise.all([
    sb.rpc("profile_artifacts", { p_profile_id: profileId }),
    sb.rpc("profile_homework", { p_profile_id: profileId }),
  ]);

  if (art.error) captureError(art.error, { where: "fetchProfileArt/artifacts" });
  if (homework.error) captureError(homework.error, { where: "fetchProfileArt/homework" });

  type ArtRow = { id: string; kind: string; storage_path: string; created_at: string };
  type HwRow = {
    id: string;
    title: string | null;
    note: string | null;
    homework_date: string | null;
    storage_path: string;
    created_at: string;
  };

  const artifacts: Artifact[] = ((art.data ?? []) as ArtRow[]).map((r) => ({
    id: r.id,
    kind: r.kind as Artifact["kind"],
    dataUrl: kidArtUrl(r.storage_path),
    createdAt: new Date(r.created_at).getTime(),
  }));

  const homeworkItems: Artifact[] = ((homework.data ?? []) as HwRow[]).map((r) => ({
    id: r.id,
    kind: "homework",
    dataUrl: kidArtUrl(r.storage_path),
    createdAt: new Date(r.created_at).getTime(),
    meta: {
      title: r.title ?? undefined,
      note: r.note ?? undefined,
      date: r.homework_date ?? undefined,
    },
  }));

  return [...artifacts, ...homeworkItems];
}

/** The code a kid types on a second device to get their work back. */
export async function fetchRecoveryCode(
  profileId: string,
  displayName: string,
): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data, error } = await sb.rpc("profile_recovery_code", {
    p_profile_id: profileId,
    p_display_name: displayName,
  });
  if (error) {
    captureError(error, { where: "fetchRecoveryCode" });
    return null;
  }
  return (data as string | null) ?? null;
}

export type RemoteProfileState = {
  displayName: string;
  xp: number;
  regionProgress: string[];
  vocabCorrect: Record<string, number>;
  letterStats: Record<string, LetterStat>;
  homeCoverId: string | null;
  customGames: CustomGame[];
  baseLanguage: BaseLanguage;
};

/**
 * XP, region progress, vocab mastery and letter stats for a profile, straight
 * from the server. Used to merge state on hydrate, not just artifacts; see
 * 0021_profile_state_sync.sql.
 */
export async function fetchProfileState(profileId: string): Promise<RemoteProfileState | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data, error } = await sb.rpc("profile_state", { p_profile_id: profileId });
  if (error) {
    captureError(error, { where: "fetchProfileState" });
    return null;
  }
  type Row = {
    display_name: string;
    xp: number;
    region_progress: string[];
    vocab_correct: Record<string, number>;
    letter_stats: Record<string, LetterStat>;
    home_cover_id: string | null;
    custom_games: CustomGame[];
    base_language: BaseLanguage;
  };
  const row = ((data ?? []) as Row[])[0];
  if (!row) return null;
  return {
    displayName: row.display_name ?? "",
    xp: row.xp ?? 0,
    regionProgress: row.region_progress ?? [],
    vocabCorrect: row.vocab_correct ?? {},
    letterStats: row.letter_stats ?? {},
    homeCoverId: row.home_cover_id ?? null,
    customGames: Array.isArray(row.custom_games) ? row.custom_games : [],
    baseLanguage: "en", // English-only now, regardless of any stored value
  };
}

export async function claimProfile(
  code: string,
): Promise<{ id: string; display_name: string; xp: number } | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data, error } = await sb.rpc("claim_profile", { p_code: code });
  if (error) {
    captureError(error, { where: "claimProfile" });
    return null;
  }
  const rows = (data ?? []) as Array<{ id: string; display_name: string; xp: number }>;
  return rows[0] ?? null;
}

// Fire-and-forget helpers — call with .catch(()=>{}) to suppress unhandled rejections.
// All functions return early when Supabase env vars are absent (offline demo mode).

/**
 * Push xp, progress and the home background choice to the server. Routed
 * through a SECURITY DEFINER function rather than a direct anon upsert: a
 * direct upsert silently no-ops live (verified: INSERT works, UPDATE matches
 * zero rows despite a correct policy and grant, see
 * 0024_sync_profile_state.sql). The function bypasses RLS by running as its
 * owner instead of anon.
 *
 * Called on a debounce from every `persist()` in store.ts, not only on join.
 * xp that only reached the server once, at join time, meant a recovery code
 * used mid-session pulled stale numbers on the second device.
 */
export async function syncProfileState(profile: Profile) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.rpc("sync_profile_state", {
    p_profile_id: profile.id,
    p_display_name: profile.displayName,
    p_xp: profile.xp,
    p_streak_weeks: profile.streakWeeks,
    p_region_progress: profile.regionProgress,
    p_vocab_correct: profile.vocabCorrect,
    p_letter_stats: profile.letterStats,
    p_home_cover_id: profile.homeCoverId,
    p_custom_games: profile.customGames,
    p_base_language: profile.baseLanguage,
  });
}

/**
 * Make sure this kid has a row in `profiles` before anything that references
 * one is written.
 *
 * kid_artifacts, homework_items and game_runs all carry
 * `profile_id uuid references profiles(id)`. A brand-new anonymous kid has no
 * profiles row until the scheduleServerSync debounce in store.ts fires, two
 * seconds after their first change — so their very first drawing, runner,
 * backdrop or finished game raced that debounce and lost it, with
 * `23503: Key (profile_id)=(…) is not present in table "profiles"`. The
 * artwork still uploaded to Storage; only the row pointing at it was dropped,
 * which is the same silent server-side loss 0026 was written to end.
 *
 * The row is only *created*, never refreshed: if the server already knows this
 * profile, its xp and progress are left exactly as they are. That matters
 * because sync_profile_state overwrites those columns with whatever this
 * device holds, and a device that has not hydrated yet holds less than the
 * server does. Creating a missing row cannot lose anything — there is nothing
 * there to lose — and the debounced sync right behind it carries the real
 * numbers up a moment later.
 */
const knownProfileRows = new Set<string>();

export async function ensureProfileRow(profile: Profile): Promise<void> {
  if (profile.id === "server-profile" || knownProfileRows.has(profile.id)) return;
  const sb = getSupabaseBrowser();
  if (!sb) return;

  const { data, error } = await sb.rpc("profile_state", { p_profile_id: profile.id });
  // An error means we do not know whether the row exists. Writing on a guess
  // is the one thing here that could cost a kid their xp, so do nothing: the
  // debounced sync was always going to run anyway.
  if (error) return;

  if (((data ?? []) as unknown[]).length === 0) await syncProfileState(profile);
  knownProfileRows.add(profile.id);
}

export type LinkedPlayerProfile = {
  id: string;
  displayName: string;
  xp: number;
  recoveryCode: string | null;
};

export async function linkPlayerProfile(profileId: string, recoveryCode: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Player accounts are unavailable offline.");
  const { error } = await sb.rpc("link_player_profile", {
    p_profile_id: profileId,
    p_recovery_code: recoveryCode,
  });
  if (error) throw error;
}

export async function fetchLinkedPlayerProfiles(): Promise<LinkedPlayerProfile[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb.rpc("my_player_profiles");
  if (error) throw error;
  type Row = { id: string; display_name: string; xp: number; recovery_code: string | null };
  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    xp: row.xp,
    recoveryCode: row.recovery_code,
  }));
}

export async function syncJoin(profile: Profile, sessionCode: string, table: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return;

  await syncProfileState(profile);

  const { data: sess } = await sb
    .from("sessions")
    .select("id")
    .eq("code", sessionCode.toUpperCase())
    .maybeSingle();
  if (!sess) return;

  await sb.from("attendance").upsert(
    { session_id: sess.id, profile_id: profile.id, table_no: table },
    { onConflict: "session_id,profile_id" },
  );

  await sb.from("profile_badges").upsert(
    { profile_id: profile.id, badge_id: "aul_member" },
    { onConflict: "profile_id,badge_id" },
  );
}

export async function syncGameRun(
  profileId: string,
  sessionCode: string | null,
  run: GameRun,
) {
  const sb = getSupabaseBrowser();
  if (!sb) return;

  let sessionId: string | null = null;
  if (sessionCode) {
    const { data: sess } = await sb
      .from("sessions")
      .select("id")
      .eq("code", sessionCode.toUpperCase())
      .maybeSingle();
    sessionId = sess?.id ?? null;
  }

  await sb.from("game_runs").upsert(
    {
      id: run.id,
      profile_id: profileId,
      session_id: sessionId,
      game: run.game,
      score: run.score,
      vocab_seen: run.vocabSeen,
      vocab_correct: run.vocabCorrect,
    },
    { onConflict: "id" },
  );
}

export async function syncArtifact(
  profileId: string,
  avatarArtifactId: string | null,
  artifact: Artifact,
) {
  const sb = getSupabaseBrowser();
  if (!sb) return;

  const res = await fetch(artifact.dataUrl);
  const blob = await res.blob();
  const contentType = blob.type || "image/png";
  const ext = contentType.split("/")[1]?.split("+")[0] || "png";
  const path = `${profileId}/${artifact.id}.${ext}`;

  // upsert:true makes the Storage API check-then-update on every call, even
  // for a path that has never existed. That update path hits the same live
  // RLS drift as profiles/kid_artifacts/homework_items, and unlike those it
  // has no SECURITY DEFINER workaround (this is a real file, not just a
  // row). Plain insert works, verified live, and artifact.id is a fresh
  // UUID every time, so a path collision here would mean something else is
  // already badly wrong.
  const { error } = await sb.storage.from("kid-art").upload(path, blob, { contentType });
  if (error) {
    captureError(error, { where: "syncArtifact/upload", profileId, path });
    return;
  }

  // A direct anon upsert here is rejected outright (42501) despite a
  // matching insert policy in 0005_identity.sql. Routed through a SECURITY
  // DEFINER function, which also sets the avatar in the same call, since the
  // raw profiles UPDATE below it hit the same wall as xp did.
  const { error: rowError } = await sb.rpc("sync_kid_artifact", {
    p_id: artifact.id,
    p_profile_id: profileId,
    p_kind: artifact.kind,
    p_storage_path: path,
    p_is_avatar: avatarArtifactId === artifact.id,
  });
  if (rowError) captureError(rowError, { where: "syncArtifact/row", profileId });
}

export async function syncHomework(
  profileId: string,
  studentName: string,
  artifact: Artifact,
) {
  const sb = getSupabaseBrowser();
  if (!sb) return;

  const res = await fetch(artifact.dataUrl);
  const blob = await res.blob();
  const contentType = blob.type || "image/jpeg";
  const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
  const path = `${profileId}/homework-${artifact.id}.${ext}`;

  // Same reasoning as syncArtifact: upsert:true always hits the broken
  // update path live, plain insert works, and artifact.id is fresh every
  // time so there is nothing to collide with.
  const { error } = await sb.storage.from("kid-art").upload(path, blob, { contentType });
  if (error) {
    captureError(error, { where: "syncHomework/upload", profileId, path });
    return;
  }

  // Same drift as syncArtifact: a direct anon upsert here is rejected
  // outright despite 0005_identity.sql's insert policy. See
  // 0026_sync_kid_artifacts.sql.
  const { error: rowError } = await sb.rpc("sync_homework_item", {
    p_id: artifact.id,
    p_profile_id: profileId,
    p_student_name: studentName,
    p_title: artifact.meta?.title || null,
    p_note: artifact.meta?.note || null,
    p_homework_date: artifact.meta?.date || null,
    p_storage_path: path,
  });
  if (rowError) captureError(rowError, { where: "syncHomework/row", profileId });
}

// Deleting locally used to leave the server row in place, so the next
// hydrateFromServer() saw it as "missing" and added it right back. This
// removes the server-side row too — storage object is left orphaned (no
// public listing exposes it, and cleanup can be a later pass).
export async function syncDeleteArtifact(profileId: string, artifactId: string, kind: Artifact["kind"]) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const rpc = kind === "homework" ? "delete_homework_item" : "delete_kid_artifact";
  const { error } = await sb.rpc(rpc, { p_id: artifactId, p_profile_id: profileId });
  if (error) captureError(error, { where: "syncDeleteArtifact", profileId, artifactId });
}

export async function syncSessionCreate(code: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb
    .from("sessions")
    .upsert({ code: code.toUpperCase(), active: true }, { onConflict: "code" });
}

export async function syncSessionMember(
  code: string,
  member: { id: string; name: string; table: string },
) {
  const sb = getSupabaseBrowser();
  if (!sb) return;

  const { data: sess } = await sb
    .from("sessions")
    .select("id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!sess) return;

  await sb
    .from("profiles")
    .upsert({ id: member.id, display_name: member.name }, { onConflict: "id" });

  await sb.from("attendance").upsert(
    { session_id: sess.id, profile_id: member.id, table_no: member.table },
    { onConflict: "session_id,profile_id" },
  );
}

export async function syncLaunchGame(code: string, game: string | null) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb
    .from("sessions")
    .update({ current_region: game })
    .eq("code", code.toUpperCase());
}

type RealtimeMember = {
  id: string;
  name: string;
  table: string;
  avatar: string | null;
  paws: string[];
};

function joinedProfileName(value: unknown): string {
  const profile = Array.isArray(value) ? value[0] : value;
  if (profile && typeof profile === "object" && "display_name" in profile) {
    const name = (profile as { display_name?: unknown }).display_name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return "Kid";
}

export function subscribeRealtimeSession(
  code: string,
  onMembers: (members: RealtimeMember[]) => void,
): () => void {
  const sb = getSupabaseBrowser();
  if (!sb) return () => {};

  let sessionId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let channel: any = null;
  let torn = false;

  async function fetchMembers() {
    if (!sessionId || !sb || torn) return;
    const { data } = await sb
      .from("attendance")
      .select("profile_id, table_no, paw_prints, profiles(display_name)")
      .eq("session_id", sessionId);
    if (!data || torn) return;
    const members: RealtimeMember[] = data.map((row) => ({
      id: row.profile_id as string,
      name: joinedProfileName(row.profiles),
      table: (row.table_no as string | null) ?? "1",
      avatar: null,
      paws: Array.from({ length: (row.paw_prints as number) ?? 0 }, (_, i) => String(i)),
    }));
    onMembers(members);
  }

  sb.from("sessions")
    .select("id")
    .eq("code", code.toUpperCase())
    .maybeSingle()
    .then(({ data: sess }) => {
      if (!sess || !sb || torn) return;
      sessionId = sess.id as string;

      channel = sb
        .channel(`s2s:session:${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attendance", filter: `session_id=eq.${sessionId}` },
          () => fetchMembers(),
        )
        .subscribe();

      fetchMembers();
    });

  return () => {
    torn = true;
    if (channel && sb) sb.removeChannel(channel);
  };
}

// --- Facilitator-led live rounds --------------------------------------------
//
// Pure broadcast, no table involved: a round lasts seconds, and every anon
// table write elsewhere in this app has turned out to need a SECURITY
// DEFINER workaround for a live RLS drift (0024, 0026). Broadcast sidesteps
// that class of problem entirely. It never touches a table, so there is no
// RLS to drift.

export type RoundStartPayload = { roundId: string; placeId: string };
export type RoundAnswerPayload = {
  roundId: string;
  profileId: string;
  name: string;
  x: number;
  y: number;
  closeness: number;
};
export type RoundRevealPayload = { roundId: string };
export type RoundEndPayload = { roundId: string };

type RoundPayloads = {
  round_start: RoundStartPayload;
  round_answer: RoundAnswerPayload;
  round_reveal: RoundRevealPayload;
  round_end: RoundEndPayload;
};
type RoundEventName = keyof RoundPayloads;
type RoundHandlers = Partial<{ [K in RoundEventName]: (payload: RoundPayloads[K]) => void }>;

/**
 * One channel, shared by whoever opens it, for both sending and receiving.
 * The facilitator opens one for the whole live-round session and calls
 * `.send()` as the round progresses; a kid's device opens one only while the
 * live-round overlay is showing.
 */
export function openRoundChannel(code: string, handlers: RoundHandlers) {
  const sb = getSupabaseBrowser();
  if (!sb) return { send: () => {}, close: () => {} };

  const channel = sb.channel(`s2s:round:${code.toUpperCase()}`, {
    config: { broadcast: { self: false } },
  });

  (Object.keys(handlers) as RoundEventName[]).forEach((event) => {
    const handler = handlers[event];
    if (!handler) return;
    channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) =>
      handler(payload as never),
    );
  });

  channel.subscribe();

  return {
    send<K extends RoundEventName>(event: K, payload: RoundPayloads[K]) {
      channel.send({ type: "broadcast", event, payload });
    },
    close() {
      sb.removeChannel(channel);
    },
  };
}

// --- Live multi-table race (say-and-shift projector view) ------------------
//
// Same broadcast-only shape as the round channel above, one event instead of
// four: a player's device sends its current wall/lives whenever they change,
// the facilitator's race screen renders one runner per table from whatever
// it has seen. Nothing persisted — a projector-only view, not a leaderboard
// of record.

export type RaceProgressPayload = {
  profileId: string;
  name: string;
  table: string;
  wallIndex: number;
  totalWalls: number;
  lives: number;
  finished: boolean;
};

export function openRaceChannel(
  code: string,
  handlers: { progress?: (payload: RaceProgressPayload) => void } = {},
) {
  const sb = getSupabaseBrowser();
  if (!sb) return { send: () => {}, close: () => {} };

  const channel = sb.channel(`s2s:race:${code.toUpperCase()}`, {
    config: { broadcast: { self: false } },
  });

  if (handlers.progress) {
    const onProgress = handlers.progress;
    channel.on("broadcast", { event: "progress" }, ({ payload }: { payload: unknown }) =>
      onProgress(payload as RaceProgressPayload),
    );
  }

  channel.subscribe();

  return {
    send(payload: RaceProgressPayload) {
      channel.send({ type: "broadcast", event: "progress", payload });
    },
    close() {
      sb.removeChannel(channel);
    },
  };
}
