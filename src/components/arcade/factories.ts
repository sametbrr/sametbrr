import type { GameSlug } from "./catalog";
import type { GameFactory } from "./engine/core";
import { createBreakout } from "./games/breakout";
import { createRunner } from "./games/runner";
import { createSnake } from "./games/snake";

export const FACTORIES: Record<GameSlug, GameFactory> = {
  runner: createRunner,
  pipeline: createSnake,
  "bug-smasher": createBreakout,
};

/** Games that follow the pointer (paddle) instead of only buttons. */
export const POINTER_GAMES = new Set<GameSlug>(["bug-smasher"]);
