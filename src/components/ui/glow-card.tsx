"use client";

import type { ComponentProps, PointerEvent } from "react";

/** Card with a pointer-following border glow (DESIGN.md S2). Pure CSS vars, no rerenders. */
export function GlowCard({ className = "", onPointerMove, ...rest }: ComponentProps<"div">) {
  function track(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
    onPointerMove?.(e);
  }
  return <div onPointerMove={track} className={`glow-card ${className}`} {...rest} />;
}
