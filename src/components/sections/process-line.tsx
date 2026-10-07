"use client";

import { m, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";

/** Process steps joined by a line that fills with scroll; the active number turns Ghost Green (P1). */
export function ProcessLine({ steps }: { steps: { title: string; text: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.5"] });
  const [active, setActive] = useState(-1);
  useMotionValueEvent(scrollYProgress, "change", (p) => setActive(Math.floor(p * steps.length - 0.01)));

  return (
    <ol ref={ref} className="relative grid gap-10 md:grid-cols-4 md:gap-6">
      <span aria-hidden className="absolute top-4 right-0 left-0 hidden h-px bg-line md:block">
        <m.span style={{ scaleX: scrollYProgress }} className="absolute inset-0 origin-left bg-ghost motion-reduce:scale-x-100" />
      </span>
      <span aria-hidden className="absolute top-0 bottom-0 left-4 w-px bg-line md:hidden">
        <m.span style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top bg-ghost motion-reduce:scale-y-100" />
      </span>
      {steps.map((step, i) => (
        <li key={step.title} className="relative pl-14 md:pl-0">
          <span
            className={`absolute left-0 grid size-8 place-items-center rounded-full border bg-void font-mono text-xs transition-colors duration-300 md:static md:mb-6 ${
              i <= active ? "border-ghost text-ghost" : "border-line-strong text-fg-subtle"
            }`}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="text-h3 mb-3">{step.title}</h3>
          <p className="text-fg-muted">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
