"use client";

import { AnimatePresence, m, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { playSound } from "@/lib/sound";
import { track } from "@/lib/analytics";

/** 1px Ghost Green scroll progress bar (G2). */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return (
    <m.div
      aria-hidden
      style={{ scaleX }}
      className="scroll-progress fixed inset-x-0 top-0 z-[60] h-px origin-left bg-ghost motion-reduce:hidden"
    />
  );
}

/**
 * Floating back-to-top button (G2): appears after the first screen, its ring fills with the
 * scroll progress. A plain #top link, so Lenis scrolls it smoothly and it works without JS.
 */
export function BackToTop({ label }: { label: string }) {
  const { scrollY, scrollYProgress } = useScroll();
  const ring = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setShown(y > window.innerHeight * 0.8));

  return (
    <AnimatePresence>
      {shown && (
        <m.a
          href="#top"
          aria-label={label}
          title={label}
          data-sound="tap"
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="back-to-top glass group fixed right-4 bottom-4 z-50 grid size-12 place-items-center rounded-full text-fg-muted transition-colors duration-200 hover:text-ghost md:right-8 md:bottom-8"
        >
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden>
            <m.circle
              cx="24"
              cy="24"
              r="22.5"
              fill="none"
              stroke="var(--color-ghost)"
              strokeWidth="1.5"
              style={{ pathLength: ring }}
            />
          </svg>
          <svg
            viewBox="0 0 16 16"
            className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </m.a>
      )}
    </AnimatePresence>
  );
}

/** Copy-to-clipboard with copy → check morph (C2). */
export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    playSound("success");
    track("copy-email");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors duration-200 hover:border-line-strong hover:text-fg"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
        {copied ? (
          <m.path
            d="M3 8.5 6.5 12 13 4.5"
            stroke="var(--color-ghost)"
            strokeWidth="1.6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25 }}
          />
        ) : (
          <path
            d="M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        )}
      </svg>
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

/** Live Istanbul clock for the footer (F1). */
export function LocalClock({ locale }: { locale: string }) {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locale]);
  return <span className="tabular-nums">{now}</span>;
}
