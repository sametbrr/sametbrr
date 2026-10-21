import { createMusic, type Track } from "../engine/audio";
import { Effects, PAL, clamp, drawText, type Game, type GameFactory, type Input } from "../engine/core";

/**
 * Bug Smasher — breakout: clear the bug wall with the build ball. Hardened bugs take two hits,
 * "?" bugs drop power-ups (WIDE paddle, MULTI ball, extra LIFE).
 */

const W = 256;
const H = 144;
const COLS = 12;
const BW = 18;
const BH = 7;
const LEFT = (W - COLS * BW) / 2;
const TOP = 16;
const PY = 132;

const LAYOUTS = [
  ["222222222222", "111111111111", "11?111111?11", "111111111111", "111111111111"],
  ["2..222222..2", "21.1?11?1.12", ".1111111111.", "..11111111..", "...?1111?..."],
  ["1.1.1.1.1.1.", ".2.2.2.2.2.2", "1.1.?.1.?.1.", ".1.1.1.1.1.1", "2.2.2.2.2.2."],
  ["?2222222222?", "2..........2", "2.11?11?11.2", "2..........2", "222222222222"],
];
const ROW_COLORS = [PAL.bug, PAL.coin, PAL.quantumLight, PAL.glint, PAL.ice];
const CODES = ["404", "500", "ERR", "NAN", "NUL", "403", "502", "BUG", "418", "503", "401"];
const ROW_DARK = [PAL.bugDark, PAL.coinDark, PAL.quantum, PAL.forest, "#7aa9bd"];

const MUSIC: Track = {
  bpm: 140,
  lead: [
    76, 0, 79, 0, 83, 0, 79, 0, 81, -1, 79, 0, 76, 0, 0, 0,
    74, 0, 77, 0, 81, 0, 77, 0, 79, -1, 77, 0, 74, 0, 0, 0,
  ],
  bass: [
    40, 0, 52, 0, 40, 0, 52, 0, 45, 0, 57, 0, 45, 0, 57, 0,
    38, 0, 50, 0, 38, 0, 50, 0, 43, 0, 55, 0, 43, 0, 55, 0,
  ],
};

type Brick = { x: number; y: number; hp: number; row: number; power: boolean };
type Ball = { x: number; y: number; vx: number; vy: number; stuck: boolean };
type Drop = { x: number; y: number; kind: "WIDE" | "MULTI" | "LIFE" };

// The 3×5 pixel font is ASCII only: Turkish capitals are written without the dot on İ.
const TEXT = {
  tr: { bugs: "HATA", fire: "FIRLAT!", level: "SEVIYE" },
  en: { bugs: "BUGS", fire: "FIRE!", level: "LEVEL" },
};

