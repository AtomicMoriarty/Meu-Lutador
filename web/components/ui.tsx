"use client";
import { motion } from "framer-motion";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function StatBar({ value, tone = "blood" }: { value: number; tone?: "blood" | "gold" }) {
  const color = tone === "gold" ? "var(--color-gold)" : "var(--color-blood-2)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "gold";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-wide transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
  const styles = {
    primary: "bg-blood text-white hover:brightness-110 shadow-[0_8px_30px_rgba(225,29,42,0.35)]",
    gold: "bg-gold text-black hover:brightness-110 shadow-[0_8px_30px_rgba(245,181,63,0.3)]",
    ghost: "border border-line bg-white/5 text-white hover:bg-white/10",
  }[variant];
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cx(base, styles, className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-mist">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-blood" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
