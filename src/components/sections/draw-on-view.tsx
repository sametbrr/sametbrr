"use client";

import { useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

/** Sets data-drawn when visible so CSS draws the ArchDiagram inside (D1). */
export function DrawOnView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} data-drawn={inView ? "true" : "false"} className={className}>
      {children}
    </div>
  );
}
