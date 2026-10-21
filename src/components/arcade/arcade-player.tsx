"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import { isSoundOn, resumeSound, subscribeSound } from "@/lib/sound";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { GameSlug } from "./catalog";
import { sfx } from "./engine/audio";
import { Input, KEYMAP, runLoop, type Button, type Game, type Hud } from "./engine/core";
import { FACTORIES, POINTER_GAMES } from "./factories";

type Status = "ready" | "playing" | "paused" | "over";

export type ArcadeLabels = {
  insertCoin: string;
  start: string;
  startHint: string;
  pause: string;
  resume: string;
  paused: string;
  restart: string;
  gameOver: string;
  newRecord: string;
  score: string;
  best: string;
  lives: string;
  level: string;
  soundOff: string;
  fullscreen: string;
};

/* High scores live in localStorage; a tiny external store keeps the HUD in sync. */
const BEST_EVENT = "arcade-best";
const bestKey = (slug: string) => `arcade-best:${slug}`;
const readBest = (slug: string) => {
  try {
    return Number(localStorage.getItem(bestKey(slug))) || 0;
  } catch {
    return 0;
  }
};
const subscribeBest = (cb: () => void) => {
  window.addEventListener(BEST_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(BEST_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const pad = (n: number) => String(n).padStart(6, "0");

/** The cabinet: canvas, HUD, start/pause/game-over screens, keyboard and touch input. */
export function ArcadePlayer({
  slug,
  locale,
  title,
  labels,
}: {
  slug: GameSlug;
  locale: "tr" | "en";
  title: string;
  labels: ArcadeLabels;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const pausedRef = useRef(false);
  const [input] = useState(() => new Input());
  const [status, setStatus] = useState<Status>("ready");
  const [run, setRun] = useState(0);
  const [hud, setHud] = useState<Hud>({ score: 0 });
  const [record, setRecord] = useState(false);
  const best = useSyncExternalStore(subscribeBest, () => readBest(slug), () => 0);
  const soundOn = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  const reduce = useReducedMotion();

  // One game instance per run; run 0 is the self-playing attract screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const demo = run === 0;
    const game = FACTORIES[slug](
      {
        sfx,
        hud: setHud,
        reduceMotion: reduce,
        end: ({ score }) => {
          const previous = readBest(slug);
          const isRecord = score > previous;
          if (isRecord) {
            try {
              localStorage.setItem(bestKey(slug), String(score));
            } catch {}
            window.dispatchEvent(new Event(BEST_EVENT));
          }
          setRecord(isRecord);
          setStatus("over");
          track("arcade-over", { game: slug, score });
        },
      },
      { demo, locale },
    );
    gameRef.current = game;
    canvas.width = game.width;
    canvas.height = game.height;
    input.clear();
    const render = () => game.draw(g);
    if (demo && reduce) {
      for (let i = 0; i < 90; i++) game.update(1 / 60, input);
      render();
      return () => game.dispose?.();
    }
    const stop = runLoop((dt) => {
      if (!pausedRef.current) game.update(dt, input);
      input.endFrame();
    }, render);
    return () => {
      stop();
      game.dispose?.();
      gameRef.current = null;
    };
  }, [run, slug, locale, reduce, input]);

  useEffect(() => {
    pausedRef.current = status === "paused";
    gameRef.current?.setPaused?.(status === "paused");
    if (status !== "playing") input.clear();
  }, [status, input]);

  function start() {
    resumeSound();
    sfx("start");
    setHud({ score: 0 });
    setRecord(false);
    setRun((r) => r + 1);
    setStatus("playing");
    track("arcade-start", { game: slug });
    canvasRef.current?.focus({ preventScroll: true });
  }
  function togglePause() {
    if (status !== "playing" && status !== "paused") return;
    sfx("pause");
    setStatus(status === "playing" ? "paused" : "playing");
  }

  // Keyboard: mapped keys never scroll the page while a round is running.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Enter" || (e.code === "Space" && (status === "ready" || status === "over"))) {
        e.preventDefault();
        if (e.repeat) return;
        if (status === "ready" || status === "over") start();
        else togglePause();
        return;
      }
      if ((e.code === "KeyP" || e.code === "Escape") && (status === "playing" || status === "paused")) {
        e.preventDefault();
        togglePause();
        return;
      }
      const b = KEYMAP[e.code];
      if (!b || status !== "playing") return;
      e.preventDefault();
      if (b === "left" || b === "right") input.setPointer(null);
      input.down(b);
    };
    const onUp = (e: KeyboardEvent) => {
      const b = KEYMAP[e.code];
      if (b) input.up(b);
    };
    const onHide = () => {
      if (status === "playing") setStatus("paused");
    };
    const onVisibility = () => document.hidden && onHide();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });

  const pointerGame = POINTER_GAMES.has(slug);
  const toGameX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * e.currentTarget.width;
  };

  return (
    <div className="mx-auto flex w-full max-w-[calc((100svh-9rem)*16/9)] flex-col gap-4">
      <div
        ref={screenRef}
        className="arcade-screen relative overflow-hidden rounded-xl border border-line-strong bg-[#06120c] shadow-[0_0_80px_-20px_color-mix(in_srgb,var(--color-ghost)_35%,transparent)]"
      >
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-white/10 px-4 py-2.5 font-mono text-[0.7rem] tracking-widest text-[#9ff5b6] uppercase">
          <div className="flex gap-2">
            <dt className="text-white/50">{labels.score}</dt>
            <dd className="tabular-nums">{pad(hud.score)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-white/50">{labels.best}</dt>
            <dd className="tabular-nums">{pad(Math.max(best, status === "over" ? 0 : hud.score))}</dd>
          </div>
          {hud.lives !== undefined && (
            <div className="flex gap-2">
              <dt className="text-white/50">{labels.lives}</dt>
              <dd className="text-[#ff5d73]" aria-label={String(hud.lives)}>
                {"♥".repeat(Math.max(0, Math.min(hud.lives, 9)))}
              </dd>
            </div>
          )}
          {hud.level !== undefined && (
            <div className="flex gap-2">
              <dt className="text-white/50">{labels.level}</dt>
              <dd className="tabular-nums">{hud.level}</dd>
            </div>
          )}
          {hud.extra && <div className="text-white/60 tabular-nums">{hud.extra}</div>}
          <div className="ml-auto flex items-center gap-1">
            {(status === "playing" || status === "paused") && (
              <button
                type="button"
                data-sound="none"
                onClick={togglePause}
                className="rounded px-2 py-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                {status === "paused" ? labels.resume : labels.pause}
              </button>
            )}
            <button
              type="button"
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : screenRef.current?.requestFullscreen())}
              aria-label={labels.fullscreen}
              title={labels.fullscreen}
              className="grid size-7 place-items-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
                <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </dl>

        <div className="arcade-stage relative">
          <canvas
            ref={canvasRef}
            tabIndex={-1}
            aria-label={title}
            role="img"
            className="pixelated arcade-canvas block aspect-[16/9] w-full touch-none outline-none select-none"
            onPointerMove={(e) => {
              if (pointerGame && status === "playing") input.setPointer(toGameX(e));
            }}
            onPointerDown={(e) => {
              if (status !== "playing") return;
              if (pointerGame) input.setPointer(toGameX(e));
              input.down("a");
            }}
            onPointerUp={() => input.up("a")}
            onPointerLeave={(e) => {
              input.up("a");
              if (e.pointerType === "mouse") input.setPointer(null);
            }}
          />
          <div aria-hidden className="crt-overlay pointer-events-none absolute inset-0" />

          {status !== "playing" && (
            <div
              className={`absolute inset-0 grid place-items-center p-4 text-center font-mono text-white ${
                status === "ready" ? "bg-[#020604]/35" : "bg-[#020604]/70 backdrop-blur-[2px]"
              }`}
            >
              <div className="flex flex-col items-center gap-2 sm:gap-4">
                {status === "ready" && (
                  <>
                    <p className="text-xs tracking-[0.3em] text-[#ffd166] motion-safe:animate-[caret_1.2s_steps(1)_infinite]">
                      {labels.insertCoin}
                    </p>
                    <p className="hidden text-2xl font-semibold tracking-tight sm:block md:text-4xl">{title}</p>
                  </>
                )}
                {status === "paused" && <p className="text-xl tracking-[0.2em] uppercase">{labels.paused}</p>}
                {status === "over" && (
                  <>
                    <p className="text-xl tracking-[0.2em] text-[#ff5d73] uppercase md:text-2xl">{labels.gameOver}</p>
                    <p className="text-2xl font-semibold tabular-nums sm:text-3xl md:text-5xl">{pad(hud.score)}</p>
                    {record && <p className="text-sm text-[#ffd166] motion-safe:animate-bounce">★ {labels.newRecord}</p>}
                  </>
                )}
                <button
                  type="button"
                  data-sound="none"
                  onClick={status === "paused" ? togglePause : start}
                  className="rounded-full bg-[#d7ffe0] px-5 py-2 text-sm font-semibold sm:px-6 sm:py-3 text-[#050505] transition-transform hover:scale-105 active:scale-95"
                >
                  ▶ {status === "paused" ? labels.resume : status === "over" ? labels.restart : labels.start}
                </button>
                <p className="text-[0.7rem] text-white/60 pointer-coarse:hidden">{labels.startHint}</p>
                {!soundOn && <p className="text-[0.7rem] text-[#ffd166]">{labels.soundOff}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <TouchPad input={input} active={status === "playing"} />
    </div>
  );
}

/** On-screen controller for touch devices: D-pad on the left, A/B on the right. */
function TouchPad({ input, active }: { input: Input; active: boolean }) {
  const bind = (b: Button) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!active) return;
      if (b === "left" || b === "right") input.setPointer(null);
      input.down(b);
    },
    onPointerUp: () => input.up(b),
    onPointerCancel: () => input.up(b),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const key =
    "grid size-14 place-items-center rounded-2xl border border-line-strong bg-surface-2 font-mono text-lg text-fg active:bg-surface-3 active:scale-95 transition-transform touch-none select-none";
  return (
    <div className="hidden items-center justify-between gap-4 pointer-coarse:flex" aria-hidden>
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <button type="button" data-sound="none" tabIndex={-1} className={`${key} col-start-2`} {...bind("up")}>
          ▲
        </button>
        <button type="button" data-sound="none" tabIndex={-1} className={`${key} col-start-1 row-start-2`} {...bind("left")}>
          ◀
        </button>
        <button type="button" data-sound="none" tabIndex={-1} className={`${key} col-start-3 row-start-2`} {...bind("right")}>
          ▶
        </button>
        <button type="button" data-sound="none" tabIndex={-1} className={`${key} col-start-2 row-start-3`} {...bind("down")}>
          ▼
        </button>
      </div>
      <div className="flex items-end gap-3">
        <button type="button" data-sound="none" tabIndex={-1} className={`${key} rounded-full`} {...bind("b")}>
          B
        </button>
        <button type="button" data-sound="none" tabIndex={-1} className={`${key} mb-8 size-16 rounded-full border-ghost/60 text-ghost`} {...bind("a")}>
          A
        </button>
      </div>
    </div>
  );
}
