"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ATTRIBUTE_SLOTS, type Build, type FullFighter } from "@/lib/types";
import { SlotIcon } from "./ui/slot-icon";
import { cx } from "./ui";

export function FighterAssignSheet({
  fighter,
  build,
  onAssign,
  onClose,
}: {
  fighter: FullFighter | null;
  build: Build;
  onAssign: (attribute_name: string) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {fighter && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-ink-2/95 backdrop-blur-xl sm:rounded-2xl"
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
          >
            {/* Top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blood/50 to-transparent" />

            <div className="flex items-center justify-between border-b border-line p-5">
              <div className="min-w-0">
                <p className="eyebrow text-blood-2">Encaixar em qual atributo?</p>
                <h3 className="mt-1 truncate text-xl font-extrabold text-glow">{fighter.name}</h3>
                {fighter.nickname && <p className="truncate text-xs text-mist">"{fighter.nickname}"</p>}
              </div>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-lg text-mist transition hover:bg-white/10 hover:text-white" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2.5 overflow-y-auto p-4 sm:grid-cols-2">
              {ATTRIBUTE_SLOTS.map((s, i) => {
                const taken = build[s.attribute_name];
                return (
                  <motion.button
                    key={s.attribute_name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onAssign(s.attribute_name)}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                      taken ? "border-gold/40 bg-gold/[0.06]" : "border-line bg-smoke hover:bg-smoke-2 hover:border-blood/30",
                    )}
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink-3" aria-hidden><SlotIcon name={s.icon} className="size-5 text-mist-2" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.label}</p>
                      {taken && <p className="truncate text-[11px] text-gold/80">ocupado: {taken.name}</p>}
                    </div>
                    {taken && <span className="text-gold" aria-hidden>↺</span>}
                  </motion.button>
                );
              })}
            </div>

            <div className="border-t border-line p-4">
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-line bg-smoke px-5 py-3 text-sm font-bold text-mist-2 transition hover:bg-smoke-2 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
