"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ATTRIBUTE_SLOTS, type Build, type FullFighter } from "@/lib/types";
import { Button, cx } from "./ui";

/** Pick which attribute slot to assign the chosen fighter to. Values are hidden —
 *  the player chooses by the fighter's reputation, not by numbers. */
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="card relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-mist">Encaixar em qual atributo?</p>
                <h3 className="truncate text-lg font-extrabold text-glow">{fighter.name}</h3>
                {fighter.nickname && <p className="truncate text-xs text-mist">“{fighter.nickname}”</p>}
              </div>
              <button onClick={onClose} className="rounded-lg px-3 py-1 text-mist hover:bg-white/10" aria-label="Fechar">✕</button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
              {ATTRIBUTE_SLOTS.map((s) => {
                const taken = build[s.attribute_name];
                return (
                  <motion.button
                    key={s.attribute_name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onAssign(s.attribute_name)}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                      taken ? "border-gold/40 bg-gold/[0.06]" : "border-line bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-3 text-lg" aria-hidden>{s.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.label}</p>
                      {taken && <p className="truncate text-[11px] text-gold/80">ocupado: {taken.name}</p>}
                    </div>
                    {taken && <span className="text-gold" aria-hidden>↺</span>}
                  </motion.button>
                );
              })}
            </div>

            <div className="border-t border-line p-3">
              <Button variant="ghost" className="w-full" onClick={onClose}>Cancelar</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
