"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Seamless broadcast-style crawl. Renders its children twice and translates
 * by -50% so the loop is continuous. CSS-only animation (paused on hover and
 * under prefers-reduced-motion via globals.css).
 */
export function Marquee({
  children,
  className,
  duration = 32,
  reverse = false,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <div className={cn("marquee group relative flex overflow-hidden", className)}>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent" />

      <div
        className={cn("marquee-track flex shrink-0 items-center", reverse && "reverse")}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        <div className="flex shrink-0 items-center" aria-hidden={false}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
