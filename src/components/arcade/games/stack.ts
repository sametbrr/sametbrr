import { createMusic, type Track } from "../engine/audio";
import { PAL, Effects, drawText, type Game, type GameFactory, type Input } from "../engine/core";

/**
 * Stack Overflow — falling blocks: task cards drop into a 10×20 backlog, full rows ship and clear.
 * 7-bag randomizer, ghost piece, wall kicks, lock delay; the stack topping out is an overflow.
 */

const W = 256;
const H = 144;
const COLS = 10;
const ROWS = 20;
const C = 7;
const BX = Math.round((W - COLS * C) / 2);
const BY = 2;

type Kind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Piece = { kind: Kind; m: number[][]; x: number; y: number };

const SHAPES: Record<Kind, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};
const COLORS: Record<Kind, string> = {
  I: PAL.quantumLight,
  O: PAL.coin,
  T: "#c792ea",
  S: "#7fe39c",
  Z: PAL.bug,
  J: PAL.quantum,
  L: "#ff9f43",
};
const KINDS = Object.keys(SHAPES) as Kind[];
const LINE_POINTS = [0, 100, 300, 500, 800];
const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
];

const rotate = (m: number[][], dir: 1 | -1) =>
  m.map((row, y) => row.map((_, x) => (dir === 1 ? m[m.length - 1 - x][y] : m[x][m.length - 1 - y])));

const MUSIC: Track = {
  bpm: 144,
  lead: [
    76, 0, 71, 72, 74, 0, 72, 71, 69, 0, 69, 72, 76, 0, 74, 72,
    71, 0, 71, 72, 74, 0, 76, 0, 72, 0, 69, 0, 69, 0, 0, 0,
  ],
  bass: [
    40, 52, 40, 52, 40, 52, 40, 52, 45, 57, 45, 57, 45, 57, 45, 57,
    44, 56, 44, 56, 40, 52, 40, 52, 45, 57, 45, 57, 45, 0, 47, 0,
  ],
};

// The 3×5 pixel font is ASCII only: Turkish capitals are written without diacritics.
const TEXT = {
  tr: { lines: "SATIR", level: "SEVIYE", next: "SIRADAKI", over: "STACK OVERFLOW", hud: "SATIR" },
  en: { lines: "LINES", level: "LEVEL", next: "NEXT", over: "STACK OVERFLOW", hud: "LINES" },
};

