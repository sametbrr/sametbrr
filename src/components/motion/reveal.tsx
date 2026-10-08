"use client";

import { m, useInView, type HTMLMotionProps } from "motion/react";
import { useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type RevealProps = HTMLMotionProps<"div"> & {
  delay?: number;
  /** "up" for text (y 24 → 0), "scale" for cards (0.96 → 1). */
  variant?: "up" | "scale";
};

/** One-shot entrance when 20% visible (DESIGN.md §5). */
export function Reveal({ delay = 0, variant = "up", children, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  const from = reduce ? { opacity: 0 } : variant === "scale" ? { opacity: 0, scale: 0.96 } : { opacity: 0, y: 24 };
  return (
    <m.div
      initial={from}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.16 : 0.7, delay: reduce ? 0 : delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/** Mask-rise for headlines: each word slides up from behind its own clip (C1). */
export function RiseWords({ text, className }: { text: string; className?: string }) {
  // Watch the line, not the words: a word parked below its clip is fully clipped, so it never
  // counts as in view and would stay hidden forever.
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) return <m.span ref={ref} className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>{text}</m.span>;
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <m.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={inView ? { y: 0 } : undefined}
            transition={{ duration: 0.7, delay: i * 0.06, ease: EASE_OUT }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </m.span>
        </span>
      ))}
    </span>
  );
}
