import { createMusic, type Track } from "../engine/audio";
import { Effects, PAL, drawSprite, drawText, sprite, type Game, type GameFactory, type Input } from "../engine/core";

/**
 * Uptime — one-button flyer: tap to keep a data packet airborne through firewall gaps.
 * Every gate is a request served; touching a firewall or the floor is an outage.
 */

const W = 256;
const H = 144;
const GROUND = 132;
const GRAVITY = 560;
const FLAP = -165;
const WALL_W = 16;
const SPACING = 92;

type Wall = { x: number; gap: number; size: number; passed: boolean; coin: boolean; phase: number };

/** The player is a "</>" code chip; coins are git commit nodes. */
const CHIP = [
  ".wwwwwwwwwww.",
  "wqqqqqqqqqqqw",
  "wqqWqqqWqWqqw",
  "wqWqqqqWqqWqw",
  "wWqqqqWqqqqWw",
  "wqWqqWqqqqWqw",
  "wqqWqWqqqWqqw",
  "wqqqqqqqqqqqw",
  ".wwwwwwwwwww.",
];
const COMMIT = ["...yyy...", "..yYYYy..", "yyyY.Yyyy", "..yYYYy..", "...yyy..."];
// Hitbox of the chip (sprite drawn at x = PX).
const PX = 42;
const PW = 13;
const PH = 9;

const MUSIC: Track = {
  bpm: 140,
  lead: [
    76, 0, 79, 0, 83, -1, 81, 0, 79, 0, 76, 0, 74, -1, 0, 0,
    72, 0, 76, 0, 79, -1, 77, 0, 76, 0, 74, 0, 71, -1, 0, 0,
  ],
  bass: [
    52, 0, 0, 52, 0, 0, 59, 0, 48, 0, 0, 48, 0, 0, 55, 0,
    45, 0, 0, 45, 0, 0, 52, 0, 47, 0, 0, 47, 0, 0, 54, 0,
  ],
};

// The 3×5 pixel font is ASCII only: Turkish capitals are written without diacritics.
const TEXT = {
  tr: { ready: "DOKUN YA DA SPACE", gates: "ISTEK" },
  en: { ready: "TAP OR SPACE", gates: "REQ" },
};

