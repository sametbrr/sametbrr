import type { Sfx } from "./audio";

/** Logical buttons shared by every game; keyboard and touch both map onto them. */
export type Button = "left" | "right" | "up" | "down" | "a" | "b";

export class Input {
  private held = new Set<Button>();
  private pressed = new Set<Button>();
  /** Pointer x in game pixels (Breakout paddle), null when no pointer is steering. */
  pointerX: number | null = null;

  down(b: Button) {
    if (!this.held.has(b)) this.pressed.add(b);
    this.held.add(b);
  }
  setPointer(x: number | null) {
    this.pointerX = x;
  }
  up(b: Button) {
    this.held.delete(b);
  }
  isDown(b: Button) {
    return this.held.has(b);
  }
  /** True only on the first frame after the press (edge-triggered). */
  wasPressed(b: Button) {
    return this.pressed.has(b);
  }
  endFrame() {
    this.pressed.clear();
  }
  clear() {
    this.held.clear();
    this.pressed.clear();
    this.pointerX = null;
  }
}

export const KEYMAP: Record<string, Button> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  KeyA: "left",
  KeyD: "right",
  KeyW: "up",
  KeyS: "down",
  Space: "a",
  KeyZ: "a",
  KeyK: "a",
  KeyX: "b",
  KeyJ: "b",
};

export type GameStatus = "playing" | "dead" | "over" | "won";

/** What a running game can tell the shell (HUD, sound, end of round). */
export type GameHost = {
  sfx: (name: Sfx, pitch?: number) => void;
  hud: (hud: Hud) => void;
  end: (result: { score: number; won: boolean }) => void;
  /** Screen shake and flashes are skipped for reduced motion. */
  reduceMotion: boolean;
};

export type Hud = { score: number; lives?: number; level?: number; extra?: string };

export interface Game {
  readonly width: number;
  readonly height: number;
  update(dt: number, input: Input): void;
  draw(g: CanvasRenderingContext2D): void;
  /** Music and timers follow the shell's pause; dispose stops everything on unmount. */
  setPaused?(paused: boolean): void;
  dispose?(): void;
}

export type GameFactory = (host: GameHost, opts: { demo: boolean; locale: "tr" | "en" }) => Game;

/** Fixed 60 Hz simulation with a render on every animation frame. */
export function runLoop(step: (dt: number) => void, render: () => void) {
  const DT = 1 / 60;
  let acc = 0;
  let last = performance.now();
  let frame = requestAnimationFrame(function loop(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) {
      step(DT);
      acc -= DT;
    }
    render();
    frame = requestAnimationFrame(loop);
  });
  return () => cancelAnimationFrame(frame);
}

/** Small deterministic PRNG so a level can be rebuilt from its seed. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Screen palette: the arcade screen stays dark in both site themes, like a CRT. */
export const PAL = {
  bg: "#06120c",
  bg2: "#0b1f15",
  far: "#10291c",
  mid: "#173826",
  ghost: "#d7ffe0",
  glint: "#9ff5b6",
  forest: "#1f6f43",
  forestDeep: "#0e2a1b",
  quantum: "#2457ff",
  quantumLight: "#6f91ff",
  ice: "#dff7ff",
  coin: "#ffd166",
  coinDark: "#c98a1b",
  bug: "#ff5d73",
  bugDark: "#a3243a",
  white: "#ffffff",
  black: "#020604",
  brick: "#3a7d57",
  brickDark: "#1f4a33",
};

/**
 * Pixel sprites written as text rows; each character maps to a palette color, "." is clear.
 * Rendered once into an offscreen canvas and drawn with drawImage afterwards.
 */
export function sprite(rows: string[], colors: Record<string, string>) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = colors[row[x]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

export function drawSprite(g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, flip = false) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (!flip) return g.drawImage(img, rx, ry);
  g.save();
  g.translate(rx + img.width, ry);
  g.scale(-1, 1);
  g.drawImage(img, 0, 0);
  g.restore();
}

/** Floating "+100" style numbers and short particle bursts, shared by all games. */
export class Effects {
  private items: { x: number; y: number; vx: number; vy: number; life: number; color: string; text?: string }[] = [];
  text(x: number, y: number, text: string, color: string = PAL.ghost) {
    this.items.push({ x, y, vx: 0, vy: -24, life: 0.8, color, text });
  }
  burst(x: number, y: number, color: string, n = 6, speed = 60) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      this.items.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 30, life: 0.45, color });
    }
  }
  update(dt: number) {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.text) p.vy += 220 * dt;
      p.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }
  draw(g: CanvasRenderingContext2D, ox = 0) {
    for (const p of this.items) {
      g.fillStyle = p.color;
      if (p.text) drawText(g, p.text, Math.round(p.x - ox - (p.text.length * 4) / 2), Math.round(p.y), p.color);
      else g.fillRect(Math.round(p.x - ox), Math.round(p.y), 2, 2);
    }
  }
  clear() {
    this.items = [];
  }
}

/** 3×5 pixel font for in-world numbers and short words (the HUD itself is crisp DOM text). */
const FONT: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
  "7": "111001010010010",
  "8": "111101111101111",
  "9": "111101111001111",
  "+": "000010111010000",
  "x": "000101010101000",
  "?": "111001011000010",
  "!": "010010010000010",
  P: "111101111100100",
  R: "110101110101101",
  O: "111101101101111",
  D: "110101101101110",
  U: "101101101101111",
  L: "100100100100111",
  E: "111100111100111",
  V: "101101101101010",
  C: "111100100100111",
  A: "010101111101101",
  T: "111010010010010",
  M: "101111111101101",
  I: "111010010010111",
  G: "111100101101111",
  S: "111100111001111",
  N: "110101101101101",
  K: "101101110101101",
  W: "101101111111101",
  Y: "101101010010010",
  F: "111100110100100",
  B: "110101110101110",
  H: "101101111101101",
  " ": "000000000000000",
};

export function drawText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  g.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let i = 0; i < 15; i++) if (glyph[i] === "1") g.fillRect(cx + (i % 3), y + Math.floor(i / 3), 1, 1);
    }
    cx += 4;
  }
}
