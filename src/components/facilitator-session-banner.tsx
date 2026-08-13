"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

// The facilitator navigated back once and the session was still running, but
// nothing said so — it read as "gone". This is a persistent pill, visible on
// every /facilitator/* page, that always points back at whatever session is
// still live (created recently, not explicitly ended).
const ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

type Active = { code: string; count: number };

export function FacilitatorSessionBanner() {
  const pathname = usePathname();
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    function scan() {
      const cutoff = Date.now() - ACTIVE_WINDOW_MS;
      let newest: (Active & { createdAt: number }) | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith("s2s_session_")) continue;
        try {
          const s = JSON.parse(localStorage.getItem(key)!);
          if (s.endedAt || !(s.createdAt > cutoff)) continue;
          if (!newest || s.createdAt > newest.createdAt) {
            newest = { code: s.code, count: s.members?.length ?? 0, createdAt: s.createdAt };
          }
        } catch {
          /* ignore */
        }
      }
      setActive(newest ? { code: newest.code, count: newest.count } : null);
    }
    scan();
    window.addEventListener("storage", scan);
    const timer = setInterval(scan, 4000);
    return () => {
      window.removeEventListener("storage", scan);
      clearInterval(timer);
    };
  }, []);

  if (!active) return null;
  if (pathname === `/facilitator/${active.code}/live`) return null;

  return (
    <Link
      href={`/facilitator/${active.code}/live`}
      className="fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-terra px-4 py-2.5 text-sm font-black text-white shadow-[3px_4px_0_0_#7c0a1f] transition hover:brightness-110"
    >
      <Radio size={16} className="animate-pulse" />
      Live: {active.code} · {active.count} joined · return to session
    </Link>
  );
}
