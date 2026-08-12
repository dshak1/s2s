"use client";

// Shared character gallery — browse other kids' (approved) runner art, or
// share your own. Mirrors the "offline demo mode" contract every other
// Supabase helper here follows: every function returns a safe empty/false
// result when Supabase isn't configured, never throws.
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { kidArtUrl } from "@/lib/kid-art-url";

export type GalleryCharacter = {
  id: string;
  displayName: string;
  url: string;
  ownerId: string | null;
  likeCount: number;
  liked: boolean;
};

/** `viewerProfileId` is optional (offline/server render has none yet) — pass
 * it once known so hearts render filled for characters this kid already liked. */
export async function fetchGalleryCharacters(viewerProfileId?: string): Promise<GalleryCharacter[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];

  const { data } = await sb
    .from("shared_characters")
    .select("id, display_name, storage_path, profile_id, like_count")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as Array<{ id: string; display_name: string; storage_path: string; profile_id: string | null; like_count: number }>;

  let likedIds = new Set<string>();
  if (viewerProfileId && rows.length > 0) {
    const { data: liked } = await sb.rpc("liked_character_ids", {
      p_profile_id: viewerProfileId,
      p_character_ids: rows.map((r) => r.id),
    });
    likedIds = new Set((liked ?? []) as string[]);
  }

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    url: kidArtUrl(row.storage_path),
    ownerId: row.profile_id,
    likeCount: row.like_count,
    liked: likedIds.has(row.id),
  }));
}

/** Optimistic on the caller's side: returns the new liked state (or null if
 * offline/no Supabase, in which case the caller should not flip its UI). */
export async function toggleCharacterLike(characterId: string, profileId: string): Promise<boolean | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data, error } = await sb.rpc("toggle_character_like", {
    p_character_id: characterId,
    p_profile_id: profileId,
  });
  if (error) return null;
  return Boolean(data);
}

/** Removes a character you shared. Scoped server-side to your own profile_id
 * (see 0033_delete_shared_character.sql) — a request to delete someone
 * else's just matches zero rows, not an error. */
export async function deleteSharedCharacter(id: string, profileId: string): Promise<boolean> {
  const sb = getSupabaseBrowser();
  if (!sb) return false;
  const { error } = await sb.rpc("delete_shared_character", { p_id: id, p_profile_id: profileId });
  return !error;
}

/** Kid shares their current runner art. Goes into a staff review queue —
 * see 0032_shared_characters.sql — nothing appears in the public gallery
 * until approved. Returns whether the submission actually went through. */
export async function shareCharacterToGallery(
  profileId: string,
  displayName: string,
  dataUrl: string,
): Promise<boolean> {
  const sb = getSupabaseBrowser();
  if (!sb) return false;

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const contentType = blob.type || "image/webp";
  const ext = contentType.split("/")[1]?.split("+")[0] || "webp";
  const id = crypto.randomUUID();
  const path = `shared/${id}.${ext}`;

  const { error: uploadError } = await sb.storage.from("kid-art").upload(path, blob, { contentType });
  if (uploadError) return false;

  const { error: rpcError } = await sb.rpc("share_character", {
    p_id: id,
    p_profile_id: profileId,
    p_display_name: displayName,
    p_storage_path: path,
  });
  return !rpcError;
}
