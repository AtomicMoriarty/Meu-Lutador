"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export function Dice({ rolling, onRoll }: { rolling: boolean; onRoll: () => void }) {
  const [spins, setSpins] = useState(0);
  function handle() {
    if (rolling) return;
    setSpins((s) => s + 1);
    onRoll();
  }
  return (
    <motion.button
      onClick={handle}
      disabled={rolling}
      whileTap={{ scale: 0.92 }}
      aria-label="Sortear 10 lutadores"
      className="group relative grid size-20 place-items-center rounded-2xl border border-gold/40 bg-gradient-to-b from-ink-3 to-ink shadow-[0_10px_40px_-12px_rgba(245,181,63,0.5)] disabled:opacity-70"
    >
      <span className="sheen-on-idle pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden />
      <motion.span
        className="text-4xl"
        animate={{ rotate: spins * 720 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        🎲
      </motion.span>
    </motion.button>
  );
}
