"use client";

import Lenis from "lenis";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { useEffect, type ReactNode } from "react";

/** Global motion setup: lazy feature bundle, user-respecting reduced motion, Lenis (G1). */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduce]);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduce ? "always" : "never"}>{children}</MotionConfig>
    </LazyMotion>
  );
}
