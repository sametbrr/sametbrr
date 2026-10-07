"use client";

import { m, useScroll } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * Vertical timeline rail (E1): a 1px line that fills with Ghost Green as the list scrolls past.
 * Entries are server-rendered children; each draws its own logo tile on the rail.
 */
export function TimelineRail({
  children,
  side = "left",
  fill = "down",
}: {
  children: ReactNode;
  side?: "left" | "right";
  /** "up" fills from the last entry to the first, for lists shown newest-first but read as growth. */
  fill?: "down" | "up";
}) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.6"] });
  const right = side === "right";
  return (
    <ol ref={ref} className={`relative grid gap-10 md:gap-12 ${right ? "pr-16 md:pr-20" : "pl-16 md:pl-20"}`}>
      <span aria-hidden className={`absolute top-2 bottom-2 w-px bg-line ${right ? "right-5 md:right-6" : "left-5 md:left-6"}`}>
        <m.span
          style={{ scaleY: scrollYProgress }}
          className={`absolute inset-0 bg-ghost motion-reduce:scale-y-100 ${fill === "up" ? "origin-bottom" : "origin-top"}`}
        />
      </span>
      {children}
    </ol>
  );
}
