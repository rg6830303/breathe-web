"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X, AlertTriangle } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastCtx = createContext<{
  show: (message: string, kind?: ToastKind) => void;
} | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = t.kind === "success" ? Check : t.kind === "error" ? AlertTriangle : Info;
            const tone =
              t.kind === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : t.kind === "error"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-brand/20 bg-white text-ink";
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-card backdrop-blur ${tone}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{t.message}</span>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-50 hover:opacity-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  // No-op fallback so callers never crash outside the provider.
  return ctx ?? { show: () => {} };
}
