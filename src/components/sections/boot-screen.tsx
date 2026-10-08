"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { slotText } from "slot-text";
import { announceBooted } from "@/components/motion/slot";
import { isSoundOn, muteSoundForSession, playSound, setSoundOn } from "@/lib/sound";
import { BOOT_SESSION_KEY as SESSION_KEY } from "@/lib/init-scripts";
import { track } from "@/lib/analytics";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const DURATION = 2700;
/** Nobody is trapped behind the sound question: without an answer the boot runs on, muted. */
const ASK_TIMEOUT_MS = 6000;

type BootDict = { title: string; label: string; logs: string[]; soundAsk: string; soundOn: string; soundOff: string };

/** "ask": waiting for the sound choice (the click is what lets the browser play audio). */
type Phase = "ask" | "run";

/**
 * Full-screen "system booting" screen (DESIGN.md §6 B1, keremcan.net reference): a rolling
 * 000 → 100% counter, boot log lines and a progress rule, then the panel lifts away.
 * Server-rendered so it is there on the first frame; the hero intro waits for `site:booted`.
 * The boot is the main sound moment, so it first asks for sound (DESIGN.md §8).
 */
export function BootScreen({ name, year, dict }: { name: string; year: number; dict: BootDict }) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const reduce = useReducedMotion();
  const bootRef = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  const previousOverflow = useRef("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finishBoot = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    timers.current.forEach(clearTimeout);
    const moveFocus = bootRef.current?.contains(document.activeElement);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    document.documentElement.style.overflow = previousOverflow.current;
    setGone(true);
    announceBooted();
    if (moveFocus) {
      const main = document.querySelector<HTMLElement>("main");
      main?.setAttribute("tabindex", "-1");
      main?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const pendingTimers = timers.current;
    previousOverflow.current = root.style.overflow;
    if (root.dataset.booted) { announceBooted(); return; }
    root.style.overflow = "hidden";
    const id = setTimeout(() => setPhase(isSoundOn() ? "ask" : "run"), 0);
    return () => {
      clearTimeout(id);
      pendingTimers.forEach(clearTimeout);
      root.style.overflow = previousOverflow.current;
    };
  }, []);

  useEffect(() => { if (reduce) finishBoot(); }, [reduce, finishBoot]);

  useEffect(() => {
    if (phase !== "ask" || reduce) return;
    soundButtonRef.current?.focus();
    const timer = setTimeout(() => { muteSoundForSession(); setPhase("run"); }, ASK_TIMEOUT_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSoundOn(false); setPhase("run"); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [phase, reduce]);

  useEffect(() => {
    if (phase !== "run" || reduce || completed.current) return;
    const pendingTimers = timers.current;
    const counter = counterRef.current ? slotText(counterRef.current, "000") : null;
    const start = performance.now();
    const eased = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const inOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return 0.75 * t + 0.25 * inOut;
    };
    let shown = 0;
    const beat = setInterval(() => {
      const value = Math.round(eased(performance.now()) * 100);
      if (value === shown || value >= 100) return;
      shown = value;
      counter?.set(String(value).padStart(3, "0"), { stagger: 12, duration: 100 });
      playSound("tick", 1 + value / 125);
    }, 140);
    let didComplete = false;
    const complete = () => {
      if (didComplete) return;
      didComplete = true;
      clearInterval(beat);
      setProgress(1);
      counter?.set("100", { stagger: 12, duration: 100 });
      playSound("ting");
      pendingTimers.push(setTimeout(() => {
        setLeaving(true);
        playSound("whoosh");
        pendingTimers.push(setTimeout(finishBoot, 1050));
      }, 380));
    };
    // Finish even when a background tab pauses animation frames.
    pendingTimers.push(setTimeout(complete, DURATION));
    let frame = requestAnimationFrame(function tick(now) {
      if (didComplete) return;
      const e = eased(now);
      setProgress(e);
      if (e < 1) frame = requestAnimationFrame(tick);
      else complete();
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(beat);
      pendingTimers.forEach(clearTimeout);
      counter?.destroy();
    };
  }, [phase, reduce, finishBoot]);

  function choose(sound: boolean) {
    setSoundOn(sound);
    track("sound-choice", { sound: sound ? "on" : "off" });
    setPhase("run");
  }

  if (gone) return null;

  // First line at 0%, last ("ready") exactly at 100%; nothing while the sound question is open.
  const visibleLogs = phase === "run" ? dict.logs.filter((_, i) => progress >= i / (dict.logs.length - 1)) : [];
  const asking = phase === "ask";

  return (
    <div
      ref={bootRef}
      data-phase={phase ?? "pending"}
      data-leaving={leaving}
      aria-hidden={!asking}
      onTransitionEnd={(e) => { if (e.target === e.currentTarget && ["transform", "translate"].includes(e.propertyName) && leaving) finishBoot(); }}
      className={`boot-screen fixed inset-0 z-[100] flex flex-col justify-between bg-void p-5 text-fg transition-transform duration-[900ms] ease-[var(--ease-in-out)] md:p-10 ${
        phase ? "is-live" : ""
      } ${leaving ? "-translate-y-full" : ""}`}
    >
      <div aria-hidden className="flex flex-col items-start justify-between gap-5 md:flex-row md:gap-8">
        <span className="text-[clamp(3.5rem,9vw,10rem)] leading-[0.9] font-semibold tracking-[-0.05em] text-fg">
          {name}
        </span>
        <span className="shrink-0 font-mono text-xs tracking-[0.14em] text-fg-muted uppercase">
          {dict.label} · {year}
        </span>
      </div>

      <div className="grid gap-8">
        <ul aria-hidden className="grid gap-2 font-mono text-xs text-fg-muted md:text-sm">
          {visibleLogs.map((line, i) => (
            <li key={line} className="animate-[boot-line_300ms_var(--ease-out)_both]">
              <span className={i === dict.logs.length - 1 ? "text-ghost" : "text-fg-subtle"}>
                {i === dict.logs.length - 1 ? "✓" : ">"}
              </span>{" "}
              {line}
            </li>
          ))}
        </ul>

        {asking && (
          <div
            role="group"
            aria-label={dict.soundAsk}
            className="grid justify-items-start gap-4 animate-[boot-line_400ms_var(--ease-out)_both]"
          >
            <p className="font-mono text-xs text-fg-muted md:text-sm">
              <span className="text-ghost">!</span> {dict.soundAsk}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                ref={soundButtonRef}
                type="button"
                onClick={() => choose(true)}
                className="inline-flex items-center gap-2.5 rounded-full bg-ghost px-5 py-3 text-sm font-medium text-void transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                  <path d="M2 6h2.5L8 3v10L4.5 10H2z" />
                  <path
                    d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                {dict.soundOn}
              </button>
              <button
                type="button"
                onClick={() => choose(false)}
                className="rounded-full px-4 py-3 font-mono text-xs text-fg-muted transition-colors duration-200 hover:text-fg"
              >
                {dict.soundOff} →
              </button>
            </div>
          </div>
        )}
      </div>

      <div aria-hidden className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-6">
          <p className="font-mono text-xs tracking-[0.14em] text-fg-muted uppercase md:text-sm">
            {dict.title}
            <span className="animate-caret ml-1 text-ghost">_</span>
          </p>
          <p className="text-[clamp(4.5rem,16vw,13rem)] leading-[0.8] font-semibold tracking-[-0.05em] tabular-nums">
            <span ref={counterRef}>000</span>
            <span className="text-ghost">%</span>
          </p>
        </div>
        <div className="h-px w-full bg-line">
          <div className="h-full origin-left bg-ghost" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    </div>
  );
}
