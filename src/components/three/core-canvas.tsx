"use client";

import { useEffect, useRef, useState } from "react";
import { cssToken, useTheme } from "@/components/ui/theme";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function canRun3D() {
  const nav = navigator as Nav;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4) return false;
  return true;
}

/**
 * Model Core canvas: the static poster is server-rendered as `children`;
 * the three.js chunk is imported on idle and fades in over it once its first frame is drawn.
 */
export function CoreCanvas({ children, scrollPull = false }: { children: React.ReactNode; scrollPull?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const theme = useTheme();

  // Remounts on theme change so the scene picks up the new palette and blending.
  useEffect(() => {
    if (!theme || !canRun3D()) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const start = () =>
      import("./core-scene").then(({ mountCoreScene }) => {
        if (cancelled || !canvasRef.current) return;
        try {
          cleanup = mountCoreScene(
            canvasRef.current,
            { mode: theme, ice: cssToken("--color-ice"), ghost: cssToken("--color-ghost"), fg: cssToken("--color-fg") },
            { scrollPull },
            () => setReady(true),
            () => {
              setReady(false);
              cleanup?.();
              cleanup = undefined;
            },
          );
        } catch {
          // No WebGL or a software renderer: the poster stays.
        }
      });

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 2500 })
      : window.setTimeout(start, 1200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      cleanup?.();
      setReady(false);
    };
  }, [theme, scrollPull]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        {children}
      </div>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 size-full transition-opacity duration-[800ms] ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
