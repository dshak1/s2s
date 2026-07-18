// Module-level toast event bus — no React dependency.
// Any module (including store.ts) can fire toasts; ToastProvider renders them.

export type Toast = {
  id: string;
  title: string;
  body?: string;
  icon?: string;
  duration?: number; // ms, default 4000
};

type ToastListener = (t: Toast) => void;
const listeners = new Set<ToastListener>();

export const toastBus = {
  show(t: Omit<Toast, "id">) {
    if (typeof window === "undefined") return;
    const full: Toast = { duration: 4000, ...t, id: crypto.randomUUID() };
    listeners.forEach((l) => l(full));
  },
  subscribe(cb: ToastListener) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
