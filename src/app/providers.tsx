"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DebugPanel } from "@/components/debug-panel";
import { ToastProvider } from "@/components/toast-provider";
import { FeedbackButton } from "@/components/feedback-button";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <ToastProvider />
      <FeedbackButton />
      <DebugPanel />
    </QueryClientProvider>
  );
}
