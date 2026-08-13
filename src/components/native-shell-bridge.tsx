"use client";

import { useEffect } from "react";

// Only touches anything inside the Capacitor native shells (Android and iOS) —
// window.Capacitor is injected by the native WebView and is absent on the
// regular web/PWA build, so this stays a no-op there and never ships extra JS
// work to it.
export function NativeShellBridge() {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    let removeBackListener: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      if (cancelled) return;

      // Style.Light means *dark* icons for a light background (the Capacitor
      // enum is named after the background it complements, not the content).
      // Every screen sits on cream or pale sky, and on iOS the status bar
      // floats over the page with no background colour of its own, so the
      // Style.Dark this used to send left white-on-cream icons.
      await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      // Android-only API; rejects harmlessly on iOS.
      await StatusBar.setBackgroundColor({ color: "#faf6e9" }).catch(() => {});
      await SplashScreen.hide().catch(() => {});

      // Android hardware back only; iOS never emits this event.
      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
      removeBackListener = () => listener.remove();
    })();

    return () => {
      cancelled = true;
      removeBackListener?.();
    };
  }, []);

  return null;
}
