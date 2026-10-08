"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { whenBooted } from "@/components/motion/slot";
import { cssToken, useTheme } from "@/components/ui/theme";
import { playSound } from "@/lib/sound";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function canRun3D() {
  const nav = navigator as Nav;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (nav.connection?.saveData) return false;
  return (nav.deviceMemory ?? 8) >= 4 && (nav.hardwareConcurrency ?? 8) >= 4;
}

type Mode = "pending" | "live" | "static";

/**
 * Hero portrait (DESIGN.md §7): particles assemble out of the model core, then a scan line
 * resolves them into the real photo; afterwards a pointer lens re-digitizes what it touches.
 * Without 3D (reduced motion, no GPU, slow device, no JS) the plain photo is shown instead.
 */
export function HeroPortrait({ src, alt }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealedRef = useRef(false);
  const [mode, setMode] = useState<Mode>("pending");
  const theme = useTheme();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!theme || reduce) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const fallBack = () => {
      if (cancelled) return;
      cleanup?.();
      cleanup = undefined;
      setMode("static");
    };

    // Fetch the 3D chunk while the boot screen runs; start the intro only once it has lifted.
    let scene: Promise<typeof import("./portrait-scene")> | undefined;
    let stopBoot = () => {};
    const start = () => {
      if (!canRun3D()) return setMode("static");
      scene = import("./portrait-scene");
      stopBoot = whenBooted(mount);
    };
    const mount = () =>
      scene!
        .then(({ mountPortraitScene }) =>
          cancelled || !canvasRef.current ? () => {} : mountPortraitScene(canvasRef.current, {
            imageUrl: src,
            theme: {
              mode: theme,
              ice: cssToken("--color-ice"),
              ghost: cssToken("--color-ghost"),
              fg: cssToken("--color-fg"),
              forest: cssToken("--color-forest"),
            },
            // After a theme switch, don't replay the intro.
            skipIntro: revealedRef.current,
            onReady: () => !cancelled && setMode("live"),
            onRevealStart: () => playSound("scan"),
            onRevealed: () => (revealedRef.current = true),
            onFail: fallBack,
          }),
        )
        .then((dispose) => {
          if (cancelled) dispose();
          else cleanup = dispose;
        })
        .catch(fallBack);

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 600 })
      : window.setTimeout(start, 300);

    return () => {
      cancelled = true;
      stopBoot();
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      cleanup?.();
    };
  }, [theme, src, reduce]);

  return (
    <div className="relative aspect-[4/5] w-full">
      {/* Light behind the subject */}
      <div
        aria-hidden
        className="absolute inset-x-[-10%] top-[8%] bottom-0 rounded-full bg-[radial-gradient(50%_45%_at_50%_45%,color-mix(in_srgb,var(--color-ghost)_14%,transparent),transparent_70%)] blur-2xl"
      />
      <Image
        src={src}
        alt={alt}
        width={962}
        height={962}
        sizes="(min-width: 1024px) 560px, 90vw"
        // Same framing as the particle scene: square photo, full height, cropped at the sides.
        className={`hero-portrait-img absolute top-0 left-1/2 h-full [mask-image:linear-gradient(to_bottom,#000_86%,transparent)] w-auto max-w-none -translate-x-1/2 transition-opacity duration-700 ${
          reduce || mode === "static" ? "opacity-100" : "opacity-0"
        }`}
      />
      <noscript>
        <style>{`.hero-portrait-img{opacity:1!important}`}</style>
      </noscript>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`absolute inset-0 size-full [mask-image:linear-gradient(to_bottom,#000_86%,transparent)] transition-opacity duration-500 ${!reduce && mode === "live" ? "opacity-100" : "opacity-0"}`}
      />
      {/* Viewfinder corners framing the render */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute top-0 left-0 size-5 border-t border-l border-ghost/50" />
        <span className="absolute top-0 right-0 size-5 border-t border-r border-ghost/50" />
        <span className="absolute bottom-0 left-0 size-5 border-b border-l border-ghost/50" />
        <span className="absolute right-0 bottom-0 size-5 border-r border-b border-ghost/50" />
      </span>
    </div>
  );
}
