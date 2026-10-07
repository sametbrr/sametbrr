"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { slotText } from "slot-text";

/**
 * Slot-machine text roll (slot-text, DESIGN.md §6 "T" rows). Every component renders the final
 * text on the server (SEO, no-JS) plus a screen-reader copy; the rolling span is aria-hidden.
 */

type Slot = ReturnType<typeof slotText>;
const BOOT_EVENT = "site:booted";

/** Resolves once the boot screen has finished (immediately if it was skipped). */
export function whenBooted(cb: () => void) {
  if (document.documentElement.dataset.booted) {
    cb();
    return () => {};
  }
  window.addEventListener(BOOT_EVENT, cb, { once: true });
  return () => window.removeEventListener(BOOT_EVENT, cb);
}
export const announceBooted = () => {
  document.documentElement.dataset.booted = "1";
  window.dispatchEvent(new Event(BOOT_EVENT));
};

/** Same length, every character swapped for a random glyph: the "undecoded" state. */
const GLYPHS = "ABCDEFGHJKLMNPRSTUVYZabcdefghkmnprstuvyz0123456789";
const scramble = (text: string) =>
  [...text].map((c) => (c === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join("");

function SrText({ text }: { text: string }) {
  return <span className="sr-only">{text}</span>;
}

/**
 * Heading text that decodes from random glyphs when it scrolls into view (T1).
 * Each word is its own slot container so long headings still wrap; words start in sequence.
 */
export function RollReveal({ text, className }: { text: string; className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const slots = useRef<Slot[]>([]);
  const inView = useInView(wrapRef, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const words = text.split(" ");

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || reduce) return;
    // Only scramble if it starts off-screen; text already visible on load stays put.
    if (wrap.getBoundingClientRect().top < window.innerHeight) return;
    const els = [...wrap.querySelectorAll<HTMLElement>("[data-word]")];
    slots.current = els.map((el) => slotText(el, scramble(el.dataset.word!)));
    return () => {
      slots.current.forEach((sl) => sl.destroy());
      slots.current = [];
    };
  }, [text, reduce]);

  useEffect(() => {
    if (!inView || !slots.current.length) return;
    let offset = 0;
    const timers = slots.current.map((sl, i) => {
      const word = words[i];
      const id = setTimeout(() => sl.set(word, { stagger: 16, duration: 380, direction: "up" }), offset);
      offset += word.length * 16 + 40;
      return id;
    });
    return () => timers.forEach(clearTimeout);
    // `words` derives from text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, text]);

  return (
    <span className={className}>
      <SrText text={text} />
      <span ref={wrapRef} aria-hidden>
        {words.map((w, i) => (
          <span key={i}>
            <span data-word={w}>{w}</span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Odometer counter (T2): rolls 0 → value in eased steps; only changed digits roll.
 * `startOn: "boot"` waits for the boot screen (hero), `"view"` for visibility.
 */
export function RollCounter({
  value,
  pad = 0,
  className,
  startOn = "view",
}: {
  value: string;
  pad?: number;
  className?: string;
  startOn?: "view" | "boot";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const runRef = useRef<(() => void) | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const format = (n: number) => `${match?.[1] ?? ""}${String(n).padStart(pad, "0")}${match?.[3] ?? ""}`;
  const display = match ? format(Number(match[2])) : value;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !match) return;
    const target = Number(match[2]);
    const slot = slotText(el, format(0));
    let timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      const steps = Math.min(target, 8);
      for (let i = 1; i <= steps; i++) {
        const eased = 1 - Math.pow(1 - i / steps, 2);
        timers.push(
          setTimeout(() => slot.set(format(Math.round(target * eased)), { stagger: 30, duration: 260 }), i * 110),
        );
      }
    };

    let stopBoot = () => {};
    if (startOn === "boot") stopBoot = whenBooted(() => timers.push(setTimeout(run, 250)));
    else runRef.current = run;

    return () => {
      stopBoot();
      runRef.current = null;
      timers.forEach(clearTimeout);
      timers = [];
      slot.destroy();
    };
    // `format`/`match` derive from value and pad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pad, reduce, startOn]);

  // Runs once when it first becomes visible (the run is consumed so it never replays).
  useEffect(() => {
    if (!inView || startOn !== "view" || !runRef.current) return;
    const run = runRef.current;
    runRef.current = null;
    run();
  }, [inView, startOn]);

  return (
    <span className={className}>
      <SrText text={display} />
      <span ref={ref} aria-hidden className="tabular-nums">
        {display}
      </span>
    </span>
  );
}

/** Cycles through phrases with a character roll (T3), e.g. the hero role line. */
export function RollCycle({ items, interval = 2600, className }: { items: string[]; interval?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || items.length < 2) return;
    const slot = slotText(el, items[0]);
    let i = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const stop = whenBooted(() => {
      id = setInterval(() => {
        i = (i + 1) % items.length;
        slot.set(items[i], { stagger: 22, duration: 340, direction: "up" });
      }, interval);
    });
    return () => {
      stop();
      clearInterval(id);
      slot.destroy();
    };
  }, [items, interval, reduce]);

  return (
    <span className={className}>
      <SrText text={items.join(" · ")} />
      <span ref={ref} aria-hidden>
        {items[0]}
      </span>
    </span>
  );
}

/** Link/button label that rolls itself over on hover or focus (T4), like slot-text's flash. */
export function RollLabel({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const host = el?.closest<HTMLElement>("a,button");
    if (!el || !host || reduce) return;
    const slot = slotText(el, text);
    const roll = () => slot.set(text, { skipUnchanged: false, stagger: 18, duration: 260, direction: "up" });
    host.addEventListener("pointerenter", roll);
    host.addEventListener("focus", roll);
    return () => {
      host.removeEventListener("pointerenter", roll);
      host.removeEventListener("focus", roll);
      slot.destroy();
    };
  }, [text, reduce]);

  return (
    <span className={className}>
      <SrText text={text} />
      {/* The roll swaps its glyph nodes mid-press; with pointer events on them, mousedown and
          mouseup land on different nodes and the browser drops the click. */}
      <span ref={ref} aria-hidden className="pointer-events-none">
        {text}
      </span>
    </span>
  );
}

