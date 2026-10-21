"use client";

import { useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { GameSlug } from "./catalog";
import { Input, runLoop } from "./engine/core";
import { FACTORIES } from "./factories";

const silentHost = { sfx: () => {}, hud: () => {}, end: () => {}, reduceMotion: false };

/**
 * Attract mode: the game plays itself (autopilot, no sound) while on screen.
 * Reduced motion renders a single still frame instead.
 */
export function ArcadePreview({ slug, locale, className = "" }: { slug: GameSlug; locale: "tr" | "en"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const game = FACTORIES[slug]({ ...silentHost, reduceMotion: reduce }, { demo: true, locale });
    canvas.width = game.width;
    canvas.height = game.height;
    const input = new Input();
    const render = () => game.draw(g);
    if (reduce || !inView) {
      // Advance a little so the still frame shows the world in motion, not the empty start.
      for (let i = 0; i < 90; i++) game.update(1 / 60, input);
      render();
      return () => game.dispose?.();
    }
    const stop = runLoop((dt) => game.update(dt, input), render);
    return () => {
      stop();
      game.dispose?.();
    };
  }, [slug, locale, inView, reduce]);

  return <canvas ref={ref} aria-hidden className={`pixelated block aspect-[16/9] w-full ${className}`} />;
}
