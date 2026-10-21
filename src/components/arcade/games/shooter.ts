import { createMusic, type Track } from "../engine/audio";
import { Effects, PAL, clamp, drawSprite, drawText, sprite, type Game, type GameFactory, type Input } from "../engine/core";

/**
 * Merge Conflict — fixed shooter: a formation of conflicts, bugs and warnings marches down,
 * front-row enemies dive from wave 2 on, and every fourth wave is the Legacy Monolith boss.
 */

const W = 256;
const H = 144;
const SHIP_Y = 128;
const COLS = 8;
const ROWS = 4;

type Kind = "conflict" | "bug" | "warn";
type Enemy = {
  kind: Kind;
  col: number;
  row: number;
  x: number;
  y: number;
  alive: boolean;
  state: "form" | "dive" | "return";
  t: number;
  sx: number;
  tx: number;
};
type Shot = { x: number; y: number; vx: number; vy: number };
type Drop = { x: number; y: number; kind: "2X" | "1UP" };
type Boss = { x: number; y: number; hp: number; max: number; t: number; cool: number };

/* Characters are code symbols: the ship is a ">_" terminal, the formation is made of
   "<<<" merge-conflict markers, bug icons and "!" warnings. */
const SHIP = [
  "....www....",
  "wwwwwwwwwww",
  "wqqqqqqqqqw",
  "wqGqqqqqqqw",
  "wqqGqqqqqqw",
  "wqGqqGGGqqw",
  "wwwwwwwwwww",
  ".gg.....gg.",
];
const CONFLICT = [
  [
    "..r..r..r",
    ".r..r..r.",
    "r..r..r..",
    ".r..r..r.",
    "..r..r..r",
    ".........",
    "rrrrrrrrr",
  ],
  [
    ".r..r..r.",
    "r..r..r..",
    ".r..r..r.",
    "r..r..r..",
    ".r..r..r.",
    ".........",
    "r.r.r.r.r",
  ],
];
const BUG = [
  [
    "..r...r..",
    "...rrr...",
    "r.rrrrr.r",
    ".rrr.rrr.",
    "r.rr.rr.r",
    ".rrr.rrr.",
    "r..rrr..r",
  ],
  [
    ".r.....r.",
    "...rrr...",
    ".rrrrrrr.",
    "rrrr.rrrr",
    ".rrr.rrr.",
    "rrrr.rrrr",
    "...rrr...",
  ],
];
const WARN = [
  [
    "....r....",
    "...rrr...",
    "...r.r...",
    "..rr.rr..",
    ".rrrrrrr.",
    ".rrr.rrr.",
    "rrrrrrrrr",
  ],
  [
    "....r....",
    "...rrr...",
    "...rrr...",
    "..rrrrr..",
    ".rrrrrrr.",
    ".rrrrrrr.",
    "rrrrrrrrr",
  ],
];

/** Divers wobble in place before they leave, then fly a fixed line at where the ship was. */
const TELEGRAPH = 0.55;

const POINTS: Record<Kind, number> = { conflict: 30, bug: 20, warn: 10 };

const MUSIC: Track = {
  bpm: 150,
  lead: [
    64, 0, 64, 67, 0, 64, 71, 0, 69, 0, 67, 0, 64, 0, 62, 0,
    60, 0, 60, 64, 0, 60, 67, 0, 66, 0, 64, 0, 62, 0, 59, 0,
  ],
  bass: [
    40, 40, 0, 40, 47, 0, 40, 0, 40, 40, 0, 40, 47, 0, 45, 0,
    36, 36, 0, 36, 43, 0, 36, 0, 38, 38, 0, 38, 45, 0, 43, 0,
  ],
};

// The 3×5 pixel font is ASCII only: Turkish capitals are written without diacritics.
const TEXT = {
  tr: { wave: "DALGA", merged: "BIRLESTIRILDI!", boss: "LEGACY MONOLIT" },
  en: { wave: "WAVE", merged: "MERGED!", boss: "LEGACY MONOLITH" },
};

