"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";

import { m, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Pinned horizontal scroll for case cards on md+ (W1). The section is made
 * taller by the track's overflow; vertical scroll drives translateX.
 * Below md or with reduced motion it degrades to a plain vertical stack.
 */
export function HorizontalWork({ children, count }: { children: ReactNode; count: number }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [index, setIndex] = useState(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduce) return;

    const mq = window.matchMedia("(min-width: 768px)");
    const measure = () => setDistance(mq.matches ? Math.max(0, track.scrollWidth - window.innerWidth) : 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    const resize = () => measure();
    window.addEventListener("resize", resize);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
      mq.removeEventListener("change", measure);
    };
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: outerRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  useMotionValueEvent(scrollYProgress, "change", (p) => setIndex(Math.min(count, Math.max(1, Math.round(p * (count - 1)) + 1))));

  const pinned = !reduce && distance > 0;

  return (
    <div ref={outerRef} data-reduced-work={reduce ? "true" : "false"} style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}>
      <div className={pinned ? "sticky top-0 flex h-screen flex-col overflow-hidden pt-6" : reduce ? "" : "md:overflow-x-auto md:pb-6"}>
        {pinned && (
          <div className="container-site mb-8 flex items-center gap-4 font-mono text-xs text-fg-muted">
            <span className="tabular-nums text-ghost">{String(index).padStart(2, "0")}</span>
            <span className="relative h-px flex-1 bg-line">
              <m.span style={{ scaleX: scrollYProgress }} className="absolute inset-0 origin-left bg-ghost" />
            </span>
            <span className="tabular-nums">{String(count).padStart(2, "0")}</span>
          </div>
        )}
        <m.div
          ref={trackRef}
          style={pinned ? { x } : { x: 0 }}
          // Layout is horizontal on md+ via CSS alone, so the overflow can be measured before pinning.
          className={reduce ? "container-site grid gap-5 md:grid-cols-2" : "container-site grid gap-5 md:mx-0 md:flex md:w-max md:max-w-none md:pr-[10vw] md:pl-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))]"}
        >
          {children}
        </m.div>
      </div>
    </div>
  );
}
