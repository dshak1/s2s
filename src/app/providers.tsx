"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DebugPanel } from "@/components/debug-panel";
import { ExperimentalShell } from "@/components/experimental-mode";
import { ToastProvider } from "@/components/toast-provider";
import { FeedbackButton } from "@/components/feedback-button";
import { LiveRoundOverlay } from "@/components/live-round-overlay";
import { NativeShellBridge } from "@/components/native-shell-bridge";
import { store } from "@/lib/store";

// Pull down anything this profile made that is not on this device. Runs once
// per page load, after the first paint, and is a no-op offline. Without it a
// cleared cache is indistinguishable from losing your homework.
function useServerHydration() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      void store.hydrateFromServer().catch(() => {});
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useServerHydration();
  return (
    <QueryClientProvider client={client}>
      {children}
      <ToastProvider />
      <FeedbackButton />
      <LiveRoundOverlay />
      <ExperimentalShell />
      <DebugPanel />
      <NativeShellBridge />
    </QueryClientProvider>
  );
}
