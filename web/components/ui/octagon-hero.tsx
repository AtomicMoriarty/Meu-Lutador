"use client";

import { cn } from "@/lib/utils";

function octagon(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 8) + (i * Math.PI) / 4;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function OctagonHero({ className }: { className?: string }) {
  const rings = [90, 72, 54, 36, 18];
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 8) + (i * Math.PI) / 4;
    return { x: 100 + 90 * Math.cos(a), y: 100 + 90 * Math.sin(a) };
  });

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* Dual spotlight wash — cinematic arena lighting */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(70% 55% at 50% 25%, rgba(225,29,42,0.18), transparent 70%)",
            "radial-gradient(50% 40% at 50% 30%, rgba(245,181,63,0.08), transparent 65%)",
            "radial-gradient(30% 30% at 30% 60%, rgba(225,29,42,0.06), transparent 60%)",
            "radial-gradient(30% 30% at 70% 60%, rgba(245,181,63,0.04), transparent 60%)",
          ].join(", "),
        }}
      />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[150%] max-w-[800px] -translate-x-1/2 -translate-y-1/2 sm:w-[115%]">
        <svg viewBox="0 0 200 200" className="octagon-breathe h-full w-full">
          <defs>
            <radialGradient id="oct-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f5b53f" stopOpacity="0.0" />
              <stop offset="50%" stopColor="#e11d2a" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#07070a" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          <g className="octagon-spin-slow" style={{ transformOrigin: "100px 100px" }}>
            {rings.map((r, i) => (
              <polygon
                key={r}
                points={octagon(100, 100, r)}
                fill="none"
                stroke={
                  i === 0
                    ? "rgba(245,181,63,0.3)"
                    : i === 1
                      ? "rgba(225,29,42,0.2)"
                      : `rgba(154,160,173,${0.12 - i * 0.02})`
                }
                strokeWidth={i === 0 ? 0.8 : 0.4}
              />
            ))}
            {spokes.map((s, i) => (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={s.x}
                y2={s.y}
                stroke="rgba(154,160,173,0.08)"
                strokeWidth="0.3"
              />
            ))}
          </g>

          <rect x="0" y="0" width="200" height="200" fill="url(#oct-fade)" />
        </svg>
      </div>

      {/* Bottom + top fades */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/60 to-transparent" />
    </div>
  );
}
