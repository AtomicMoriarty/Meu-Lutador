"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/** Minimal blood-toned toast. Auto-dismisses; render conditionally from a parent's error state. */
export function Toast({
  message,
  onClose,
  duration = 5000,
}: {
  message: string | null;
  onClose: () => void;
  duration?: number;
}) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-blood/40 bg-ink-2/95 p-3 shadow-[0_12px_40px_-10px_rgba(99,102,241,0.5)] backdrop-blur"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-blood-2" aria-hidden />
            <p className="flex-1 text-sm text-mist-2">{message}</p>
            <button
              onClick={onClose}
              aria-label="Fechar aviso"
              className="rounded-md p-1 text-mist transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
