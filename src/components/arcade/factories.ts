import type { GameSlug } from "./catalog";
import type { GameFactory } from "./engine/core";
import { createBreakout } from "./games/breakout";
import { createRunner } from "./games/runner";
import { createShooter } from "./games/shooter";
import { createSnake } from "./games/snake";
import { createStack } from "./games/stack";
import { createUptime } from "./games/uptime";

export const FACTORIES: Record<GameSlug, GameFactory> = {
  runner: createRunner,
  pipeline: createSnake,
  "bug-smasher": createBreakout,
  uptime: createUptime,
  "merge-conflict": createShooter,
  "stack-overflow": createStack,
};

/**
 * How a touch screen drives each game, all on the game surface itself (no separate pad):
 * - tap: anywhere is the A button.
 * - pointer: the finger steers horizontally; touching holds A (launch / fire).
 * - swipe: dragging emits one direction press per step; a tap and a downward flick are buttons.
 * - pad: translucent buttons drawn inside the stage, for games that need held directions.
 */
export type TouchScheme =
  | { kind: "tap" }
  | { kind: "pointer" }
  | { kind: "swipe"; tap?: "a" | "up"; flick?: "a" }
  | { kind: "pad" };

export const TOUCH: Record<GameSlug, TouchScheme> = {
  runner: { kind: "pad" },
  pipeline: { kind: "swipe" },
  "bug-smasher": { kind: "pointer" },
  uptime: { kind: "tap" },
  "merge-conflict": { kind: "pointer" },
  "stack-overflow": { kind: "swipe", tap: "up", flick: "a" },
};
