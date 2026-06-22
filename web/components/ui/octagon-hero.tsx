"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Hero backdrop: the pixel-art octagon (top-down) as the centerpiece, with
 * cinematic spotlight wash + dark fades so the title/CTA stay legible on top.
 * The image lives at /public/octagon-hero.png. If it's missing it simply
 * hides itself (no broken-image icon) and the spotlight wash carries the hero.
 */
export function OctagonHero({ className }: { className?: string }) {
  const [hasArt, setHasArt] = React.useState(true);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* Dual spotlight wash — cinematic arena lighting */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(70% 55% at 50% 32%, rgba(99,102,241,0.16), transparent 70%)",
            "radial-gradient(50% 40% at 50% 36%, rgba(245,158,11,0.06), transparent 65%)",
            "radial-gradient(30% 30% at 28% 62%, rgba(99,102,241,0.05), transparent 60%)",
            "radial-gradient(30% 30% at 72% 62%, rgba(245,158,11,0.03), transparent 60%)",
          ].join(", "),
        }}
      />

      {/* Pixel-art octagon centerpiece */}
      {hasArt && (
        <div className="absolute left-1/2 top-[44%] aspect-square w-[min(108vw,640px)] -translate-x-1/2 -translate-y-1/2">
          {/* glow halo behind the art */}
          <div
            className="absolute inset-[8%] rounded-[28%] blur-2xl"
            style={{ background: "radial-gradient(circle at 50% 45%, rgba(99,102,241,0.28), transparent 65%)" }}
          />
          <img
            src="/octagon-hero.png"
            alt=""
            onError={() => setHasArt(false)}
            className="octagon-breathe relative h-full w-full select-none object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.85)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      )}

      {/* Bottom + top fades — keep title/CTA readable */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/60 to-transparent" />
    </div>
  );
}
