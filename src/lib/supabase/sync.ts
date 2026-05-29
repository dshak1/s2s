"use client";

import { getSupabaseBrowser } from "./client";
import type { Profile, GameRun, Artifact } from "@/lib/store";

// Fire-and-forget helpers — call with .catch(()=>{}) to suppress unhandled rejections.
// All functions return early when Supabase env vars are absent (offline demo mode).

export async function syncJoin(profile: Profile, sessionCode: string, table: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return;

  await sb.from("profiles").upsert(
    {
      id: profile.id,
      display_name: profile.displayName,
      xp: profile.xp,
      streak_weeks: profile.streakWeeks,
      region_progress: profile.regionProgress,
      vocab_correct: profile.vocabCorrect,
      letter_stats: profile.letterStats,
    },
    { onConflict: "id" },
  );

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
  const path = `${profileId}/${artifact.id}.png`;

  const { error } = await sb.storage
    .from("kid-art")
    .upload(path, blob, { contentType: "image/png", upsert: true });
  if (error) return;

  await sb.from("kid_artifacts").upsert(
    { id: artifact.id, profile_id: profileId, kind: artifact.kind, storage_path: path },
    { onConflict: "id" },
  );

  if (avatarArtifactId === artifact.id) {
    await sb.from("profiles").update({ avatar_artifact_id: artifact.id }).eq("id", profileId);
  }
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
      name: (row.profiles as { display_name: string } | null)?.display_name ?? "Kid",
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
