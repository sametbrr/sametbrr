import { createMusic, type Track } from "../engine/audio";
import { Effects, PAL, type Game, type GameFactory, type Input } from "../engine/core";

/**
 * Pipeline — snake on a grid: collect data packets, the pipeline grows and speeds up.
 * Golden packets are worth more but expire. Walls and your own pipe end the run.
 */

const W = 256;
const H = 144;
const C = 8;
const COLS = W / C;
const ROWS = H / C;

type Cell = { x: number; y: number };
const DIRS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } } as const;

const MUSIC: Track = {
  bpm: 132,
  lead: [
    69, 0, 0, 72, 0, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0,
    67, 0, 0, 71, 0, 0, 74, 0, 72, 0, 71, 0, 67, 0, 0, 0,
  ],
  bass: [
    45, 0, 45, 0, 52, 0, 45, 0, 45, 0, 45, 0, 52, 0, 50, 0,
    43, 0, 43, 0, 50, 0, 43, 0, 43, 0, 43, 0, 50, 0, 47, 0,
  ],
};

const TEXT = { tr: { length: "UZUNLUK" }, en: { length: "LEN" } };

export const createSnake: GameFactory = (host, { demo, locale }) => {
  const text = TEXT[locale];
  const fx = new Effects();
  const music = createMusic(MUSIC);
  const play = demo ? () => {} : host.sfx;

  let body: Cell[] = [];
  let dir: Cell = DIRS.right;
  let queue: Cell[] = [];
  let food: Cell = { x: 0, y: 0 };
  let gold: (Cell & { t: number }) | null = null;
  let grow = 0;
  let score = 0;
  let eaten = 0;
  let acc = 0;
  let t = 0;
  let dead = false;
  let deadT = 0;
  let flash = 0;

  const speed = () => Math.max(0.045, 0.12 - eaten * 0.0025);
  const occupied = (c: Cell) => body.some((b) => b.x === c.x && b.y === c.y);
  const free = (): Cell => {
    for (;;) {
      const c = { x: 1 + Math.floor(Math.random() * (COLS - 2)), y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
      if (!occupied(c) && !(c.x === food.x && c.y === food.y)) return c;
    }
  };
  const report = () => !demo && host.hud({ score, extra: `${text.length} ${body.length} · ${Math.round(1 / speed())} TPS` });

  function reset() {
    body = [
      { x: 8, y: 9 },
      { x: 7, y: 9 },
      { x: 6, y: 9 },
    ];
    dir = DIRS.right;
    queue = [];
    grow = 0;
    eaten = 0;
    score = 0;
    gold = null;
    dead = false;
    food = free();
    report();
  }
  reset();
  if (!demo) music.start();

  /** Demo autopilot: greedy step towards the packet that keeps at least one exit open. */
  function autopilot() {
    const head = body[0];
    const target = gold ?? food;
    const options = Object.values(DIRS).filter((d) => !(d.x === -dir.x && d.y === -dir.y));
    const safe = (d: Cell) => {
      const n = { x: head.x + d.x, y: head.y + d.y };
      if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS) return false;
      return !body.slice(0, -1).some((b) => b.x === n.x && b.y === n.y);
    };
    const exits = (d: Cell) => {
      const n = { x: head.x + d.x, y: head.y + d.y };
      return Object.values(DIRS).filter((e) => {
        const m = { x: n.x + e.x, y: n.y + e.y };
        return m.x >= 0 && m.y >= 0 && m.x < COLS && m.y < ROWS && !occupied(m);
      }).length;
    };
    const ranked = options
      .filter(safe)
      .map((d) => ({ d, score: -Math.abs(head.x + d.x - target.x) - Math.abs(head.y + d.y - target.y) + (exits(d) > 1 ? 0 : -50) }))
      .sort((a, b) => b.score - a.score);
    if (ranked[0]) dir = ranked[0].d;
  }

  function step() {
    if (demo) autopilot();
    else if (queue.length) dir = queue.shift()!;
    const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    const hitSelf = body.slice(0, grow > 0 ? body.length : -1).some((b) => b.x === head.x && b.y === head.y);
    if (hitWall || hitSelf) {
      dead = true;
      deadT = 0;
      music.stop();
      play("die");
      fx.burst(body[0].x * C + 4, body[0].y * C + 4, PAL.bug, 10, 80);
      if (!host.reduceMotion) flash = 0.2;
      return;
    }
    body.unshift(head);
    if (grow > 0) grow--;
    else body.pop();

    if (head.x === food.x && head.y === food.y) {
      eaten++;
      grow += 2;
      score += 10;
      play("eat", 1 + Math.min(eaten, 24) * 0.03);
      fx.text(food.x * C + 4, food.y * C - 2, "10");
      food = free();
      if (!gold && eaten % 5 === 0) gold = { ...free(), t: 6 };
      report();
    }
    if (gold && head.x === gold.x && head.y === gold.y) {
      grow += 4;
      const bonus = 50 + Math.ceil(gold.t) * 10;
      score += bonus;
      play("bonus");
      fx.burst(gold.x * C + 4, gold.y * C + 4, PAL.coin, 8, 60);
      fx.text(gold.x * C + 4, gold.y * C - 2, String(bonus), PAL.coin);
      gold = null;
      report();
    }
  }

  function update(dt: number, input: Input) {
    t += dt;
    fx.update(dt);
    flash = Math.max(0, flash - dt);
    if (dead) {
      deadT += dt;
      if (deadT > 1.2) {
        if (demo) reset();
        else if (deadT < 9) {
          deadT = 9;
          host.end({ score, won: false });
        }
      }
      return;
    }
    if (!demo) {
      // Buffer up to two turns so quick inputs inside one tick are not lost.
      for (const key of ["left", "right", "up", "down"] as const) {
        if (!input.wasPressed(key)) continue;
        const d = DIRS[key];
        const last = queue[queue.length - 1] ?? dir;
        if ((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) continue;
        if (queue.length < 2) queue.push(d);
      }
    }
    if (gold) {
      gold.t -= dt;
      if (gold.t <= 0) gold = null;
    }
    acc += dt;
    while (acc >= speed() && !dead) {
      acc -= speed();
      step();
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    g.fillStyle = PAL.bg;
    g.fillRect(0, 0, W, H);
    // Circuit-board grid
    g.fillStyle = PAL.bg2;
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2 === 0) g.fillRect(x * C, y * C, C, C);
    g.fillStyle = PAL.far;
    for (let x = 0; x <= COLS; x += 4) g.fillRect(x * C, 0, 1, H);
    for (let y = 0; y <= ROWS; y += 4) g.fillRect(0, y * C, W, 1);

    // Food: a data packet with a pulsing outline
    const pulse = Math.floor(t * 4) % 2;
    g.fillStyle = PAL.quantum;
    g.fillRect(food.x * C + 1, food.y * C + 1, 6, 6);
    g.fillStyle = pulse ? PAL.ice : PAL.quantumLight;
    g.fillRect(food.x * C + 2, food.y * C + 2, 2, 2);
    g.fillRect(food.x * C + 4, food.y * C + 4, 2, 2);
    if (gold && (gold.t > 1.5 || Math.floor(t * 10) % 2)) {
      g.fillStyle = PAL.coinDark;
      g.fillRect(gold.x * C, gold.y * C, 8, 8);
      g.fillStyle = PAL.coin;
      g.fillRect(gold.x * C + 1, gold.y * C + 1, 6, 6);
      g.fillStyle = PAL.white;
      g.fillRect(gold.x * C + 2, gold.y * C + 2, 2, 1);
    }

    // Pipeline: head bright, body in alternating greens.
    body.forEach((b, i) => {
      const head = i === 0;
      g.fillStyle = head ? PAL.ghost : i % 2 ? PAL.glint : "#7fe39c";
      if (dead && Math.floor(deadT * 10) % 2) g.fillStyle = PAL.bug;
      g.fillRect(b.x * C + 1, b.y * C + 1, 6, 6);
      const next = body[i - 1];
      if (next) {
        // Bridge the gap between segments so it reads as one pipe.
        g.fillRect(Math.min(b.x, next.x) * C + 1 + (b.x !== next.x ? 5 : 0), Math.min(b.y, next.y) * C + 1 + (b.y !== next.y ? 5 : 0), b.x !== next.x ? 3 : 6, b.y !== next.y ? 3 : 6);
      }
      if (head) {
        g.fillStyle = PAL.black;
        const ex = dir.x === 0 ? [2, 5] : [dir.x > 0 ? 5 : 2, dir.x > 0 ? 5 : 2];
        const ey = dir.y === 0 ? [2, 5] : [dir.y > 0 ? 5 : 2, dir.y > 0 ? 5 : 2];
        g.fillRect(b.x * C + ex[0], b.y * C + ey[0], 1, 1);
        g.fillRect(b.x * C + ex[1], b.y * C + ey[1], 1, 1);
      }
    });
    fx.draw(g);
    if (flash > 0) {
      g.fillStyle = "rgb(255 93 115 / 0.25)";
      g.fillRect(0, 0, W, H);
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
