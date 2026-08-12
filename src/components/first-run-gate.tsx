"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { needsOnboarding } from "@/lib/onboarding";

// Sends a brand-new visitor to /welcome once. Mounted on the play hub rather
// than globally: the hub is where a kid actually arrives (it is the PWA start
// url and the only link off the landing page), while a shared deep link to one
// game is usually a facilitator projecting it, and interrupting that with an
// intro would be worse than skipping it.
export function FirstRunGate() {
  const router = useRouter();

  useEffect(() => {
    if (needsOnboarding()) router.replace("/welcome");
  }, [router]);

  return null;
}
