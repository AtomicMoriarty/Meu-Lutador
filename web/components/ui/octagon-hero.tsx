"use client";

import { cn } from "@/lib/utils";

/** Regular octagon points (flat-top), centered at cx/cy with the given radius. */
function octagon(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 8) + (i * Math.PI) / 4; // rotate so it sits flat-top
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * Decorative animated octagon line-grid + spotlight, CSS/SVG only (no canvas, no libs).
 * Sits behind the hero. Honors prefers-reduced-motion via globals.css.
 */
export function OctagonHero({ className }: { className?: string }) {
  const rings = [86, 66, 46, 26];
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 8) + (i * Math.PI) / 4;
    return { x: 100 + 86 * Math.cos(a), y: 100 + 86 * Math.sin(a) };
  });

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* spotlight wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 28%, rgba(225,29,42,0.20), transparent 70%), radial-gradient(40% 35% at 50% 30%, rgba(245,181,63,0.10), transparent 70%)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[140%] max-w-[760px] -translate-x-1/2 -translate-y-1/2 sm:w-[110%]">
        <svg viewBox="0 0 200 200" className="octagon-breathe h-full w-full">
          <defs>
            <radialGradient id="oct-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f5b53f" stopOpacity="0.0" />
              <stop offset="55%" stopColor="#e11d2a" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#0a0a0c" stopOpacity="0.9" />
            </radialGradient>
          </defs>

          <g className="octagon-spin-slow" style={{ transformOrigin: "100px 100px" }}>
            {rings.map((r, i) => (
              <polygon
                key={r}
                points={octagon(100, 100, r)}
                fill="none"
                stroke={i === 0 ? "rgba(245,181,63,0.35)" : "rgba(225,29,42,0.22)"}
                strokeWidth={i === 0 ? 0.7 : 0.5}
              />
            ))}
            {spokes.map((s, i) => (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={s.x}
                y2={s.y}
                stroke="rgba(154,160,173,0.12)"
                strokeWidth="0.4"
              />
            ))}
          </g>

          {/* fade the outer edges into the page */}
          <rect x="0" y="0" width="200" height="200" fill="url(#oct-fade)" />
        </svg>
      </div>

      {/* bottom fade so content reads cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
