"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

// Glassy button with a trail of glowing circles following the pointer.
// Themed to gold→blood for the Octógono dos Sonhos.
const HoverButton = React.forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ className, children, ...props }, ref) => {
    const innerRef = React.useRef<HTMLButtonElement>(null);
    const buttonRef = (ref as React.RefObject<HTMLButtonElement>) ?? innerRef;
    const [isListening, setIsListening] = React.useState(false);
    const [circles, setCircles] = React.useState<
      Array<{ id: number; x: number; y: number; color: string; fadeState: "in" | "out" | null }>
    >([]);
    const lastAddedRef = React.useRef(0);

    const createCircle = React.useCallback((x: number, y: number) => {
      const width = buttonRef.current?.offsetWidth || 0;
      const xPos = width ? x / width : 0;
      const color = `linear-gradient(to right, var(--circle-start) ${xPos * 100}%, var(--circle-end) ${xPos * 100}%)`;
      setCircles((prev) => [...prev, { id: Date.now() + Math.random(), x, y, color, fadeState: null }]);
    }, [buttonRef]);

    const handlePointerMove = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!isListening) return;
        const now = Date.now();
        if (now - lastAddedRef.current > 100) {
          lastAddedRef.current = now;
          const rect = event.currentTarget.getBoundingClientRect();
          createCircle(event.clientX - rect.left, event.clientY - rect.top);
        }
      },
      [isListening, createCircle],
    );

    React.useEffect(() => {
      circles.forEach((circle) => {
        if (!circle.fadeState) {
          setTimeout(() => setCircles((p) => p.map((c) => (c.id === circle.id ? { ...c, fadeState: "in" } : c))), 0);
          setTimeout(() => setCircles((p) => p.map((c) => (c.id === circle.id ? { ...c, fadeState: "out" } : c))), 1000);
          setTimeout(() => setCircles((p) => p.filter((c) => c.id !== circle.id)), 2200);
        }
      });
    }, [circles]);

    return (
      <button
        ref={buttonRef}
        className={cn(
          "relative isolate cursor-pointer overflow-hidden rounded-2xl px-8 py-3.5 text-base font-bold leading-6 text-white",
          "bg-[rgba(225,29,42,0.12)] backdrop-blur-lg",
          "before:pointer-events-none before:absolute before:inset-0 before:z-[1] before:rounded-[inherit]",
          "before:shadow-[inset_0_0_0_1px_rgba(245,181,63,0.25),inset_0_0_16px_0_rgba(225,29,42,0.18),inset_0_-3px_12px_0_rgba(245,181,63,0.18),0_1px_3px_0_rgba(0,0,0,0.5),0_8px_30px_0_rgba(225,29,42,0.35)]",
          "before:transition-transform before:duration-300 active:before:scale-[0.975]",
          className,
        )}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsListening(true)}
        onPointerLeave={() => setIsListening(false)}
        {...props}
        style={{ ["--circle-start" as string]: "#f5b53f", ["--circle-end" as string]: "#e11d2a" }}
      >
        {circles.map(({ id, x, y, color, fadeState }) => (
          <div
            key={id}
            className={cn(
              "pointer-events-none absolute z-[-1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg transition-opacity duration-300",
              fadeState === "in" && "opacity-75",
              fadeState === "out" && "opacity-0 duration-[1.2s]",
              !fadeState && "opacity-0",
            )}
            style={{ left: x, top: y, background: color }}
          />
        ))}
        {children}
      </button>
    );
  },
);

HoverButton.displayName = "HoverButton";

export { HoverButton };
