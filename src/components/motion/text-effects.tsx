"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";

import { m, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useRevealSound } from "@/components/ui/sound";
import type { SoundName } from "@/lib/sound";
import { RiseWords } from "./reveal";
import { RollReveal } from "./slot";

/**
 * One heading, many voices (DESIGN.md §6 T-rows): each section title gets its own reveal
 * so the page never repeats a motion. All variants render the final text on the server
 * and expose it to assistive tech once; decorative splits are aria-hidden.
 */
export type TextEffect = "decode" | "rise" | "type" | "flip" | "focus" | "blur" | "pop";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Each reveal has its own short sound, played once as the heading enters (DESIGN.md §8). */
const EFFECT_SOUND: Record<TextEffect, SoundName> = {
  decode: "decode",
  rise: "rise",
  type: "type",
  flip: "flip",
  focus: "swell",
  blur: "swell",
  pop: "pop",
};

export function EffectText({ text, effect }: { text: string; effect: TextEffect }) {
  const ref = useRef<HTMLSpanElement>(null);
  useRevealSound(ref, EFFECT_SOUND[effect]);
  return (
    <span ref={ref}>
      <EffectBody text={text} effect={effect} />
    </span>
  );
}

function EffectBody({ text, effect }: { text: string; effect: TextEffect }) {
  const reduce = useReducedMotion();
  if (reduce) return <m.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.16 }}>{text}</m.span>;
  switch (effect) {
    case "decode":
      return <RollReveal text={text} />;
    case "rise":
      return <RiseWords text={text} />;
    case "type":
      return <TypeText text={text} />;
    case "flip":
      return <FlipText text={text} />;
    case "focus":
      return <FocusText text={text} />;
    case "blur":
      return <BlurWords text={text} />;
    case "pop":
      return <PopText text={text} />;
  }
}

/** Words → letters, each word kept on one line so headings still wrap only between words. */
function Letters({
  text,
  render,
}: {
  text: string;
  render: (char: string, index: number) => React.ReactNode;
}) {
  let i = 0;
  const words = text.split(" ");
  return (
    <span aria-hidden>
      {words.map((word, w) => (
        <span key={w}>
          <span className="inline-block whitespace-nowrap">{[...word].map((c) => render(c, i++))}</span>
          {w < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Typewriter with a block caret (T5). Untyped text stays laid out but invisible, so nothing shifts. */
function TypeText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduce = useReducedMotion();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (reduce || !ref.current || ref.current.getBoundingClientRect().top < window.innerHeight) return;
    const id = requestAnimationFrame(() => setCount(0));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  useEffect(() => {
    if (!inView || count === null || count > text.length) return;
    const id = setTimeout(() => setCount((c) => (c ?? 0) + 1), count === text.length ? 1200 : 42);
    return () => clearTimeout(id);
  }, [inView, count, text.length]);

  const shown = count ?? text.length;
  const typing = count !== null && count <= text.length;
  return (
    <span ref={ref}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        {typing && <span className="animate-caret ml-[0.04em] inline-block h-[0.82em] w-[0.08em] translate-y-[0.08em] bg-ghost" />}
        <span className="opacity-0">{text.slice(shown)}</span>
      </span>
    </span>
  );
}

/** Split-flap: letters flip down on the X axis into place (T6). */
function FlipText({ text }: { text: string }) {
  return (
    <span className="[perspective:900px]">
      <span className="sr-only">{text}</span>
      <Letters
        text={text}
        render={(c, i) => (
          <m.span
            key={i}
            className="inline-block origin-[50%_100%] [backface-visibility:hidden]"
            initial={{ rotateX: -95, opacity: 0 }}
            whileInView={{ rotateX: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.7, delay: i * 0.025, ease: EASE_OUT }}
          >
            {c}
          </m.span>
        )}
      />
    </span>
  );
}

/** Tracking collapses from wide to tight while the blur resolves — a lens pulling focus (T7). */
function FocusText({ text }: { text: string }) {
  return (
    <m.span
      className="inline-block"
      initial={{ letterSpacing: "0.32em", filter: "blur(12px)", opacity: 0 }}
      whileInView={{ letterSpacing: "-0.035em", filter: "blur(0px)", opacity: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.1, ease: EASE_OUT }}
    >
      {text}
    </m.span>
  );
}

/** Word-by-word blur and lift (T8). */
function BlurWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i}>
            <m.span
              className="inline-block"
              initial={{ filter: "blur(10px)", opacity: 0, y: "0.25em" }}
              whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: EASE_OUT }}
            >
              {w}
            </m.span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Letters pop from small and green, then settle to full size and the text colour (T9). */
function PopText({ text }: { text: string }) {
  return (
    <span>
      <span className="sr-only">{text}</span>
      <Letters
        text={text}
        render={(c, i) => (
          <m.span
            key={i}
            className="inline-block"
            initial={{ scale: 0.3, opacity: 0, color: "var(--color-ghost)" }}
            whileInView={{ scale: 1, opacity: 1, color: "var(--color-fg)" }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              scale: { type: "spring", stiffness: 420, damping: 18, delay: i * 0.03 },
              opacity: { duration: 0.2, delay: i * 0.03 },
              color: { duration: 0.9, delay: i * 0.03 + 0.25 },
            }}
          >
            {c}
          </m.span>
        )}
      />
    </span>
  );
}
