"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import Link from "next/link";
import type { ComponentProps, PointerEvent } from "react";

const PULL = 6;

/** Primary CTA with a ±6px magnetic pull and sliding arrow (H7). */
export function MagneticLink({
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link>) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });

  function move(e: PointerEvent<HTMLSpanElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 2 * PULL);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 2 * PULL);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.span style={{ x, y }} onPointerMove={move} onPointerLeave={reset} className="inline-flex">
      <Link className={`group ${className}`} {...rest}>
        {children}
      </Link>
    </m.span>
  );
}
