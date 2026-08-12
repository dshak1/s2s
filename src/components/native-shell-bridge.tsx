"use client";

import { useEffect } from "react";

// Only touches anything inside the Capacitor Android shell — window.Capacitor
// is injected by the native WebView and is absent on the regular web/PWA
// build, so this stays a no-op there and never ships extra JS work to it.
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

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      await StatusBar.setBackgroundColor({ color: "#faf6e9" }).catch(() => {});
      await SplashScreen.hide().catch(() => {});

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
