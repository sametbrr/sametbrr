"use client";

import { useEffect, useRef, useState } from "react";
import { slotText } from "slot-text";
import { announceBooted } from "@/components/motion/slot";
import { isSoundOn, isSoundUnlocked, playSound, setSoundOn } from "@/lib/sound";
import { BOOT_SESSION_KEY as SESSION_KEY } from "@/lib/init-scripts";
import { track } from "@/lib/analytics";

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

  // Decide once on mount: skipped this session → done; sound wanted but still locked → ask.
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.booted) {
      announceBooted();
      return;
    }
    root.style.overflow = "hidden";
    const id = requestAnimationFrame(() => setPhase(isSoundOn() && !isSoundUnlocked() ? "ask" : "run"));
    return () => {
      cancelAnimationFrame(id);
      root.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase !== "ask") return;
    soundButtonRef.current?.focus();
    const timer = setTimeout(() => setPhase("run"), ASK_TIMEOUT_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && choose(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "run") return;
    const root = document.documentElement;
    const counter = counterRef.current ? slotText(counterRef.current, "000") : null;
    const start = performance.now();
    // Mostly linear with a 25% ease-in-out blend: the percentage and the log lines advance with time
    // (lines ~0.4–0.5s apart), and the counter still eases off at both ends.
    const eased = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const inOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return 0.75 * t + 0.25 * inOut;
    };
    let shown = 0;
    // The counter rolls on a fixed 140ms beat so every roll lands before the next one starts.
    const beat = setInterval(() => {
      const value = Math.round(eased(performance.now()) * 100);
      if (value === shown) return;
      shown = value;
      counter?.set(String(value).padStart(3, "0"), { stagger: 20, duration: 200 });
      playSound("tick", 1 + value / 125);
    }, 140);
    let frame = requestAnimationFrame(function tick(now) {
      const e = eased(now);
      setProgress(e);
      if (e < 1) frame = requestAnimationFrame(tick);
      else {
        clearInterval(beat);
        counter?.set("100", { stagger: 20, duration: 200 });
        playSound("ting");
        setTimeout(() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          root.style.overflow = "";
          setLeaving(true);
          playSound("whoosh");
          announceBooted();
        }, 380);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(beat);
      counter?.destroy();
    };
  }, [phase]);

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
      aria-hidden={!asking}
      onTransitionEnd={(e) => e.target === e.currentTarget && leaving && setGone(true)}
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
