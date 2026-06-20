"use client";

import * as React from "react";
import { type HTMLMotionProps, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticCtaProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  children: React.ReactNode;
  /** "blood" (primary) or "gold" (championship). */
  tone?: "blood" | "gold";
  /** idle sheen sweep across the surface. */
  shine?: boolean;
}

/**
 * Premium primary CTA: subtle magnetic pull toward the pointer, a glossy idle
 * sheen, gold focus ring, and a tactile press. Magnetic pull and sheen are
 * disabled under prefers-reduced-motion.
 */
export const MagneticCta = React.forwardRef<HTMLButtonElement, MagneticCtaProps>(
  ({ children, className, tone = "blood", shine = true, ...props }, ref) => {
    const reduce = useReducedMotion();
    const inner = React.useRef<HTMLButtonElement>(null);
    const btnRef = (ref as React.RefObject<HTMLButtonElement>) ?? inner;

    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.4 });
    const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.4 });
    const tx = useTransform(x, (v) => v * 0.25);
    const ty = useTransform(y, (v) => v * 0.25);

    function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
      if (reduce) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mx.set(e.clientX - rect.left - rect.width / 2);
      my.set(e.clientY - rect.top - rect.height / 2);
    }
    function reset() {
      mx.set(0);
      my.set(0);
    }

    const palette =
      tone === "gold"
        ? "from-gold to-gold-2 text-ink shadow-[0_10px_40px_-8px_rgba(245,181,63,0.55)]"
        : "from-blood-2 to-blood text-white shadow-[0_10px_40px_-8px_rgba(225,29,42,0.6)]";

    return (
      <motion.button
        ref={btnRef}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        whileTap={{ scale: 0.97 }}
        style={{ x: reduce ? 0 : tx, y: reduce ? 0 : ty }}
        className={cn(
          "group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b px-7 py-4 text-base font-extrabold tracking-wide",
          "ring-1 ring-inset ring-white/15 transition-[filter] duration-200 hover:brightness-110",
          "disabled:pointer-events-none disabled:opacity-40",
          palette,
          shine && !reduce && "sheen-on-idle",
          className,
        )}
        {...props}
      >
        <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
      </motion.button>
    );
  },
);

MagneticCta.displayName = "MagneticCta";
