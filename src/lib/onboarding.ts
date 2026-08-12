"use client";

import { store } from "@/lib/store";

// Whether this browser has been through /welcome. Its own key rather than a
// field on the profile: the profile syncs, and "have you seen the intro" is
// about this device, not about the kid. Same shape as the recovery-hint flag.
const KEY = "s2s_onboarded_v1";

export function markOnboarded() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Private mode with storage denied. They see the intro again; nothing breaks.
  }
}

export function needsOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(KEY)) return false;
  } catch {
    return false;
  }

  // Everyone who was already playing when this shipped, and anyone restoring a
  // profile onto a new device, has earned their way past the intro. Walling a
  // kid mid-workshop behind a welcome screen would be the one unforgivable
  // version of this feature.
  const profile = store.get();
  const started =
    profile.xp > 0 ||
    profile.gameRuns.length > 0 ||
    profile.artifacts.length > 0 ||
    profile.displayName !== "Demo Kid";

  if (started) {
    markOnboarded();
    return false;
  }
  return true;
}
