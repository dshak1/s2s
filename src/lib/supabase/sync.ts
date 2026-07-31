"use client";

import { getSupabaseBrowser } from "./client";
import { captureError } from "@/lib/monitoring";
import type { Profile, GameRun, Artifact } from "@/lib/store";

// Public URL for anything in the kid-art bucket. Hydrated artifacts render from
// this rather than a stored data URL, so pulling a gallery back does not blow
// up the localStorage quota.
export function kidArtUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kid-art/${storagePath}`;
}

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
  const contentType = blob.type || "image/png";
  const ext = contentType.split("/")[1]?.split("+")[0] || "png";
  const path = `${profileId}/${artifact.id}.${ext}`;

  const { error } = await sb.storage
    .from("kid-art")
    .upload(path, blob, { contentType, upsert: true });
  if (error) {
    // This exact silent return is why every upload since day one vanished: the
    // bucket had no insert policy and nobody found out for two months.
    captureError(error, { where: "syncArtifact/upload", profileId, path });
    return;
  }

  const { error: rowError } = await sb.from("kid_artifacts").upsert(
    { id: artifact.id, profile_id: profileId, kind: artifact.kind, storage_path: path },
    { onConflict: "id" },
  );
  if (rowError) captureError(rowError, { where: "syncArtifact/row", profileId });

  if (avatarArtifactId === artifact.id) {
    await sb.from("profiles").update({ avatar_artifact_id: artifact.id }).eq("id", profileId);
  }
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

  const { error } = await sb.storage
    .from("kid-art")
    .upload(path, blob, { contentType, upsert: true });
  if (error) {
    captureError(error, { where: "syncHomework/upload", profileId, path });
    return;
  }

  const { error: rowError } = await sb.from("homework_items").upsert(
    {
      id: artifact.id,
      profile_id: profileId,
      student_name: studentName,
      title: artifact.meta?.title || null,
      note: artifact.meta?.note || null,
      homework_date: artifact.meta?.date || null,
      storage_path: path,
    },
    { onConflict: "id" },
  );
  if (rowError) captureError(rowError, { where: "syncHomework/row", profileId });
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