export const createShooter: GameFactory = (host, { demo, locale }) => {
  const text = TEXT[locale];
  const fx = new Effects();
  const music = createMusic(MUSIC);
  const play = demo ? () => {} : host.sfx;
  const ship = sprite(SHIP, { w: PAL.ice, q: PAL.black, G: PAL.glint, g: PAL.quantumLight });
  const looks: Record<Kind, HTMLCanvasElement[]> = {
    conflict: CONFLICT.map((f) => sprite(f, { r: PAL.bug })),
    bug: BUG.map((f) => sprite(f, { r: PAL.quantumLight })),
    warn: WARN.map((f) => sprite(f, { r: PAL.coin })),
  };

  let wave = 1;
  let score = 0;
  let lives = 3;
  let px = W / 2;
  let enemies: Enemy[] = [];
  let boss: Boss | null = null;
  let shots: Shot[] = [];
  let bombs: Shot[] = [];
  let drops: Drop[] = [];
  let fx0 = 0;
  let fy0 = 0;
  let dirX = 1;
  let cool = 0;
  let bombCool = 2;
  let diveCool = 4;
  let doubleT = 0;
  let invuln = 0;
  let banner = 0;
  let clearT = 0;
  let dead = false;
  let deadT = 0;
  let flash = 0;
  let shake = 0;
  let t = 0;
  const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 97) % W, y: (i * 61) % H, s: 6 + (i % 3) * 8 }));

  const report = () => !demo && host.hud({ score, lives, level: wave });

  function startWave() {
    shots = [];
    bombs = [];
    drops = [];
    banner = 1.6;
    clearT = 0;
    if (wave % 4 === 0) {
      enemies = [];
      const max = 24 + wave * 4;
      boss = { x: W / 2, y: 26, hp: max, max, t: 0, cool: 1.5 };
    } else {
      boss = null;
      fx0 = (W - COLS * 16) / 2;
      fy0 = 16;
      dirX = 1;
      enemies = [];
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++) {
          const kind: Kind = row === 0 ? "conflict" : row < 3 ? "bug" : "warn";
          enemies.push({ kind, col, row, x: 0, y: 0, alive: true, state: "form", t: 0, sx: 0, tx: 0 });
        }
      placeFormation();
    }
    report();
  }
  const slot = (e: Enemy) => ({ x: fx0 + e.col * 16 + 3, y: fy0 + e.row * 11 });
  function placeFormation() {
    for (const e of enemies) if (e.state === "form") Object.assign(e, slot(e));
  }

  function reset() {
    wave = 1;
    score = 0;
    lives = 3;
    px = W / 2;
    dead = false;
    invuln = 0;
    doubleT = 0;
    startWave();
  }
  reset();
  if (!demo) music.start();

  function hitShip() {
    if (invuln > 0 || dead) return;
    lives--;
    bombs = [];
    fx.burst(px, SHIP_Y + 3, PAL.glint, 12, 80);
    if (!host.reduceMotion) shake = 0.3;
    report();
    if (lives <= 0) {
      dead = true;
      deadT = 0;
      music.stop();
      play("die");
      if (!host.reduceMotion) flash = 0.25;
      return;
    }
    play("hurt");
    invuln = 2;
  }

  function kill(e: Enemy) {
    e.alive = false;
    const pts = POINTS[e.kind] * (e.state === "dive" ? 2 : 1);
    score += pts;
    play("boom", e.kind === "conflict" ? 1.2 : e.kind === "bug" ? 1 : 0.8);
    fx.burst(e.x + 4, e.y + 3, e.kind === "conflict" ? PAL.bug : e.kind === "bug" ? PAL.quantumLight : PAL.coin, 8, 60);
    if (e.state === "dive") fx.text(e.x + 4, e.y - 4, String(pts), PAL.ice);
    const roll = Math.random();
    if (roll < 0.015) drops.push({ x: e.x + 4, y: e.y + 4, kind: "1UP" });
    else if (roll < 0.08) drops.push({ x: e.x + 4, y: e.y + 4, kind: "2X" });
    report();
  }

  /** Demo autopilot: chase the lowest enemy, sidestep bombs that are about to land. */
  function autopilotX() {
    const threat =
      bombs.find((b) => b.y > 92 && Math.abs(b.x - px) < 9) ??
      enemies.find((e) => e.alive && e.state === "dive" && e.y > 70 && Math.abs(e.x + 4 - px) < 14);
    if (threat) return px + (threat.x + 4 > px ? -40 : 40);
    if (boss) return boss.x;
    const alive = enemies.filter((e) => e.alive);
    if (!alive.length) return px;
    const lowest = alive.reduce((a, b) => (b.y > a.y || (b.y === a.y && Math.abs(b.x - px) < Math.abs(a.x - px)) ? b : a));
    return lowest.x + 4;
  }

  function fire() {
    const n = shots.length;
    if (doubleT > 0) {
      if (n > 4) return;
      shots.push({ x: px - 4, y: SHIP_Y, vx: 0, vy: -190 }, { x: px + 4, y: SHIP_Y, vx: 0, vy: -190 });
    } else {
      if (n > 2) return;
      shots.push({ x: px, y: SHIP_Y - 1, vx: 0, vy: -200 });
    }
    cool = 0.24;
    play("shoot");
  }

  function update(dt: number, input: Input) {
    t += dt;
    fx.update(dt);
    flash = Math.max(0, flash - dt);
    shake = Math.max(0, shake - dt);
    banner = Math.max(0, banner - dt);
    invuln = Math.max(0, invuln - dt);
    doubleT = Math.max(0, doubleT - dt);
    cool -= dt;
    for (const s of stars) s.y = (s.y + s.s * dt) % H;

    if (dead) {
      deadT += dt;
      if (deadT > 1.4) {
        if (demo) reset();
        else if (deadT < 9) {
          deadT = 9;
          host.end({ score, won: false });
        }
      }
      return;
    }

    // Ship: keys, pointer (touch drag / mouse) or autopilot.
    if (demo) {
      const target = autopilotX();
      px += clamp(target - px, -120 * dt, 120 * dt);
    } else if (input.pointerX !== null) {
      px += clamp(input.pointerX - px, -280 * dt, 280 * dt);
    } else {
      px += ((input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0)) * 130 * dt;
    }
    px = clamp(px, 7, W - 7);
    const firing = demo ? banner === 0 : input.isDown("a") || input.isDown("up") || input.isDown("b");
    if (firing && cool <= 0 && banner < 1) fire();

    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    shots = shots.filter((s) => s.y > -6);

    // Formation march: faster as it thins out and wave by wave.
    const alive = enemies.filter((e) => e.alive);
    const formed = alive.filter((e) => e.state === "form");
    if (formed.length) {
      const speed = 8 + (1 - alive.length / (ROWS * COLS)) * 30 + wave * 4;
      fx0 += dirX * speed * dt;
      const minX = Math.min(...formed.map((e) => fx0 + e.col * 16 + 3));
      const maxX = Math.max(...formed.map((e) => fx0 + e.col * 16 + 12));
      if ((dirX > 0 && maxX > W - 4) || (dirX < 0 && minX < 4)) {
        dirX = -dirX;
        fy0 += 4;
      }
    }
    placeFormation();

    // Divers: a front-row enemy leaves the formation and swoops at the ship.
    diveCool -= dt;
    if (wave >= 2 && diveCool <= 0 && formed.length) {
      diveCool = Math.max(1.2, 4 - wave * 0.4) + Math.random() * 2;
      const front = formed.filter((e) => !formed.some((o) => o.col === e.col && o.row > e.row));
      const e = front[Math.floor(Math.random() * front.length)];
      e.state = "dive";
      e.t = 0;
      e.sx = e.x;
      e.tx = px;
    }
    for (const e of alive) {
      if (e.state === "dive") {
        e.t += dt;
        if (e.t < TELEGRAPH) {
          // Warning wobble in its slot; the target is locked when it leaves.
          const home = slot(e);
          e.x = home.x + Math.round(Math.sin(e.t * 50));
          e.y = home.y;
          e.sx = e.x;
          e.tx = px;
        } else {
          const k = Math.min(1, (e.t - TELEGRAPH) / 1.5);
          e.y += (48 + wave * 3) * dt;
          e.x = e.sx + (e.tx - e.sx) * k + Math.sin((e.t - TELEGRAPH) * 4) * 10;
        }
        if (e.y > H + 8) {
          e.state = "return";
          e.y = -10;
        }
      } else if (e.state === "return") {
        const s = slot(e);
        const dx = s.x - e.x;
        const dy = s.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 2) e.state = "form";
        else {
          e.x += (dx / d) * 90 * dt;
          e.y += (dy / d) * 90 * dt;
        }
      }
      if (e.state === "form" && e.y > SHIP_Y - 8) {
        // The formation reached the ship: the whole merge failed.
        lives = 1;
        invuln = 0;
        hitShip();
        return;
      }
      if (invuln <= 0 && Math.abs(e.x + 4 - px) < 8 && Math.abs(e.y + 3 - (SHIP_Y + 4)) < 6) {
        kill(e);
        hitShip();
      }
    }

    // Enemy bombs from the bottom of a random column.
    bombCool -= dt;
    if (bombCool <= 0 && formed.length && banner === 0) {
      bombCool = Math.max(0.35, 1.9 - wave * 0.16) * (0.6 + Math.random() * 0.8);
      const shooters = formed.filter((e) => !formed.some((o) => o.col === e.col && o.row > e.row));
      const e = shooters[Math.floor(Math.random() * shooters.length)];
      if (bombs.length < 2 + wave) bombs.push({ x: e.x + 4, y: e.y + 7, vx: 0, vy: 56 + wave * 7 });
    }

    // Boss: drifts, fires spreads, soaks hits.
    if (boss) {
      boss.t += dt;
      boss.x = W / 2 + Math.sin(boss.t * 0.9) * 80;
      boss.y = 26 + Math.sin(boss.t * 1.7) * 4;
      boss.cool -= dt;
      if (boss.cool <= 0 && banner === 0) {
        boss.cool = Math.max(0.7, 1.4 - wave * 0.05);
        for (const vx of [-40, 0, 40]) bombs.push({ x: boss.x, y: boss.y + 12, vx, vy: 80 });
      }
    }

    for (const b of bombs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.abs(b.x - px) < 5 && b.y > SHIP_Y && b.y < SHIP_Y + 7) {
        b.y = H + 10;
        hitShip();
      }
    }
    bombs = bombs.filter((b) => b.y < H + 4);

    // Player shots against enemies and the boss.
    for (const s of shots) {
      for (const e of alive) {
        if (!e.alive) continue;
        if (s.x >= e.x - 1 && s.x <= e.x + 10 && s.y >= e.y && s.y <= e.y + 8) {
          kill(e);
          s.y = -99;
          break;
        }
      }
      if (boss && s.y > -50 && Math.abs(s.x - boss.x) < 24 && Math.abs(s.y - boss.y) < 12) {
        s.y = -99;
        boss.hp--;
        score += 5;
        play("brick", 0.7 + (boss.hp / boss.max) * 0.5);
        fx.burst(s.x, boss.y + 10, PAL.ice, 3, 40);
        if (boss.hp <= 0) {
          score += 500;
          play("win");
          fx.burst(boss.x, boss.y, PAL.bug, 20, 110);
          fx.text(boss.x, boss.y - 10, "500", PAL.coin);
          if (!host.reduceMotion) shake = 0.4;
          boss = null;
        }
        report();
      }
    }

    for (const d of drops) {
      d.y += 40 * dt;
      if (Math.abs(d.x - px) < 9 && d.y > SHIP_Y - 4 && d.y < SHIP_Y + 8) {
        d.y = H + 10;
        play("power");
        if (d.kind === "2X") doubleT = 10;
        else {
          lives = Math.min(lives + 1, 6);
          report();
        }
        fx.text(px, SHIP_Y - 8, d.kind === "2X" ? "2X" : "1UP", PAL.glint);
      }
    }
    drops = drops.filter((d) => d.y < H);

    if (!boss && !enemies.some((e) => e.alive)) {
      if (clearT === 0) {
        score += 100 * wave;
        report();
        play("bonus");
      }
      clearT += dt;
      if (clearT > 1.6) {
        wave++;
        // Every cleared wave is worth an extra life.
        lives = Math.min(lives + 1, 6);
        startWave();
      }
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    g.fillStyle = PAL.bg;
    g.fillRect(0, 0, W, H);
    g.save();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
    for (const s of stars) {
      g.fillStyle = s.s > 15 ? PAL.mid : PAL.far;
      g.fillRect(s.x, Math.round(s.y), 1, s.s > 15 ? 2 : 1);
    }
    g.fillStyle = PAL.far;
    g.fillRect(0, SHIP_Y + 9, W, 1);

    const frame = Math.floor(t * 2) % 2;
    for (const e of enemies) if (e.alive) drawSprite(g, looks[e.kind][e.state === "dive" ? Math.floor(t * 8) % 2 : frame], e.x, e.y);

    if (boss) {
      const bx = Math.round(boss.x - 24);
      const by = Math.round(boss.y - 11);
      g.fillStyle = PAL.bugDark;
      g.fillRect(bx, by, 48, 22);
      g.fillStyle = PAL.mid;
      g.fillRect(bx + 2, by + 2, 44, 18);
      drawText(g, "LEGACY", bx + 12, by + 4, PAL.coin);
      g.fillStyle = Math.floor(t * 6) % 2 ? PAL.bug : PAL.coin;
      g.fillRect(bx + 10, by + 12, 6, 3);
      g.fillRect(bx + 32, by + 12, 6, 3);
      g.fillStyle = PAL.bug;
      for (let i = 0; i < 5; i++) g.fillRect(bx + 4 + i * 9, by + 22, 4, 2);
      // Health bar along the top of the screen.
      g.fillStyle = PAL.far;
      g.fillRect(40, 4, W - 80, 3);
      g.fillStyle = PAL.bug;
      g.fillRect(40, 4, Math.round(((W - 80) * boss.hp) / boss.max), 3);
    }

    g.fillStyle = PAL.ice;
    for (const s of shots) g.fillRect(Math.round(s.x), Math.round(s.y), 1, 4);
    for (const b of bombs) {
      g.fillStyle = Math.floor(t * 12) % 2 ? PAL.bug : PAL.coin;
      g.fillRect(Math.round(b.x) - 1, Math.round(b.y), 2, 3);
    }
    for (const d of drops) {
      g.fillStyle = d.kind === "1UP" ? PAL.bug : PAL.quantum;
      g.fillRect(Math.round(d.x) - 7, Math.round(d.y) - 1, 15, 7);
      drawText(g, d.kind, Math.round(d.x) - (d.kind.length * 4) / 2 + 1, Math.round(d.y), PAL.ice);
    }

    if (!dead && (invuln <= 0 || Math.floor(invuln * 12) % 2)) {
      drawSprite(g, ship, px - 5, SHIP_Y - 1);
      if (doubleT > 0) {
        g.fillStyle = Math.floor(t * 8) % 2 ? PAL.quantumLight : PAL.quantum;
        g.fillRect(Math.round(px) - 6, SHIP_Y + 8, 12, 1);
      }
    }
    fx.draw(g);
    g.restore();

    if (banner > 0 && !demo) {
      const title = boss ? text.boss : `${text.wave} ${wave}`;
      drawText(g, title, Math.round(W / 2 - (title.length * 4) / 2), 72, PAL.glint);
    }
    if (clearT > 0) {
      drawText(g, text.merged, Math.round(W / 2 - (text.merged.length * 4) / 2), 68, PAL.glint);
      drawText(g, "+1UP", W / 2 - 8, 78, PAL.coin);
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
