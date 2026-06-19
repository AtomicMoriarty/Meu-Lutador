"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// Themed to the "Octógono dos Sonhos" palette (blood red / gold over near-black).
export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = "rgb(10, 10, 12)",
  gradientBackgroundEnd = "rgb(18, 8, 10)",
  firstColor = "225, 29, 42",
  secondColor = "245, 181, 63",
  thirdColor = "120, 20, 32",
  fourthColor = "200, 50, 50",
  fifthColor = "245, 181, 63",
  pointerColor = "225, 29, 42",
  size = "80%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = true,
  containerClassName,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState({ x: 0, y: 0 });
  const [tg, setTg] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const b = document.body.style;
    b.setProperty("--gradient-background-start", gradientBackgroundStart);
    b.setProperty("--gradient-background-end", gradientBackgroundEnd);
    b.setProperty("--first-color", firstColor);
    b.setProperty("--second-color", secondColor);
    b.setProperty("--third-color", thirdColor);
    b.setProperty("--fourth-color", fourthColor);
    b.setProperty("--fifth-color", fifthColor);
    b.setProperty("--pointer-color", pointerColor);
    b.setProperty("--size", size);
    b.setProperty("--blending-value", blendingValue);
  }, [gradientBackgroundStart, gradientBackgroundEnd, firstColor, secondColor, thirdColor, fourthColor, fifthColor, pointerColor, size, blendingValue]);

  useEffect(() => {
    if (!interactiveRef.current) return;
    const id = setInterval(() => {
      setCur((c) => {
        const nx = c.x + (tg.x - c.x) / 20;
        const ny = c.y + (tg.y - c.y) / 20;
        if (interactiveRef.current) {
          interactiveRef.current.style.transform = `translate(${Math.round(nx)}px, ${Math.round(ny)}px)`;
        }
        return { x: nx, y: ny };
      });
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [tg]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveRef.current) return;
    const rect = interactiveRef.current.getBoundingClientRect();
    setTg({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName,
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn("", className)}>{children}</div>
      <div className={cn("gradients-container h-full w-full blur-lg", isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]")}>
        <div className={cn("absolute [background:radial-gradient(circle_at_center,_rgba(var(--first-color),0.8)_0,_rgba(var(--first-color),0)_50%)_no-repeat]", "[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]", "[transform-origin:center_center] animate-first opacity-100")} />
        <div className={cn("absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),0.8)_0,_rgba(var(--second-color),0)_50%)_no-repeat]", "[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]", "[transform-origin:calc(50%-400px)] animate-second opacity-100")} />
        <div className={cn("absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),0.8)_0,_rgba(var(--third-color),0)_50%)_no-repeat]", "[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]", "[transform-origin:calc(50%+400px)] animate-third opacity-100")} />
        <div className={cn("absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),0.8)_0,_rgba(var(--fourth-color),0)_50%)_no-repeat]", "[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]", "[transform-origin:calc(50%-200px)] animate-fourth opacity-70")} />
        <div className={cn("absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),0.8)_0,_rgba(var(--fifth-color),0)_50%)_no-repeat]", "[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]", "[transform-origin:calc(50%-800px)_calc(50%+800px)] animate-fifth opacity-100")} />
        {interactive && (
          <div ref={interactiveRef} onMouseMove={handleMouseMove} className={cn("absolute [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),0.8)_0,_rgba(var(--pointer-color),0)_50%)_no-repeat]", "[mix-blend-mode:var(--blending-value)] w-full h-full -top-1/2 -left-1/2 opacity-60")} />
        )}
      </div>
    </div>
  );
};
