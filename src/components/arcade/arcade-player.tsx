"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import { isSoundOn, resumeSound, subscribeSound } from "@/lib/sound";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { GameSlug } from "./catalog";
import { sfx } from "./engine/audio";
import { Input, KEYMAP, runLoop, type Button, type Game, type Hud } from "./engine/core";
import { FACTORIES, TOUCH } from "./factories";

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
  exitFullscreen: string;
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

const coarse = () => window.matchMedia("(pointer: coarse)").matches;

/** Play time in coarse ranges, so Umami's property breakdown reads like a histogram. */
const bucket = (s: number) => (s < 30 ? "<30s" : s < 60 ? "30s-1m" : s < 180 ? "1-3m" : s < 600 ? "3-10m" : "10m+");

type Round = { seconds: number; live: boolean; attempt: number; input: "keyboard" | "touch" };

/** Event properties shared by arcade-over and arcade-quit. */
function roundData(game: GameSlug, round: Round, hud: Hud, score = hud.score) {
  const duration = Math.round(round.seconds);
  const data: Record<string, string | number> = {
    game,
    score,
    duration,
    bucket: bucket(duration),
    attempt: round.attempt,
    input: round.input,
  };
  if (hud.level !== undefined) data.level = hud.level;
  return data;
}

/** Swipe tuning in CSS pixels / milliseconds. */
const SWIPE_STEP = 22;
const TAP_MS = 250;
const FLICK_SPEED = 0.6;

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
  /* Analytics for the current round: active play time (pauses excluded), last HUD, and
     whether the round is still open (so leaving mid-game is reported once as a quit). */
  const playRef = useRef<Round>({ seconds: 0, live: false, attempt: 0, input: "keyboard" });
  const hudRef = useRef<Hud>({ score: 0 });
  const touchRef = useRef<{ id: number; x0: number; y0: number; ax: number; ay: number; t0: number; moved: boolean } | null>(
    null,
  );
  const [input] = useState(() => new Input());
  const [status, setStatus] = useState<Status>("ready");
  const [run, setRun] = useState(0);
  const [hud, setHud] = useState<Hud>({ score: 0 });
  const [record, setRecord] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const best = useSyncExternalStore(subscribeBest, () => readBest(slug), () => 0);
  const soundOn = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  const reduce = useReducedMotion();
  const scheme = TOUCH[slug];

  // A round left open (tab closed, another page or game opened) is sent once as a quit.
  useEffect(() => {
    const quit = () => {
      if (!playRef.current.live) return;
      playRef.current.live = false;
      track("arcade-quit", roundData(slug, playRef.current, hudRef.current));
    };
    window.addEventListener("pagehide", quit);
    return () => {
      window.removeEventListener("pagehide", quit);
      quit();
    };
  }, [slug]);

  // One game instance per run; run 0 is the self-playing attract screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const demo = run === 0;
    const game = FACTORIES[slug](
      {
        sfx,
        hud: (h) => {
          hudRef.current = h;
          setHud(h);
        },
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
          playRef.current.live = false;
          track("arcade-over", { ...roundData(slug, playRef.current, hudRef.current, score), record: isRecord });
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
      if (!pausedRef.current) {
        game.update(dt, input);
        if (!demo) playRef.current.seconds += dt;
      }
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

  // Immersive mode: the cabinet fills the viewport (real fullscreen where the browser
  // allows it, a fixed overlay otherwise, e.g. iPhone Safari) and the page stops scrolling.
  useEffect(() => {
    if (!immersive) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onChange = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, [immersive]);

  function enterImmersive() {
    setImmersive(true);
    const el = screenRef.current;
    if (!el?.requestFullscreen || document.fullscreenElement) return;
    el.requestFullscreen({ navigationUI: "hide" })
      .then(() => {
        // Phones play better sideways; unsupported browsers just keep their orientation.
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        return orientation.lock?.("landscape");
      })
      .catch(() => {});
  }
  function exitImmersive() {
    setImmersive(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function start() {
    resumeSound();
    sfx("start");
    setHud({ score: 0 });
    hudRef.current = { score: 0 };
    setRecord(false);
    setRun((r) => r + 1);
    setStatus("playing");
    const touch = coarse();
    const attempt = playRef.current.attempt + 1;
    playRef.current = { seconds: 0, live: true, attempt, input: touch ? "touch" : "keyboard" };
    track("arcade-start", { game: slug, attempt, input: playRef.current.input });
    if (touch && !immersive) enterImmersive();
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

  /* Pointer input on the whole game surface. Mouse keeps the desktop behaviour
     (click is A, pointer games follow the cursor); touch follows the game's scheme. */
  const toGameX = (clientX: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(canvas.width, ((clientX - rect.left) / rect.width) * canvas.width));
  };
  const pulse = (b: Button) => {
    input.down(b);
    input.up(b);
  };
  const playing = status === "playing";

  const surface = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!playing) return;
      if (e.pointerType === "mouse") {
        if (scheme.kind === "pointer") input.setPointer(toGameX(e.clientX));
        input.down("a");
        return;
      }
      if (scheme.kind === "pad" || touchRef.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      touchRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, ax: e.clientX, ay: e.clientY, t0: e.timeStamp, moved: false };
      if (scheme.kind === "pointer") input.setPointer(toGameX(e.clientX));
      if (scheme.kind === "tap" || scheme.kind === "pointer") input.down("a");
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!playing) return;
      if (e.pointerType === "mouse") {
        if (scheme.kind === "pointer") input.setPointer(toGameX(e.clientX));
        return;
      }
      const t = touchRef.current;
      if (!t || t.id !== e.pointerId) return;
      if (scheme.kind === "pointer") input.setPointer(toGameX(e.clientX));
      if (scheme.kind !== "swipe") return;
      // One direction press per step of drag; the anchor follows so long drags repeat.
      const dx = e.clientX - t.ax;
      const dy = e.clientY - t.ay;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_STEP) return;
      t.moved = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        pulse(dx > 0 ? "right" : "left");
        t.ax += Math.sign(dx) * SWIPE_STEP;
        t.ay = e.clientY;
      } else {
        pulse(dy > 0 ? "down" : "up");
        t.ay += Math.sign(dy) * SWIPE_STEP;
        t.ax = e.clientX;
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return input.up("a");
      const t = touchRef.current;
      if (!t || t.id !== e.pointerId) return;
      touchRef.current = null;
      input.up("a");
      if (scheme.kind !== "swipe" || !playing) return;
      const dx = e.clientX - t.x0;
      const dy = e.clientY - t.y0;
      const ms = Math.max(1, e.timeStamp - t.t0);
      if (!t.moved && ms < TAP_MS && Math.hypot(dx, dy) < 12) {
        if (scheme.tap) pulse(scheme.tap);
      } else if (scheme.flick && dy > 40 && dy > Math.abs(dx) && dy / ms > FLICK_SPEED) {
        pulse(scheme.flick);
      }
    },
    onPointerCancel: () => {
      touchRef.current = null;
      input.up("a");
    },
    onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse") return;
      input.up("a");
      input.setPointer(null);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <div className="mx-auto flex w-full max-w-[calc((100svh-9rem)*16/9)] flex-col gap-4">
      <div
        ref={screenRef}
        className={`arcade-screen relative overflow-hidden rounded-xl border border-line-strong bg-[#06120c] shadow-[0_0_80px_-20px_color-mix(in_srgb,var(--color-ghost)_35%,transparent)] ${
          immersive ? "is-immersive" : ""
        }`}
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
              onClick={() => (immersive ? exitImmersive() : enterImmersive())}
              aria-label={immersive ? labels.exitFullscreen : labels.fullscreen}
              title={immersive ? labels.exitFullscreen : labels.fullscreen}
              className="grid size-8 place-items-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {immersive ? (
                <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
                  <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </button>
          </div>
        </dl>

        <div className="arcade-stage relative touch-none select-none [-webkit-touch-callout:none]" {...surface}>
          <div className="arcade-frame relative w-full">
            <canvas
              ref={canvasRef}
              tabIndex={-1}
              aria-label={title}
              role="img"
              className="pixelated block aspect-[16/9] w-full outline-none"
            />
            <div aria-hidden className="crt-overlay pointer-events-none absolute inset-0" />
          </div>

          {scheme.kind === "pad" && playing && <SurfacePad input={input} />}

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
                  className="rounded-full bg-[#d7ffe0] px-5 py-2 text-sm font-semibold text-[#050505] transition-transform hover:scale-105 active:scale-95 sm:px-6 sm:py-3"
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
    </div>
  );
}

/**
 * Translucent controls drawn on the game surface itself, touch screens only:
 * left/right in the bottom-left corner, B and A in the bottom-right.
 */
function SurfacePad({ input }: { input: Input }) {
  const bind = (b: Button) => ({
    onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (b === "left" || b === "right") input.setPointer(null);
      input.down(b);
    },
    onPointerUp: () => input.up(b),
    onPointerCancel: () => input.up(b),
  });
  const key =
    "pointer-events-auto grid size-14 place-items-center rounded-full border border-white/25 bg-white/10 font-mono text-base text-white/80 backdrop-blur-[1px] active:scale-95 active:bg-white/25 transition-transform";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between p-3 pointer-coarse:flex">
      <div className="flex gap-3">
        <span className={key} {...bind("left")}>
          ◀
        </span>
        <span className={key} {...bind("right")}>
          ▶
        </span>
      </div>
      <div className="flex items-end gap-3">
        <span className={`${key} size-12`} {...bind("b")}>
          B
        </span>
        <span className={`${key} mb-6 size-16 border-[#d7ffe0]/50 text-[#d7ffe0]`} {...bind("a")}>
          A
        </span>
      </div>
    </div>
  );
}
