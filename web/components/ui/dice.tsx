"use client";
import { motion, useAnimation } from "framer-motion";
import { useState, useCallback } from "react";

const FACE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function Face({ value, className }: { value: number; className?: string }) {
  const dots = FACE_DOTS[value] ?? FACE_DOTS[1]!;
  return (
    <div className={`absolute grid size-full place-items-center ${className ?? ""}`}>
      <svg viewBox="0 0 100 100" className="size-full">
        <rect x="4" y="4" width="92" height="92" rx="16" fill="var(--color-ink-3)" stroke="var(--color-line)" strokeWidth="2" />
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" fill="var(--color-gold)" />
        ))}
      </svg>
    </div>
  );
}

const ROLL_ANGLES: [number, number][] = [
  [0, 0],       // 1 front
  [0, 180],     // 6 back
  [0, -90],     // 3 right
  [0, 90],      // 4 left
  [-90, 0],     // 2 top
  [90, 0],      // 5 bottom
];

export function Dice({ rolling, disabled, onRoll }: { rolling: boolean; disabled?: boolean; onRoll: () => void }) {
  const controls = useAnimation();
  const [landed, setLanded] = useState({ x: 0, y: 0 });

  const handle = useCallback(async () => {
    if (rolling || disabled) return;
    onRoll();

    const spinsX = (2 + Math.floor(Math.random() * 3)) * 360;
    const spinsY = (2 + Math.floor(Math.random() * 3)) * 360;
    const face = Math.floor(Math.random() * 6);
    const [fx, fy] = ROLL_ANGLES[face]!;
    const finalX = spinsX + fx;
    const finalY = spinsY + fy;

    await controls.start({
      rotateX: [landed.x, landed.x + spinsX * 0.4, finalX],
      rotateY: [landed.y, landed.y + spinsY * 0.6, finalY],
      y: [0, -28, 0],
      transition: {
        duration: 1.1,
        ease: [0.15, 0.8, 0.3, 1],
        times: [0, 0.35, 1],
      },
    });

    setLanded({ x: finalX, y: finalY });
  }, [rolling, disabled, onRoll, controls, landed]);

  return (
    <motion.button
      onClick={handle}
      disabled={rolling || disabled}
      whileTap={{ scale: 0.94 }}
      aria-label="Sortear 10 lutadores"
      className="group relative grid size-24 place-items-center disabled:opacity-40"
      style={{ perspective: 400 }}
    >
      {/* glow underneath */}
      <div
        className="pointer-events-none absolute inset-2 rounded-2xl opacity-60 blur-xl"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%)" }}
        aria-hidden
      />

      <motion.div
        animate={controls}
        className="relative"
        style={{
          width: 64,
          height: 64,
          transformStyle: "preserve-3d",
          rotateX: landed.x,
          rotateY: landed.y,
        }}
      >
        {/* front  (1) */}
        <Face value={1} className="[transform:translateZ(32px)]" />
        {/* back   (6) */}
        <Face value={6} className="[transform:rotateY(180deg)_translateZ(32px)]" />
        {/* right  (3) */}
        <Face value={3} className="[transform:rotateY(90deg)_translateZ(32px)]" />
        {/* left   (4) */}
        <Face value={4} className="[transform:rotateY(-90deg)_translateZ(32px)]" />
        {/* top    (2) */}
        <Face value={2} className="[transform:rotateX(90deg)_translateZ(32px)]" />
        {/* bottom (5) */}
        <Face value={5} className="[transform:rotateX(-90deg)_translateZ(32px)]" />
      </motion.div>

      <span className="pointer-events-none absolute -bottom-1 text-[10px] font-bold uppercase tracking-widest text-mist/50 transition-opacity group-disabled:opacity-0">
        Rolar
      </span>
    </motion.button>
  );
}
