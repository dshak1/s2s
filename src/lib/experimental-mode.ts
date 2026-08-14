"use client";

import { useEffect, useState } from "react";

// Runtime, per-device flag. Issue #18 wants per-profile targeting later.
// localStorage is what the rest of the app already uses for anonymous kids.
// URL ?experimental=1 is for Screen Studio / demos so you don't hunt a toggle.

const KEY = "s2s_experimental";
const LOOKS_OK_PREFIX = "s2s_experimental_looks_ok:";
export const EXPERIMENTAL_EVENT = "s2s-experimental-change";

export function readExperimental(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("experimental")) {
      const v = params.get("experimental");
      return v !== "0" && v !== "false";
    }
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeExperimental(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // quota / private mode. the class still flips for this page load.
  }
  window.dispatchEvent(new Event(EXPERIMENTAL_EVENT));
}

export function looksOkSeen(screen: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LOOKS_OK_PREFIX + screen) === "1";
  } catch {
    return true;
  }
}

export function markLooksOk(screen: string) {
  try {
    window.localStorage.setItem(LOOKS_OK_PREFIX + screen, "1");
  } catch {
    // ignore
  }
}

export function useExperimental() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(readExperimental());
    sync();
    window.addEventListener(EXPERIMENTAL_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EXPERIMENTAL_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function setExperimental(next: boolean) {
    writeExperimental(next);
    setOn(next);
  }

  return [on, setExperimental] as const;
}
