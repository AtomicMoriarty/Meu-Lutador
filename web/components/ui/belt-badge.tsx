"use client";

import { cn } from "@/lib/utils";

/** Octagon championship plate in gold foil. Pure SVG. */
export function BeltBadge({ className, size = 84 }: { className?: string; size?: number }) {
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl" aria-hidden />
      <svg viewBox="0 0 100 100" width={size} height={size} className="relative" aria-hidden>
        <defs>
          <linearGradient id="belt-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="55%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>
        {/* outer plate */}
        <polygon
          points="50,6 80,20 94,50 80,80 50,94 20,80 6,50 20,20"
          fill="url(#belt-foil)"
          stroke="#78350f"
          strokeWidth="1.5"
        />
        {/* inner ring */}
        <polygon
          points="50,18 72,28 82,50 72,72 50,82 28,72 18,50 28,28"
          fill="none"
          stroke="rgba(10,10,12,0.55)"
          strokeWidth="2"
        />
        {/* center mark */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="26"
          fontWeight="900"
          fill="#0a0a0c"
        >
          8:0
        </text>
      </svg>
    </div>
  );
}
