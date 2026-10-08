"use client";

import { useEffect, useRef, type ComponentProps, type PointerEvent } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Card with a pointer-following border glow (DESIGN.md S2). Pure CSS vars, no rerenders. */
export function GlowCard({ className = "", onPointerMove, onPointerLeave, ...rest }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const clear = () => {
    ref.current?.style.removeProperty("--mx");
    ref.current?.style.removeProperty("--my");
  };
  useEffect(() => { if (reduce) clear(); }, [reduce]);
  function track(e: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(e);
    if (reduce || e.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }
  return <div ref={ref} onPointerMove={track} onPointerLeave={(e) => { clear(); onPointerLeave?.(e); }} className={`glow-card ${className}`} {...rest} />;
}