export const createStack: GameFactory = (host, { demo, locale }) => {
  const text = TEXT[locale];
  const fx = new Effects();
  const music = createMusic(MUSIC);
  const play = demo ? () => {} : host.sfx;

  let board: (Kind | null)[][] = [];
  let piece: Piece;
  let next: Kind;
  let bag: Kind[] = [];
  let score = 0;
  let lines = 0;
  let level = 1;
  let fall = 0;
  let lockT = 0;
  let lockMoves = 0;
  let das = 0;
  let dasDir = 0;
  let clearing: number[] = [];
  let clearT = 0;
  let dead = false;
  let deadT = 0;
  let t = 0;
  let plan: { rot: number; x: number } | null = null;
  let aiT = 0;

  const draw7 = (): Kind => {
    if (!bag.length) {
      bag = [...KINDS];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
  const gravity = () => Math.max(0.05, 0.8 * 0.84 ** (level - 1));
  const report = () => !demo && host.hud({ score, level, extra: `${text.hud} ${lines}` });

  const fits = (m: number[][], x: number, y: number, b = board) =>
    m.every((row, dy) =>
      row.every((v, dx) => {
        if (!v) return true;
        const cx = x + dx;
        const cy = y + dy;
        return cx >= 0 && cx < COLS && cy < ROWS && (cy < 0 || !b[cy][cx]);
      }),
    );

  function spawn() {
    const kind = next;
    next = draw7();
    const m = SHAPES[kind].map((r) => [...r]);
    piece = { kind, m, x: Math.floor((COLS - m.length) / 2), y: kind === "I" ? -1 : 0 };
    fall = 0;
    lockT = 0;
    lockMoves = 0;
    plan = demo ? choosePlan() : null;
    if (!fits(piece.m, piece.x, piece.y)) {
      dead = true;
      deadT = 0;
      music.stop();
      play("die");
    }
  }

  function reset() {
    board = Array.from({ length: ROWS }, () => Array<Kind | null>(COLS).fill(null));
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    clearing = [];
    dead = false;
    next = draw7();
    spawn();
    report();
  }
  reset();
  if (!demo) music.start();

  function move(dx: number) {
    if (!fits(piece.m, piece.x + dx, piece.y)) return false;
    piece.x += dx;
    touchLock();
    return true;
  }
  function turn(dir: 1 | -1) {
    if (piece.kind === "O") return;
    const m = rotate(piece.m, dir);
    for (const [kx, ky] of KICKS) {
      if (fits(m, piece.x + kx, piece.y + ky)) {
        piece.m = m;
        piece.x += kx;
        piece.y += ky;
        play("rotate");
        touchLock();
        return;
      }
    }
  }
  /** Moving on the ground restarts the lock timer, a limited number of times. */
  function touchLock() {
    if (!fits(piece.m, piece.x, piece.y + 1) && lockMoves < 15) {
      lockT = 0;
      lockMoves++;
    }
  }
  const ghostY = () => {
    let y = piece.y;
    while (fits(piece.m, piece.x, y + 1)) y++;
    return y;
  };

  function lock() {
    piece.m.forEach((row, dy) =>
      row.forEach((v, dx) => {
        if (v && piece.y + dy >= 0) board[piece.y + dy][piece.x + dx] = piece.kind;
      }),
    );
    if (piece.m.some((row, dy) => row.some((v) => v && piece.y + dy < 0))) {
      dead = true;
      deadT = 0;
      music.stop();
      play("die");
      return;
    }
    clearing = board.flatMap((row, y) => (row.every(Boolean) ? [y] : []));
    if (clearing.length) {
      clearT = 0;
      const n = clearing.length;
      const pts = LINE_POINTS[n] * level;
      score += pts;
      play(n === 4 ? "bonus" : "line", 1 + (n - 1) * 0.12);
      const midY = BY + clearing[Math.floor(n / 2)] * C;
      fx.text(BX + (COLS * C) / 2, midY, String(pts), n === 4 ? PAL.coin : PAL.ice);
      for (const y of clearing) for (let x = 0; x < COLS; x += 2) fx.burst(BX + x * C + 3, BY + y * C + 3, COLORS[board[y][x] ?? "I"], 2, 40);
    } else {
      play("lock");
      spawn();
    }
    report();
  }

  function hardDrop() {
    const y = ghostY();
    score += (y - piece.y) * 2;
    piece.y = y;
    lock();
  }

  /** Demo planner: classic weighted heuristic over every rotation and column. */
  function choosePlan() {
    let best: { rot: number; x: number; v: number } | null = null;
    let m = piece.m;
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < COLS; x++) {
        if (!fits(m, x, piece.y)) continue;
        let y = piece.y;
        while (fits(m, x, y + 1)) y++;
        const b = board.map((r) => [...r]);
        m.forEach((row, dy) => row.forEach((v, dx) => v && y + dy >= 0 && (b[y + dy][x + dx] = piece.kind)));
        const full = b.filter((r) => r.every(Boolean)).length;
        const kept = b.filter((r) => !r.every(Boolean));
        const heights = Array.from({ length: COLS }, (_, cx) => {
          const top = kept.findIndex((r) => r[cx]);
          return top < 0 ? 0 : kept.length - top;
        });
        let holes = 0;
        for (let cx = 0; cx < COLS; cx++) {
          let seen = false;
          for (const r of kept) {
            if (r[cx]) seen = true;
            else if (seen) holes++;
          }
        }
        const agg = heights.reduce((a, h) => a + h, 0);
        const bump = heights.slice(1).reduce((a, h, i) => a + Math.abs(h - heights[i]), 0);
        const v = -0.51 * agg + 0.76 * full - 0.36 * holes * 2 - 0.18 * bump;
        if (!best || v > best.v) best = { rot, x, v };
      }
      m = rotate(m, 1);
    }
    return best;
  }

  function update(dt: number, input: Input) {
    t += dt;
    fx.update(dt);
    if (dead) {
      deadT += dt;
      if (deadT > 1.8) {
        if (demo) reset();
        else if (deadT < 9) {
          deadT = 9;
          host.end({ score, won: false });
        }
      }
      return;
    }
    if (clearing.length) {
      clearT += dt;
      if (clearT > 0.3) {
        board = [
          ...clearing.map(() => Array<Kind | null>(COLS).fill(null)),
          ...board.filter((_, y) => !clearing.includes(y)),
        ];
        const before = level;
        lines += clearing.length;
        level = 1 + Math.floor(lines / 10);
        if (level > before) play("power");
        clearing = [];
        spawn();
        report();
      }
      return;
    }

    if (demo && plan) {
      aiT += dt;
      if (aiT > 0.07) {
        aiT = 0;
        if (plan.rot > 0) {
          const before = piece.m;
          turn(1);
          plan.rot--;
          if (before === piece.m) plan.rot = 0;
        } else if (piece.x !== plan.x) {
          if (!move(Math.sign(plan.x - piece.x))) plan.x = piece.x;
        } else return hardDrop();
      }
    } else if (!demo) {
      // Rotation, hard drop and edge-triggered moves; holding a direction auto-repeats.
      if (input.wasPressed("up")) turn(1);
      if (input.wasPressed("b")) turn(-1);
      if (input.wasPressed("a")) return hardDrop();
      const dir = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
      if (input.wasPressed("left")) {
        move(-1);
        dasDir = -1;
        das = 0;
      } else if (input.wasPressed("right")) {
        move(1);
        dasDir = 1;
        das = 0;
      } else if (dir !== 0 && dir === dasDir) {
        das += dt;
        if (das > 0.17) {
          move(dir);
          das -= 0.05;
        }
      } else dasDir = dir;
      if (input.wasPressed("down") && fits(piece.m, piece.x, piece.y + 1)) {
        piece.y++;
        score += 1;
        fall = 0;
      }
    }

    const soft = !demo && input.isDown("down");
    fall += dt;
    const interval = soft ? Math.min(0.04, gravity()) : gravity();
    while (fall >= interval) {
      fall -= interval;
      if (fits(piece.m, piece.x, piece.y + 1)) {
        piece.y++;
        if (soft) score += 1;
        lockT = 0;
      } else break;
    }
    if (!fits(piece.m, piece.x, piece.y + 1)) {
      lockT += dt;
      if (lockT > 0.45) lock();
    }
  }

  function cell(g: CanvasRenderingContext2D, x: number, y: number, color: string, alpha = 1) {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillRect(x, y, C - 1, C - 1);
    g.fillStyle = "rgb(255 255 255 / 0.35)";
    g.fillRect(x, y, C - 1, 1);
    g.fillRect(x, y, 1, C - 1);
    g.fillStyle = "rgb(0 0 0 / 0.3)";
    g.fillRect(x + 1, y + C - 2, C - 2, 1);
    g.fillRect(x + C - 2, y + 1, 1, C - 2);
    // Every block is a little task card with two indented lines of code.
    g.fillStyle = "rgb(0 0 0 / 0.45)";
    g.fillRect(x + 1, y + 2, 3, 1);
    g.fillRect(x + 2, y + 4, 2, 1);
    g.globalAlpha = 1;
  }

  function draw(g: CanvasRenderingContext2D) {
    g.fillStyle = PAL.bg;
    g.fillRect(0, 0, W, H);
    // Well with a faint grid.
    g.fillStyle = PAL.forest;
    g.fillRect(BX - 2, BY - 1, COLS * C + 3, ROWS * C + 2);
    g.fillStyle = PAL.black;
    g.fillRect(BX - 1, BY, COLS * C + 1, ROWS * C);
    g.fillStyle = PAL.bg2;
    for (let x = 1; x < COLS; x++) g.fillRect(BX + x * C - 1, BY, 1, ROWS * C);
    // Overflow line: four rows from the top glows red when the stack is close.
    const danger = board.slice(0, 5).some((r) => r.some(Boolean));
    g.fillStyle = danger && Math.floor(t * 4) % 2 ? PAL.bug : PAL.bugDark;
    g.fillRect(BX - 1, BY + 4 * C - 1, COLS * C + 1, 1);

    board.forEach((row, y) =>
      row.forEach((k, x) => {
        if (!k) return;
        const flashing = clearing.includes(y);
        if (dead) cell(g, BX + x * C, BY + y * C, deadT * 12 > ROWS - y ? PAL.mid : COLORS[k]);
        else cell(g, BX + x * C, BY + y * C, flashing && Math.floor(clearT * 20) % 2 ? PAL.white : COLORS[k]);
      }),
    );

    if (!dead && !clearing.length) {
      const gy = ghostY();
      piece.m.forEach((row, dy) =>
        row.forEach((v, dx) => {
          if (!v) return;
          if (gy + dy >= 0) {
            g.fillStyle = COLORS[piece.kind];
            g.globalAlpha = 0.25;
            g.fillRect(BX + (piece.x + dx) * C, BY + (gy + dy) * C, C - 1, C - 1);
            g.globalAlpha = 1;
          }
          if (piece.y + dy >= 0) cell(g, BX + (piece.x + dx) * C, BY + (piece.y + dy) * C, COLORS[piece.kind]);
        }),
      );
    }

    // Side panels: stats on the left, next piece on the right.
    const lx = 14;
    drawText(g, text.lines, lx, 20, PAL.forest);
    drawText(g, String(lines), lx, 28, PAL.ghost);
    drawText(g, text.level, lx, 44, PAL.forest);
    drawText(g, String(level), lx, 52, PAL.ghost);
    const rx = BX + COLS * C + 14;
    drawText(g, text.next, rx, 20, PAL.forest);
    const nm = SHAPES[next];
    const off = nm.length === 4 ? 0 : nm.length === 2 ? 7 : 3;
    nm.forEach((row, dy) =>
      row.forEach((v, dx) => v && cell(g, rx + off + dx * C, 30 + dy * C + (next === "I" ? -3 : 0), COLORS[next])),
    );

    fx.draw(g);

    if (dead && deadT > 0.6) {
      g.fillStyle = "rgb(2 6 4 / 0.7)";
      g.fillRect(BX - 2, 62, COLS * C + 3, 15);
      drawText(g, text.over, Math.round(W / 2 - (text.over.length * 4) / 2), 67, PAL.bug);
    }
  }

  return {
    width: W,
    height: H,
    update,
    draw,
    setPaused: (paused) => {
      if (demo) return;
      if (paused || dead) music.stop();
      else music.start();
    },
    dispose: () => music.stop(),
  } satisfies Game;
};