export const createBreakout: GameFactory = (host, { demo, locale }) => {
  const text = TEXT[locale];
  const fx = new Effects();
  const music = createMusic(MUSIC);
  const play = demo ? () => {} : host.sfx;

  let level = 1;
  let score = 0;
  let lives = 3;
  let bricks: Brick[] = [];
  let balls: Ball[] = [];
  let drops: Drop[] = [];
  let px = W / 2;
  let wide = 0;
  let t = 0;
  let shake = 0;
  let over = false;
  let clearT = 0;

  let bricksTotal = 0;

  // Difficulty ramps by level: a slow ball and a wide paddle on level 1, faster and narrower later.
  const pw = () => Math.max(30, 44 - (level - 1) * 3) + (wide > 0 ? 18 : 0);
  const speed = () =>
    Math.min(175, 88 + (level - 1) * 10 + (bricksTotal ? (1 - bricks.length / bricksTotal) * 22 : 0));

  const report = () => !demo && host.hud({ score, lives, level, extra: `${text.bugs} ${bricks.length}` });

  function loadLevel() {
    const layout = LAYOUTS[(level - 1) % LAYOUTS.length];
    bricks = [];
    layout.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === ".") return;
        bricks.push({ x: LEFT + c * BW, y: TOP + r * (BH + 2), hp: ch === "2" ? 2 : 1, row: r, power: ch === "?" });
      }),
    );
    bricksTotal = bricks.length;
    drops = [];
    serve();
    report();
  }
  function serve() {
    balls = [{ x: px, y: PY - 4, vx: 0, vy: 0, stuck: true }];
  }
  function launch(b: Ball) {
    const a = (Math.random() - 0.5) * 0.8;
    b.stuck = false;
    b.vx = Math.sin(a) * speed();
    b.vy = -Math.cos(a) * speed();
    play("paddle");
  }
  loadLevel();
  if (!demo) music.start();

  function hitBrick(br: Brick) {
    br.hp--;
    if (br.hp > 0) {
      play("wall");
      fx.burst(br.x + BW / 2, br.y + BH / 2, ROW_DARK[br.row], 3, 40);
      return;
    }
    bricks.splice(bricks.indexOf(br), 1);
    const pts = 10 * (5 - br.row) + (br.power ? 40 : 0);
    score += pts;
    play("brick", 0.8 + (5 - br.row) * 0.12);
    fx.burst(br.x + BW / 2, br.y + BH / 2, ROW_COLORS[br.row], 6, 70);
    if (br.power) {
      const kinds: Drop["kind"][] = ["WIDE", "MULTI", "WIDE", "LIFE"];
      drops.push({ x: br.x + BW / 2, y: br.y, kind: kinds[Math.floor(Math.random() * kinds.length)] });
    }
    report();
  }

  function stepBall(b: Ball, dt: number) {
    // Move one axis at a time so the bounce side is unambiguous.
    b.x += b.vx * dt;
    if (b.x < 1) {
      b.x = 1;
      b.vx = Math.abs(b.vx);
      play("wall");
    } else if (b.x > W - 4) {
      b.x = W - 4;
      b.vx = -Math.abs(b.vx);
      play("wall");
    }
    let hit = bricks.find((br) => b.x < br.x + BW && b.x + 3 > br.x && b.y < br.y + BH && b.y + 3 > br.y);
    if (hit) {
      b.x = b.vx > 0 ? hit.x - 3 : hit.x + BW;
      b.vx = -b.vx;
      hitBrick(hit);
    }
    b.y += b.vy * dt;
    if (b.y < 1) {
      b.y = 1;
      b.vy = Math.abs(b.vy);
      play("wall");
    }
    hit = bricks.find((br) => b.x < br.x + BW && b.x + 3 > br.x && b.y < br.y + BH && b.y + 3 > br.y);
    if (hit) {
      b.y = b.vy > 0 ? hit.y - 3 : hit.y + BH;
      b.vy = -b.vy;
      hitBrick(hit);
    }
    // Paddle: the hit offset sets the outgoing angle (up to ±60°).
    const half = pw() / 2;
    if (b.vy > 0 && b.y + 3 >= PY && b.y + 3 <= PY + 5 && b.x + 3 > px - half && b.x < px + half) {
      const off = clamp((b.x + 1.5 - px) / half, -1, 1);
      const a = off * (Math.PI / 3);
      const s = speed();
      b.vx = Math.sin(a) * s;
      b.vy = -Math.cos(a) * s;
      b.y = PY - 3;
      play("paddle");
    }
  }

  function update(dt: number, input: Input) {
    t += dt;
    fx.update(dt);
    shake = Math.max(0, shake - dt);
    if (over) return;
    if (clearT > 0) {
      clearT -= dt;
      if (clearT <= 0) {
        level++;
        // Every cleared level is worth an extra life.
        lives = Math.min(lives + 1, 9);
        loadLevel();
        if (!demo) music.start();
      }
      return;
    }
    wide = Math.max(0, wide - dt);

    const half = pw() / 2;
    if (demo) {
      const target = balls.reduce((lo, b) => (b.y > lo.y ? b : lo), balls[0]);
      px += clamp(target.x + 1.5 - px + Math.sin(t * 2) * 6, -170 * dt, 170 * dt);
      if (balls.some((b) => b.stuck) && t % 2 < dt) balls.forEach((b) => b.stuck && launch(b));
    } else if (input.pointerX !== null) px = input.pointerX;
    else {
      const dir = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
      px += dir * (input.isDown("b") ? 260 : 180) * dt;
    }
    px = clamp(px, half, W - half);

    const fire = !demo && (input.wasPressed("a") || input.wasPressed("up"));
    for (const b of balls) {
      if (b.stuck) {
        b.x = px - 1.5;
        b.y = PY - 4;
        if (fire) launch(b);
        continue;
      }
      stepBall(b, dt / 2);
      stepBall(b, dt / 2);
    }
    balls = balls.filter((b) => b.y < H + 4);
    if (!balls.length) {
      if (!demo) lives--;
      play("die");
      if (!host.reduceMotion) shake = 0.25;
      wide = 0;
      report();
      if (lives <= 0) {
        over = true;
        music.stop();
        host.end({ score, won: false });
        return;
      }
      serve();
    }

    for (const d of drops) {
      d.y += 50 * dt;
      if (d.y + 6 >= PY && d.y <= PY + 4 && Math.abs(d.x - px) < half + 6) {
        d.y = H + 10;
        play("power");
        fx.text(d.x, PY - 10, d.kind === "LIFE" ? "1UP" : "+50", PAL.coin);
        score += 50;
        if (d.kind === "WIDE") wide = 12;
        if (d.kind === "LIFE") lives++;
        if (d.kind === "MULTI") {
          const src = balls.find((b) => !b.stuck) ?? balls[0];
          for (const a of [-0.5, 0.5])
            balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * speed(), vy: -Math.cos(a) * speed(), stuck: false });
        }
        report();
      }
    }
    drops = drops.filter((d) => d.y < H + 8);

    if (!bricks.length) {
      clearT = 2.4;
      music.stop();
      play("win");
      score += 500;
      report();
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    g.fillStyle = PAL.bg;
    g.fillRect(0, 0, W, H);
    g.save();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
    g.fillStyle = PAL.bg2;
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);

    for (const br of bricks) {
      const hard = br.hp > 1;
      g.fillStyle = hard ? ROW_DARK[br.row] : ROW_COLORS[br.row];
      g.fillRect(br.x + 1, br.y, BW - 2, BH);
      g.fillStyle = hard ? ROW_COLORS[br.row] : ROW_DARK[br.row];
      g.fillRect(br.x + 1, br.y + BH - 1, BW - 2, 1);
      if (hard) {
        g.fillRect(br.x + 1, br.y, BW - 2, 1);
        g.fillRect(br.x + 1, br.y, 1, BH);
        g.fillRect(br.x + BW - 2, br.y, 1, BH);
      }
      if (br.power) drawText(g, "?", br.x + 8, br.y + 1, Math.floor(t * 4) % 2 ? PAL.white : PAL.black);
      else {
        // Each bug brick is labelled with an error code.
        const code = CODES[(Math.round((br.x - LEFT) / BW) * 3 + br.row * 5) % CODES.length];
        g.globalAlpha = hard ? 1 : 0.6;
        drawText(g, code, br.x + 4, br.y + 1, hard ? ROW_COLORS[br.row] : PAL.black);
        g.globalAlpha = 1;
      }
    }

    for (const d of drops) {
      g.fillStyle = d.kind === "LIFE" ? PAL.bug : d.kind === "MULTI" ? PAL.quantum : PAL.forest;
      g.fillRect(Math.round(d.x - 9), Math.round(d.y), 19, 7);
      drawText(g, d.kind === "LIFE" ? "1UP" : d.kind === "MULTI" ? "x3" : "W", Math.round(d.x - (d.kind === "LIFE" ? 6 : d.kind === "MULTI" ? 4 : 1)), Math.round(d.y + 1), PAL.ice);
    }

    const half = pw() / 2;
    g.fillStyle = PAL.ghost;
    g.fillRect(Math.round(px - half), PY, Math.round(half * 2), 4);
    g.fillStyle = PAL.forest;
    g.fillRect(Math.round(px - half), PY + 3, Math.round(half * 2), 1);
    g.fillStyle = wide > 0 && (wide > 2 || Math.floor(t * 8) % 2) ? PAL.quantum : PAL.glint;
    g.fillRect(Math.round(px - half) + 2, PY + 1, 3, 1);
    g.fillRect(Math.round(px + half) - 5, PY + 1, 3, 1);

    for (const b of balls) {
      g.fillStyle = PAL.white;
      g.fillRect(Math.round(b.x), Math.round(b.y), 3, 3);
    }
    if (balls.some((b) => b.stuck) && !demo && Math.floor(t * 2) % 2)
      drawText(g, text.fire, Math.round(W / 2 - (text.fire.length * 4) / 2), 100, PAL.glint);
    fx.draw(g);
    g.restore();
    if (clearT > 0) {
      g.fillStyle = "rgb(2 6 4 / 0.6)";
      g.fillRect(0, 60, W, 22);
      const sub = `${text.level} ${level + 1}  +1UP`;
      drawText(g, sub, Math.round(W / 2 - (sub.length * 4) / 2), 69, PAL.glint);
    }
  }

  return {
    width: W,
    height: H,
    update,
    draw,
    setPaused: (paused) => {
      if (demo) return;
      if (paused || over || clearT > 0) music.stop();
      else music.start();
    },
    dispose: () => music.stop(),
  } satisfies Game;
};
