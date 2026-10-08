"use client";

import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Manifesto: each word goes 0.15 → 1 opacity as the paragraph scrolls through (A1). */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) return <m.p ref={ref} className={className} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.16 }}>{text}</m.p>;

  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i}>
          <Word progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {word}
          </Word>{" "}
        </span>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <m.span aria-hidden style={{ opacity }} className="inline-block">
      {children}
    </m.span>
  );
}
