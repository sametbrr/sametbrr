"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { whenBooted } from "./slot";

const WAVE_MS = 900;
const STEP_MS = 22;

/**
 * Hero H1 (DESIGN.md §6 H2). It is the LCP element, so it is fully painted on the first frame
 * and never hidden: motion only plays on top of the visible text.
 * - Lead: a ripple travels letter by letter (lift + Ghost Green flash), once when the boot
 *   screen lifts and again on hover (throttled).
 * - Accent: a light band sweeps through the gradient text (no DOM changes, so background-clip
 *   text keeps working), layered on the slow gradient pan.
 */
export function HeroHeadline({ lead, accent, className }: { lead: string; accent: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const h1 = ref.current;
    if (!h1 || reduce) return;
    const total = [...lead.replace(/\s/g, "")].length;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const play = () => {
      if (busy) return;
      busy = true;
      h1.classList.remove("is-waving", "is-shining");
      void h1.offsetWidth; // restart the CSS animations
      h1.classList.add("is-waving", "is-shining");
      timer = setTimeout(() => (busy = false), WAVE_MS + total * STEP_MS);
    };

    const stopBoot = whenBooted(() => (timer = setTimeout(play, 150)));
    h1.addEventListener("pointerenter", play);
    return () => {
      stopBoot();
      clearTimeout(timer);
      h1.removeEventListener("pointerenter", play);
    };
  }, [lead, reduce]);

  let i = 0;
  const words = lead.trim().split(/\s+/);

  return (
    <h1 ref={ref} aria-label={`${lead}${accent}`} className={`hero-headline ${className ?? ""}`}>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w}>
            <span className="inline-block whitespace-nowrap">
              {[...word].map((c) => (
                <span key={i} className="wave-char" style={{ "--i": i++ } as React.CSSProperties}>
                  {c}
                </span>
              ))}
            </span>{" "}
          </span>
        ))}
        {accent && <span className="headline-accent">{accent}</span>}
      </span>
    </h1>
  );
}