export const createUptime: GameFactory = (host, { demo, locale }) => {
  const text = TEXT[locale];
  const fx = new Effects();
  const music = createMusic(MUSIC);
  const play = demo ? () => {} : host.sfx;
  const chip = sprite(CHIP, { w: PAL.quantumLight, q: PAL.quantum, W: PAL.ice });
  const commit = sprite(COMMIT, { y: PAL.coinDark, Y: PAL.coin });

  let y = 0;
  let vy = 0;
  let walls: Wall[] = [];
  let score = 0;
  let gates = 0;
  let time = 0;
  let scroll = 0;
  let started = false;
  let dead = false;
  let deadT = 0;
  let flash = 0;
  let t = 0;

  const speed = () => Math.min(96, 62 + gates * 1.2);
  const gapSize = () => Math.max(44, 62 - gates * 0.6);
  const report = () =>
    !demo && host.hud({ score, extra: `${text.gates} ${gates} · UPTIME ${time.toFixed(1)}s` });

  function spawn(x: number) {
    const size = gapSize();
    const gap = 18 + Math.random() * (GROUND - 36 - size);
    walls.push({ x, gap, size, passed: false, coin: Math.random() < 0.3, phase: Math.random() * 6 });
  }

  function reset() {
    y = 60;
    vy = 0;
    walls = [];
    score = 0;
    gates = 0;
    time = 0;
    started = demo;
    dead = false;
    for (let i = 0; i < 4; i++) spawn(W + 40 + i * SPACING);
    report();
  }
  reset();
  if (!demo) music.start();

  /** Demo autopilot: flap whenever the packet sinks below the middle of the next gap. */
  function autopilot() {
    const next = walls.find((w) => w.x + WALL_W > 40) ?? walls[0];
    const target = next.gap + next.size * 0.6;
    return y + PH / 2 > target && vy > -20;
  }

  function die() {
    dead = true;
    deadT = 0;
    music.stop();
    play("die");
    fx.burst(PX + PW / 2, y + PH / 2, PAL.bug, 10, 70);
    if (!host.reduceMotion) flash = 0.2;
  }

  function update(dt: number, input: Input) {
    t += dt;
    fx.update(dt);
    flash = Math.max(0, flash - dt);
    const tapped = demo ? autopilot() : input.wasPressed("a") || input.wasPressed("up");

    if (dead) {
      deadT += dt;
      // The packet tumbles to the floor before the round ends.
      vy += GRAVITY * dt;
      y = Math.min(GROUND - PH, y + vy * dt);
      if (deadT > 1.2) {
        if (demo) reset();
        else if (deadT < 9) {
          deadT = 9;
          host.end({ score, won: false });
        }
      }
      return;
    }

    if (!started) {
      // Hover until the first tap, so the round never starts with a fall.
      y = 60 + Math.sin(t * 4) * 3;
      scroll += 30 * dt;
      if (tapped) started = true;
      else return;
    }

    if (tapped) {
      vy = FLAP;
      play("flap");
    }
    vy = Math.min(260, vy + GRAVITY * dt);
    y += vy * dt;
    // The ceiling is soft: the packet bumps against it instead of crashing.
    if (y < 0) {
      y = 0;
      vy = Math.max(vy, 0);
    }
    time += dt;

    const v = speed() * dt;
    scroll += v;
    for (const w of walls) {
      w.x -= v;
      const coinY = w.gap + w.size / 2;
      if (w.coin && Math.abs(w.x + WALL_W / 2 - (PX + PW / 2)) < 9 && Math.abs(coinY - (y + PH / 2)) < 8) {
        w.coin = false;
        score += 5;
        play("coin");
        fx.text(PX + PW / 2, coinY - 6, "5", PAL.coin);
        report();
      }
      if (!w.passed && w.x + WALL_W < PX) {
        w.passed = true;
        gates++;
        score += 10;
        play("eat", 1 + Math.min(gates, 30) * 0.02);
        if (gates % 10 === 0) {
          play("bonus");
          fx.text(PX + PW / 2, y - 6, `${gates}`, PAL.glint);
        }
      }
      // One pixel of grace on every side of the chip.
      const overlapX = PX + PW - 1 > w.x && PX + 1 < w.x + WALL_W;
      if (overlapX && (y + 1 < w.gap || y + PH - 1 > w.gap + w.size)) return die();
    }
    if (walls[0] && walls[0].x < -WALL_W) {
      walls.shift();
      spawn(walls[walls.length - 1].x + SPACING);
    }
    if (y + PH >= GROUND) return die();
    if (Math.floor(time * 10) !== Math.floor((time - dt) * 10)) report();
  }

  function drawWall(g: CanvasRenderingContext2D, w: Wall) {
    const x = Math.round(w.x);
    const top = Math.round(w.gap);
    const bottom = Math.round(w.gap + w.size);
    // Server-rack firewall: dark body, a lit cap at the gap and blinking status LEDs.
    g.fillStyle = PAL.brickDark;
    g.fillRect(x, 0, WALL_W, top);
    g.fillRect(x, bottom, WALL_W, GROUND - bottom);
    g.fillStyle = PAL.brick;
    g.fillRect(x + 1, 0, WALL_W - 2, top - 1);
    g.fillRect(x + 1, bottom + 1, WALL_W - 2, GROUND - bottom - 1);
    g.fillStyle = PAL.bug;
    g.fillRect(x - 2, top - 5, WALL_W + 4, 5);
    g.fillRect(x - 2, bottom, WALL_W + 4, 5);
    g.fillStyle = PAL.bugDark;
    g.fillRect(x - 2, top - 1, WALL_W + 4, 1);
    g.fillRect(x - 2, bottom + 4, WALL_W + 4, 1);
    for (let ry = top - 12; ry > 0; ry -= 8) {
      g.fillStyle = PAL.forestDeep;
      g.fillRect(x + 2, ry, WALL_W - 4, 1);
      g.fillStyle = (Math.floor(t * 3 + ry) & 1) === 0 ? PAL.glint : PAL.forest;
      g.fillRect(x + WALL_W - 4, ry + 3, 1, 1);
    }
    for (let ry = bottom + 10; ry < GROUND - 2; ry += 8) {
      g.fillStyle = PAL.forestDeep;
      g.fillRect(x + 2, ry, WALL_W - 4, 1);
      g.fillStyle = (Math.floor(t * 3 + ry) & 1) === 0 ? PAL.glint : PAL.forest;
      g.fillRect(x + WALL_W - 4, ry + 3, 1, 1);
    }
    if (w.coin) {
      // Gentle bob with a per-wall phase (tying it to x made the coin jitter while scrolling).
      const cy = Math.round(w.gap + w.size / 2 + Math.sin(t * 3 + w.phase) * 1.5);
      drawSprite(g, commit, x + WALL_W / 2 - 4, cy - 2);
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    g.fillStyle = PAL.bg;
    g.fillRect(0, 0, W, H);
    // Far layer: slow data streams.
    g.fillStyle = PAL.bg2;
    for (let i = 0; i < 14; i++) {
      const sx = Math.round((((i * 53 - scroll * 0.25) % (W + 20)) + W + 20) % (W + 20)) - 10;
      g.fillRect(sx, (i * 37) % (GROUND - 10), 10, 1);
    }
    g.fillStyle = PAL.far;
    for (let i = 0; i < 8; i++) {
      const sx = Math.round((((i * 71 - scroll * 0.5) % (W + 30)) + W + 30) % (W + 30)) - 15;
      g.fillRect(sx, 10 + ((i * 29) % (GROUND - 30)), 16, 1);
    }

    for (const w of walls) drawWall(g, w);

    // Floor: a network cable with moving packets.
    g.fillStyle = PAL.mid;
    g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = PAL.forest;
    g.fillRect(0, GROUND, W, 1);
    g.fillStyle = PAL.far;
    for (let x = -((scroll * 1) % 12); x < W; x += 12) g.fillRect(Math.round(x), GROUND + 5, 6, 2);

    // A short data trail that bends with the vertical speed.
    const trail = Math.max(-4, Math.min(4, Math.round(vy / 50)));
    if (!dead && started) {
      g.fillStyle = PAL.quantum;
      g.fillRect(PX - 6, Math.round(y) + 4 - trail, 4, 1);
      g.fillRect(PX - 10, Math.round(y) + 4 - trail * 2, 2, 1);
    }
    if (!dead || Math.floor(deadT * 12) % 2) drawSprite(g, chip, PX, y);

    fx.draw(g);

    if (!started && !demo) {
      const msg = text.ready;
      drawText(g, msg, Math.round(W / 2 - (msg.length * 4) / 2), 92, Math.floor(t * 2) % 2 ? PAL.glint : PAL.ice);
    }
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
