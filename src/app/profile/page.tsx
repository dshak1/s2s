"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";

export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/profile/${store.get().id}`);
  }, [router]);
  return <div className="min-h-dvh bg-warm" />;
}
