"use client";

import { useSyncExternalStore } from "react";

// Capacitor injects `window.Capacitor` into the native WebView before any of
// our code hydrates, and it is absent on the web/PWA build. Read through
// useSyncExternalStore so the server snapshot is always `false` and the client
// snapshot is read after hydration — reading it during render would tear.
const NEVER_CHANGES = () => () => {};

function readNative() {
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function useIsNativeShell() {
  return useSyncExternalStore(NEVER_CHANGES, readNative, () => false);
}
