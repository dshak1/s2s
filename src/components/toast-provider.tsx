"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toastBus, type Toast } from "@/lib/toast";

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toastBus.subscribe((toast) => {
      setToasts((prev) => [toast, ...prev]);
      setTimeout(() => dismiss(toast.id), toast.duration ?? 4000);
    });
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto flex min-w-[240px] max-w-[300px] items-start gap-3 rounded-2xl bg-steppe px-4 py-3 text-warm shadow-2xl shadow-steppe/40"
          >
            {t.icon && <span className="flex-shrink-0 text-xl leading-tight">{t.icon}</span>}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black leading-tight">{t.title}</div>
              {t.body && <div className="mt-0.5 text-xs text-warm/75">{t.body}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 text-warm/50 hover:text-warm"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
