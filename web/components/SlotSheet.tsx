"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { AttributeSlot, SlotOption } from "@/lib/types";
import { Button, ConfidenceBadge, Spinner, StatBar, cx } from "./ui";

export function SlotSheet({
  slot,
  options,
  loading,
  current,
  onPick,
  onClose,
}: {
  slot: AttributeSlot | null;
  options: SlotOption[] | undefined;
  loading: boolean;
  current?: string;
  onPick: (o: SlotOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(""), [slot?.attribute_name]);

  const filtered = (options ?? []).filter((o) =>
    o.name?.toLowerCase().includes(query.toLowerCase()),
  );

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
            className="card relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-mist">Escolha de quem herdar</p>
                <h3 className="text-lg font-extrabold text-glow">{slot.label}</h3>
              </div>
              <button onClick={onClose} className="rounded-lg px-3 py-1 text-mist hover:bg-white/10">✕</button>
            </div>

            <div className="p-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar lutador…"
                className="w-full rounded-lg border border-line bg-ink-3 px-3 py-2 text-sm outline-none focus:border-blood"
              />
            </div>

            <div className="min-h-[200px] flex-1 overflow-y-auto px-3 pb-4">
              {loading && (
                <div className="grid place-items-center py-10">
                  <Spinner label="Carregando elenco…" />
                </div>
              )}
              {!loading &&
                filtered.map((o, i) => {
                  const selected = o.fighter_id === current;
                  return (
                    <motion.button
                      key={o.fighter_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      onClick={() => onPick(o)}
                      className={cx(
                        "mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                        selected ? "border-blood bg-blood/10" : "border-line bg-white/[0.03] hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-3 font-black text-gold">
                        {Math.round(o.value)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-bold">{o.name}</span>
                          <ConfidenceBadge c={o.confidence} />
                        </div>
                        {o.nickname && <p className="truncate text-xs text-mist">“{o.nickname}”</p>}
                        <div className="mt-1.5"><StatBar value={o.value} /></div>
                      </div>
                      {selected && <span className="text-blood">✓</span>}
                    </motion.button>
                  );
                })}
              {!loading && filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-mist">Nenhum lutador encontrado.</p>
              )}
            </div>

            <div className="border-t border-line p-3">
              <Button variant="ghost" className="w-full" onClick={onClose}>Fechar</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
