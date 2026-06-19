"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { SlotOption } from "@/lib/types";
import { Button, Spinner, StatBar, cx } from "./ui";

type Slot = { attribute_name: string; label: string; emoji: string };

export function SlotSheet({
  slot,
  options,
  loading,
  current,
  refreshesLeft,
  onRefresh,
  onPick,
  onClose,
}: {
  slot: Slot | null;
  options: SlotOption[] | undefined;
  loading: boolean;
  current?: string;
  refreshesLeft: number;
  onRefresh: () => void;
  onPick: (o: SlotOption) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {slot && (
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
              <div>
                <p className="text-[11px] uppercase tracking-widest text-mist">Sorteados — escolha 1</p>
                <h3 className="text-lg font-extrabold text-glow">
                  {slot.emoji} {slot.label}
                </h3>
              </div>
              <button onClick={onClose} className="rounded-lg px-3 py-1 text-mist hover:bg-white/10">✕</button>
            </div>

            <div className="min-h-[200px] flex-1 overflow-y-auto p-3">
              {loading && (
                <div className="grid place-items-center py-12">
                  <Spinner label="Sorteando 10 lutadores…" />
                </div>
              )}
              {!loading &&
                (options ?? []).map((o, i) => {
                  const selected = o.fighter_id === current;
                  return (
                    <motion.button
                      key={o.fighter_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => onPick(o)}
                      className={cx(
                        "mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                        selected ? "border-blood bg-blood/10" : "border-line bg-white/[0.03] hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-3 text-lg font-black text-gold">
                        {Math.round(o.value)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{o.name}</span>
                        {o.nickname && <p className="truncate text-xs text-mist">“{o.nickname}”</p>}
                        <div className="mt-1.5"><StatBar value={o.value} /></div>
                      </div>
                      {selected && <span className="text-blood">✓</span>}
                    </motion.button>
                  );
                })}
            </div>

            <div className="flex items-center gap-3 border-t border-line p-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={onRefresh}
                disabled={loading || refreshesLeft <= 0}
              >
                🎲 Re-sortear ({refreshesLeft})
              </Button>
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
