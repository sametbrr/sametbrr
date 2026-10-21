import { createMusic, type Track } from "../engine/audio";
import {
  Effects,
  PAL,
  clamp,
  drawSprite,
  drawText,
  rng,
  sprite,
  type Game,
  type GameFactory,
  type Input,
} from "../engine/core";

/**
 * Deploy Runner — a side-scrolling platformer: stomp bugs, bump "?" blocks for commit coins,
 * grab a coffee for a shield and reach the PROD flag. Levels are stitched from hand-made chunks.
 */

const W = 256;
const H = 144;
const T = 16;
const ROWS = 9;

/* Level chunks: 9 rows; "#" ground, B brick, ? coin block, M coffee block, P server rack,
   o coin, e bug. Every chunk starts on solid ground, so its first column is a safe respawn. */
const CHUNKS: string[][] = [
  [
    "....................",
    "....................",
    "....................",
    ".....?..B?B.........",
    "....................",
    "....................",
    "..........e.........",
    "####################",
    "####################",
  ],
  [
    "................",
    "................",
    "................",
    ".....ooo........",
    "................",
    "................",
    "................",
    "#####...########",
    "#####...########",
  ],
  [
    "....................",
    "....................",
    "....................",
    "....................",
    ".............PP.....",
    ".......PP....PP.....",
    ".......PP..e.PP.....",
    "####################",
    "####################",
  ],
  [
    "....................",
    "....................",
    "....................",
    "....................",
    ".......#...#........",
    "......##...##.......",
    ".....###...###......",
    "########...#########",
    "########...#########",
  ],
  [
    ".................",
    ".................",
    ".................",
    ".........ooo.....",
    "........BBBBB....",
    ".................",
    ".................",
    "######.......####",
    "######.......####",
  ],
  [
    "........................",
    "........................",
    "........................",
    "..........M.............",
    "........................",
    "........................",
    ".....e.......e..e.......",
    "########################",
    "########################",
  ],
  [
    "....................",
    "...oooo.............",
    "...BBBB......?......",
    "....................",
    "....................",
    ".......B?B..........",
    "....................",
    "####################",
    "####################",
  ],
  [
    "......................",
    "......................",
    "......................",
    "......................",
    "........o...o.........",
    "......................",
    "...........e......e...",
    "######..######..######",
    "######..######..######",
  ],
  [
    "..................",
    "..................",
    "..................",
    "......B?M?B.......",
    "..................",
    "..................",
    ".........e........",
    "##################",
    "##################",
  ],
  [
    "......................",
    "......................",
    "...........ooo........",
    "..........PPPP........",
    "......................",
    "......PP........PP....",
    "......PP...e....PP....",
    "#########....#########",
    "#########....#########",
  ],
];
const START = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "################",
  "################",
];
const END = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "########################",
  "########################",
];
const FLAG_COL = 8;
const SOLID = new Set(["#", "B", "?", "U", "P", "M"]);

/* Sprites (facing right). h = hoodie, s = skin, e = eye, p = pants, w = shoes, d = outline. */
const HEAD = [
  "....hhhh....",
  "...hhhhhh...",
  "..hhhhhhhhh.",
  "..dssssss...",
  "..ssesses...",
  "..ssssss....",
  "...ssss.....",
];
const BODY = ["..hhhhhh....", ".hhhhhhhh...", ".shhhhhhs...", ".shhhhhhs..."];
const LEGS_IDLE = ["..pppppp....", "..ppp.ppp...", "..pp...pp...", "..pp...pp...", ".www..www..."];
const LEGS_RUN1 = ["..pppppp....", ".ppp...pp...", ".pp.....pp..", "pp.......pp.", "ww.......ww."];
const LEGS_RUN2 = ["..pppppp....", "...pppp.....", "...pp.pp....", "...pp.pp....", "..www.www..."];
const JUMP_BODY = ["..hhhhhh.s..", ".hhhhhhhhs..", ".shhhhhhh...", "..hhhhhh...."];
const LEGS_JUMP = ["..pppppp....", ".ppp..ppp...", ".pp....pp...", "ww......ww..", "............"];

const BUG_A = [
  "..d..........d..",
  "...d........d...",
  "....dddddddd....",
  "...drrrrrrrrd...",
  "..drwwrrrrwwrd..",
  "..drwerrrrewrd..",
  ".ddrrrrrrrrrrdd.",
  "d.drrRRrrRRrrd.d",
  "..drrrrrrrrrrd..",
  ".d.dddddddddd.d.",
  "d..d........d..d",
];
const BUG_B = [
  "..d..........d..",
  "...d........d...",
  "....dddddddd....",
  "...drrrrrrrrd...",
  "..drwwrrrrwwrd..",
  "..drwerrrrewrd..",
  "dddrrrrrrrrrrddd",
  "..drrRRrrRRrrd..",
  "..drrrrrrrrrrd..",
  "..ddddddddddd...",
  "...d..d..d..d...",
];
const BUG_FLAT = ["....dddddddd....", "..drrwerrewrrd..", "ddrrrrRRRRrrrrdd", "dddddddddddddddd"];
const COIN_A = ["..yyyy..", ".yYYYYy.", "yYyYYYYy", "yYyYYYYy", "yYyYYYYy", "yYyYYYYy", "yYYYYYYy", ".yYYYYy.", "..yyyy.."];
const COIN_B = ["...yy...", "..yYYy..", "..yYYy..", "..yYYy..", "..yYYy..", "..yYYy..", "..yYYy..", "..yYYy..", "...yy..."];
const MUG = [
  "..i..i......",
  "...i..i.....",
  "............",
  ".dddddddd...",
  ".dqqqqqqdddd",
  ".dqQqqqqd..d",
  ".dqQqqqqd..d",
  ".dqqqqqqdddd",
  ".dqqqqqqd...",
  "..dddddd....",
];

const MUSIC: Track = {
  bpm: 150,
  // C major, original bouncy line (rests = 0, holds = -1).
  lead: [
    72, 0, 76, 0, 79, -1, 76, 0, 77, 0, 74, 0, 72, -1, 0, 0,
    69, 0, 72, 0, 74, -1, 72, 0, 71, 0, 67, 0, 71, -1, 0, 0,
    72, 0, 76, 0, 79, -1, 81, 0, 79, 0, 76, 0, 77, 79, 76, 0,
    74, 0, 71, 0, 72, -1, -1, -1, 0, 0, 67, 0, 69, 0, 71, 0,
  ],
  bass: [
    48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0,
    45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0,
    48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0,
    43, 0, 50, 0, 48, 0, 55, 0, 43, 0, 47, 0, 50, 0, 43, 0,
  ],
};

type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; ground: boolean };
type Bug = Body & { alive: boolean; flat: number; active: boolean; dir: number };
type Item = Body & { taken: boolean };

function buildLevel(level: number) {
  const r = rng(level * 7919 + 17);
  const pool = [...CHUNKS];
  const picked: string[][] = [];
  const count = Math.min(5 + level, 12);
  for (let i = 0; i < count; i++) {
    if (!pool.length) pool.push(...CHUNKS);
    picked.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  const all = [START, ...picked, END];
  const rows: string[][] = Array.from({ length: ROWS }, () => []);
  const checkpoints: number[] = [];
  let col = 0;
  for (const chunk of all) {
    checkpoints.push(col * T);
    for (let y = 0; y < ROWS; y++) rows[y].push(...chunk[y]);
    col += chunk[0].length;
  }
  const flagX = (col - END[0].length + FLAG_COL) * T;
  const bugs: Bug[] = [];
  const coins: { x: number; y: number; taken: boolean }[] = [];
  rows.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (ch === "e") {
        bugs.push({ x: x * T + 1, y: y * T + 5, w: 14, h: 11, vx: 0, vy: 0, ground: false, alive: true, flat: 0, active: false, dir: -1 });
        row[x] = ".";
      } else if (ch === "o") {
        coins.push({ x: x * T + 4, y: y * T + 3, taken: false });
        row[x] = ".";
      }
    }),
  );
  return { tiles: rows, width: col * T, checkpoints, flagX, bugs, coins };
}

const TEXT = {
  tr: { coin: "COIN", time: "SÜRE", clear: "CANLIDA!", level: "SEVIYE" },
  en: { coin: "COIN", time: "TIME", clear: "DEPLOY OK!", level: "LEVEL" },
};

export const createRunner: GameFactory = (host, { demo, locale }) => {
  const text = TEXT[locale];
  const outfit = (hoodie: string) => {
    const colors = { h: hoodie, s: "#f1c27d", e: PAL.black, p: PAL.quantum, w: PAL.ice, d: PAL.black };
    return {
      idle: sprite([...HEAD, ...BODY, ...LEGS_IDLE], colors),
      run1: sprite([...HEAD, ...BODY, ...LEGS_RUN1], colors),
      run2: sprite([...HEAD, ...BODY, ...LEGS_RUN2], colors),
      jump: sprite([...HEAD, ...JUMP_BODY, ...LEGS_JUMP], colors),
    };
  };
  const normal = outfit(PAL.glint);
  const powered = outfit(PAL.quantumLight);
  const bugColors = { d: PAL.black, r: PAL.bug, R: PAL.bugDark, w: PAL.white, e: PAL.black };
  const bugA = sprite(BUG_A, bugColors);
  const bugB = sprite(BUG_B, bugColors);
  const bugFlat = sprite(BUG_FLAT, bugColors);
  const coinColors = { y: PAL.coinDark, Y: PAL.coin };
  const coinA = sprite(COIN_A, coinColors);
  const coinB = sprite(COIN_B, coinColors);
  const mug = sprite(MUG, { i: PAL.ice, d: PAL.black, q: PAL.quantum, Q: PAL.quantumLight });
  const music = createMusic(MUSIC);
  const fx = new Effects();

  // Parallax backdrop: stars and a distant server skyline, generated once.
  const sky = rng(99);
  const stars = Array.from({ length: 40 }, () => ({ x: sky() * 512, y: sky() * 70, b: sky() > 0.7 }));
  const towers = Array.from({ length: 14 }, (_, i) => ({ x: i * 40 + sky() * 16, w: 18 + sky() * 16, h: 30 + sky() * 46 }));

  let level = 1;
  let world = buildLevel(level);
  let score = 0;
  let coinCount = 0;
  let lives = 3;
  let time = 300;
  let camX = 0;
  let t = 0;
  let shake = 0;
  let phase: "play" | "dying" | "clear" | "over" = "play";
  let phaseT = 0;
  let checkpoint = 0;
  const bumps = new Map<string, number>();
  const pops: { x: number; y: number; t: number }[] = [];
  let items: Item[] = [];

  const p = { x: 40, y: 96, w: 10, h: 15, vx: 0, vy: 0, ground: false, face: 1, coyote: 0, buffer: 0, power: false, inv: 0, anim: 0 };

  const report = () => {
    if (!demo)
      host.hud({ score, lives, level, extra: `${text.coin} ${String(coinCount).padStart(2, "0")} · ${text.time} ${Math.ceil(time)}` });
  };
  const play = demo ? () => {} : host.sfx;

  function spawn(x: number) {
    p.x = x + 24;
    p.y = 96;
    p.vx = 0;
    p.vy = 0;
    p.inv = 2;
    camX = Math.max(0, p.x - 96);
  }
  function loadLevel() {
    world = buildLevel(level);
    items = [];
    pops.length = 0;
    bumps.clear();
    fx.clear();
    time = 300;
    checkpoint = 0;
    phase = "play";
    spawn(0);
    p.inv = 0;
    report();
  }
  loadLevel();
  if (!demo) music.start();

  const tileAt = (cx: number, cy: number) => {
    if (cx < 0 || cx * T >= world.width) return "#";
    if (cy < 0 || cy >= ROWS) return ".";
    return world.tiles[cy][cx];
  };
  const solid = (cx: number, cy: number) => SOLID.has(tileAt(cx, cy));

  /** Axis-separated tile collision; returns the tiles hit on each axis. */
  function move(b: Body, dt: number) {
    let hitX = false;
    let hitCeil: [number, number] | null = null;
    b.x += b.vx * dt;
    const top = Math.floor(b.y / T);
    const bottom = Math.floor((b.y + b.h - 0.01) / T);
    if (b.vx > 0) {
      const cx = Math.floor((b.x + b.w) / T);
      for (let cy = top; cy <= bottom; cy++)
        if (solid(cx, cy)) {
          b.x = cx * T - b.w - 0.01;
          b.vx = 0;
          hitX = true;
          break;
        }
    } else if (b.vx < 0) {
      const cx = Math.floor(b.x / T);
      for (let cy = top; cy <= bottom; cy++)
        if (solid(cx, cy)) {
          b.x = (cx + 1) * T + 0.01;
          b.vx = 0;
          hitX = true;
          break;
        }
    }
    b.y += b.vy * dt;
    b.ground = false;
    const left = Math.floor(b.x / T);
    const right = Math.floor((b.x + b.w - 0.01) / T);
    if (b.vy > 0) {
      const cy = Math.floor((b.y + b.h) / T);
      for (let cx = left; cx <= right; cx++)
        if (solid(cx, cy) && cy >= 0) {
          b.y = cy * T - b.h;
          b.vy = 0;
          b.ground = true;
          break;
        }
    } else if (b.vy < 0) {
      const cy = Math.floor(b.y / T);
      // Bump the block nearest the head's centre, like a real platformer.
      const centre = Math.floor((b.x + b.w / 2) / T);
      const order = [centre, left, right];
      for (const cx of order)
        if (solid(cx, cy) && cy >= 0) {
          b.y = (cy + 1) * T;
          b.vy = 0;
          hitCeil = [cx, cy];
          break;
        }
    }
    return { hitX, hitCeil };
  }

  function addScore(n: number, x: number, y: number) {
    score += n;
    fx.text(x, y, String(n));
    report();
  }
  function addCoin() {
    coinCount++;
    if (coinCount % 25 === 0) {
      lives++;
      fx.text(p.x + 5, p.y - 8, "1UP", PAL.glint);
      play("bonus");
    } else play("coin");
  }

  function bump(cx: number, cy: number) {
    const ch = world.tiles[cy][cx];
    const key = `${cx},${cy}`;
    if (ch === "?") {
      world.tiles[cy][cx] = "U";
      bumps.set(key, 0.15);
      pops.push({ x: cx * T + 4, y: cy * T - 4, t: 0 });
      addCoin();
      addScore(100, cx * T + 8, cy * T - 6);
    } else if (ch === "M") {
      world.tiles[cy][cx] = "U";
      bumps.set(key, 0.15);
      items.push({ x: cx * T + 2, y: cy * T - 10, w: 12, h: 10, vx: 40, vy: -60, ground: false, taken: false });
      play("power");
    } else if (ch === "B" && p.power) {
      world.tiles[cy][cx] = ".";
      fx.burst(cx * T + 8, cy * T + 8, PAL.brick, 8, 90);
      play("stomp");
      score += 50;
      report();
    } else {
      bumps.set(key, 0.12);
      play("bump");
    }
    // A bug standing on a bumped block gets knocked out.
    for (const b of world.bugs)
      if (b.alive && !b.flat && Math.abs(b.x + b.w / 2 - (cx * T + 8)) < 12 && Math.abs(b.y + b.h - cy * T) < 3) {
        b.alive = false;
        fx.burst(b.x + 7, b.y + 5, PAL.bug, 6);
        addScore(200, b.x + 7, b.y - 4);
      }
  }

  function hurt() {
    if (p.inv > 0 || phase !== "play") return;
    if (p.power) {
      p.power = false;
      p.inv = 1.5;
      play("hurt");
      return;
    }
    die();
  }
  function die() {
    phase = "dying";
    phaseT = 0;
    p.vy = -260;
    p.vx = 0;
    p.power = false;
    music.stop();
    play("die");
    if (!host.reduceMotion) shake = 0.25;
  }

  /** Demo autopilot: run right, jump over pits, walls and bugs. */
  function autopilot(): { left: boolean; right: boolean; jump: boolean; run: boolean } {
    const footY = Math.floor((p.y + p.h + 1) / T);
    const front = p.x + p.w + 6;
    const ahead = Math.floor((front + 10) / T);
    const pit = !solid(ahead, footY) && !solid(ahead, footY + 1);
    const wall = solid(Math.floor(front / T), Math.floor((p.y + 4) / T)) || solid(Math.floor((front + 6) / T), Math.floor((p.y + 8) / T));
    const bug = world.bugs.some((b) => b.alive && !b.flat && b.x > p.x && b.x - p.x < 44 && Math.abs(b.y - p.y) < 20);
    return { left: false, right: true, jump: pit || wall || bug || (!p.ground && p.vy < 0), run: false };
  }

  function update(dt: number, input: Input) {
    t += dt;
    fx.update(dt);
    shake = Math.max(0, shake - dt);
    for (const [k, v] of bumps) {
      if (v - dt <= 0) bumps.delete(k);
      else bumps.set(k, v - dt);
    }
    for (const c of pops) c.t += dt;
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 0.5) pops.splice(i, 1);

    if (phase === "over") return;
    if (phase === "dying") {
      phaseT += dt;
      p.vy += 900 * dt;
      p.y += p.vy * dt;
      if (phaseT > 1.8) {
        if (!demo) lives--;
        report();
        if (lives <= 0) {
          phase = "over";
          music.stop();
          host.end({ score, won: false });
          return;
        }
        if (demo) loadLevel();
        else {
          phase = "play";
          spawn(checkpoint);
          time = Math.max(time, 120);
          music.start();
        }
      }
      return;
    }
    if (phase === "clear") {
      phaseT += dt;
      // Slide down the pole, then walk into the server room.
      if (p.y < 96) p.y = Math.min(96, p.y + 90 * dt);
      else p.x += 50 * dt;
      p.anim += dt;
      if (time > 0 && phaseT > 0.8) {
        const before = Math.ceil(time);
        time = Math.max(0, time - 120 * dt);
        const counted = before - Math.ceil(time);
        if (counted > 0) {
          score += counted * 10;
          report();
          if (Math.ceil(time) % 6 === 0) play("brick", 1.4);
        }
      }
      if (phaseT > 4.2) {
        level++;
        loadLevel();
        if (!demo) {
          music.reset();
          music.start();
        }
      }
      return;
    }

    if (!demo) {
      time -= dt;
      if (Math.floor(time + dt) !== Math.floor(time)) report();
      if (time <= 0) {
        time = 0;
        die();
        return;
      }
    }

    const ai = demo ? autopilot() : null;
    const left = ai ? ai.left : input.isDown("left");
    const right = ai ? ai.right : input.isDown("right");
    const run = ai ? ai.run : input.isDown("b");
    const jumpHeld = ai ? ai.jump : input.isDown("a") || input.isDown("up");
    const jumpPressed = ai ? ai.jump && p.ground : input.wasPressed("a") || input.wasPressed("up");

    const max = run ? 140 : 90;
    const accel = p.ground ? 620 : 420;
    if (left && !right) {
      p.vx = Math.max(-max, p.vx - accel * dt * (p.vx > 0 ? 2 : 1));
      p.face = -1;
    } else if (right && !left) {
      p.vx = Math.min(max, p.vx + accel * dt * (p.vx < 0 ? 2 : 1));
      p.face = 1;
    } else {
      const f = (p.ground ? 700 : 200) * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }
    if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - accel * dt);

    p.coyote = p.ground ? 0.08 : Math.max(0, p.coyote - dt);
    p.buffer = jumpPressed ? 0.1 : Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -340 - Math.abs(p.vx) * 0.25;
      p.buffer = 0;
      p.coyote = 0;
      play("jump");
    }
    const g = p.vy < 0 && jumpHeld ? 900 : 2200;
    p.vy = Math.min(420, p.vy + g * dt);

    const { hitCeil } = move(p, dt);
    if (hitCeil) bump(hitCeil[0], hitCeil[1]);
    if (p.x < camX) {
      p.x = camX;
      p.vx = Math.max(0, p.vx);
    }
    p.inv = Math.max(0, p.inv - dt);
    p.anim += Math.abs(p.vx) * dt;
    if (p.y > H + 16) {
      die();
      return;
    }

    for (const cp of world.checkpoints) if (p.x > cp + 32 && cp > checkpoint && cp < world.flagX - 64) checkpoint = cp;

    // Camera: forward only, a little ahead of the player.
    camX = clamp(Math.max(camX, p.x - 110), 0, world.width - W);

    for (const c of world.coins)
      if (!c.taken && p.x < c.x + 8 && p.x + p.w > c.x && p.y < c.y + 9 && p.y + p.h > c.y) {
        c.taken = true;
        addCoin();
        score += 50;
        report();
      }

    for (const it of items) {
      if (it.taken) continue;
      it.vy = Math.min(400, it.vy + 900 * dt);
      const { hitX } = move(it, dt);
      if (hitX) it.vx = -it.vx || 40;
      if (p.x < it.x + it.w && p.x + p.w > it.x && p.y < it.y + it.h && p.y + p.h > it.y) {
        it.taken = true;
        p.power = true;
        play("power");
        addScore(500, it.x + 6, it.y - 4);
      }
      if (it.y > H + 20) it.taken = true;
    }

    for (const b of world.bugs) {
      if (!b.alive) continue;
      if (b.flat) {
        b.flat -= dt;
        if (b.flat <= 0) b.alive = false;
        continue;
      }
      if (!b.active) {
        if (b.x < camX + W + 16) b.active = true;
        else continue;
      }
      b.vx = b.dir * (26 + level * 4);
      b.vy = Math.min(400, b.vy + 900 * dt);
      const { hitX } = move(b, dt);
      if (hitX) b.dir = -b.dir;
      if (b.y > H + 20 || b.x < camX - 64) {
        b.alive = false;
        continue;
      }
      if (p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.h && p.y + p.h > b.y) {
        const stomp = p.vy > 0 && p.y + p.h - b.y < 9;
        if (stomp) {
          b.flat = 0.4;
          p.vy = jumpHeld ? -320 : -200;
          play("stomp");
          addScore(200, b.x + 7, b.y - 6);
        } else hurt();
      }
    }

    if (p.x + p.w > world.flagX + 6) {
      phase = "clear";
      phaseT = 0;
      p.x = world.flagX - 4;
      p.vx = 0;
      p.vy = 0;
      p.inv = 0;
      music.stop();
      play("win");
      const height = clamp(Math.round((112 - p.y) / 8) * 100, 100, 1000);
      addScore(height, world.flagX + 4, p.y - 8);
    }
  }

  function drawTile(g: CanvasRenderingContext2D, ch: string, x: number, y: number, above: string) {
    switch (ch) {
      case "#": {
        g.fillStyle = PAL.brickDark;
        g.fillRect(x, y, T, T);
        g.fillStyle = PAL.forestDeep;
        g.fillRect(x + 2, y + 9, 3, 2);
        g.fillRect(x + 10, y + 4, 2, 2);
        g.fillRect(x + 7, y + 13, 3, 1);
        if (above !== "#") {
          g.fillStyle = PAL.forest;
          g.fillRect(x, y, T, 4);
          g.fillStyle = PAL.glint;
          g.fillRect(x, y, T, 1);
          g.fillRect(x + 3, y + 4, 1, 1);
          g.fillRect(x + 11, y + 4, 1, 2);
        }
        break;
      }
      case "B":
        g.fillStyle = PAL.brick;
        g.fillRect(x, y, T, T);
        g.fillStyle = PAL.brickDark;
        g.fillRect(x, y + 7, T, 1);
        g.fillRect(x, y + 15, T, 1);
        g.fillRect(x + 7, y, 1, 7);
        g.fillRect(x + 3, y + 8, 1, 7);
        g.fillRect(x + 11, y + 8, 1, 7);
        g.fillStyle = PAL.glint;
        g.fillRect(x, y, T, 1);
        break;
      case "?":
      case "M": {
        g.fillStyle = PAL.coinDark;
        g.fillRect(x, y, T, T);
        g.fillStyle = PAL.coin;
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        g.fillStyle = PAL.coinDark;
        [1, 14].forEach((dx) => [1, 14].forEach((dy) => g.fillRect(x + dx, y + dy, 1, 1)));
        const blink = Math.floor(t * 3) % 3 === 0 ? PAL.white : PAL.coinDark;
        // Big "?" glyph scaled ×2.
        const glyph = "111001011000010";
        g.fillStyle = blink;
        for (let i = 0; i < 15; i++) if (glyph[i] === "1") g.fillRect(x + 5 + (i % 3) * 2, y + 3 + Math.floor(i / 3) * 2, 2, 2);
        break;
      }
      case "U":
        g.fillStyle = PAL.forestDeep;
        g.fillRect(x, y, T, T);
        g.fillStyle = PAL.mid;
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        g.fillStyle = PAL.forestDeep;
        [2, 13].forEach((dx) => [2, 13].forEach((dy) => g.fillRect(x + dx, y + dy, 1, 1)));
        break;
      case "P": {
        // Server rack: dark case with blinking status LEDs.
        g.fillStyle = "#0c1830";
        g.fillRect(x, y, T, T);
        g.fillStyle = PAL.quantum;
        g.fillRect(x, y, T, 1);
        g.fillRect(x, y, 1, T);
        g.fillStyle = "#1a2c55";
        g.fillRect(x + 2, y + 3, 12, 3);
        g.fillRect(x + 2, y + 9, 12, 3);
        const on = (Math.floor(t * 4) + x / T) % 3 < 2;
        g.fillStyle = on ? PAL.glint : PAL.forest;
        g.fillRect(x + 12, y + 4, 1, 1);
        g.fillStyle = on ? PAL.forest : PAL.glint;
        g.fillRect(x + 12, y + 10, 1, 1);
        break;
      }
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    const sy = shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    // Sky
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, PAL.bg);
    grad.addColorStop(1, PAL.bg2);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(sx, sy);
    for (const s of stars) {
      const x = (((s.x - camX * 0.1) % 512) + 512) % 512;
      if (x > W) continue;
      g.fillStyle = s.b && Math.floor(t * 2 + s.x) % 5 ? PAL.ice : PAL.mid;
      g.fillRect(Math.round(x), Math.round(s.y), 1, 1);
    }
    for (const tw of towers) {
      const x = (((tw.x - camX * 0.3) % 560) + 560) % 560 - 20;
      if (x > W) continue;
      g.fillStyle = PAL.far;
      g.fillRect(Math.round(x), 112 - tw.h, Math.round(tw.w), tw.h);
      g.fillStyle = PAL.forest;
      for (let wy = 112 - tw.h + 4; wy < 108; wy += 6)
        for (let wx = 3; wx < tw.w - 3; wx += 5)
          if ((wx * 7 + wy * 3 + Math.floor(tw.x)) % 4 === 0) g.fillRect(Math.round(x + wx), wy, 2, 2);
    }
    // Hills
    g.fillStyle = PAL.mid;
    for (let i = -1; i < 6; i++) {
      const hx = i * 80 - ((camX * 0.5) % 80);
      g.beginPath();
      g.moveTo(hx, 112);
      g.lineTo(hx + 40, 92);
      g.lineTo(hx + 80, 112);
      g.fill();
    }

    const cam = Math.round(camX);
    const c0 = Math.floor(camX / T);
    for (let cy = 0; cy < ROWS; cy++)
      for (let cx = c0; cx <= c0 + W / T + 1; cx++) {
        const ch = tileAt(cx, cy);
        if (ch === "." || cx * T >= world.width) continue;
        const b = bumps.get(`${cx},${cy}`);
        const off = b ? -Math.round(Math.sin((b / 0.15) * Math.PI) * 4) : 0;
        drawTile(g, ch, cx * T - cam, cy * T + off, tileAt(cx, cy - 1));
      }

    // Flag + server room
    const fx0 = world.flagX - cam;
    g.fillStyle = PAL.ghost;
    g.fillRect(fx0 + 7, 24, 2, 88);
    g.fillStyle = PAL.coin;
    g.fillRect(fx0 + 6, 20, 4, 4);
    const flagY = phase === "clear" ? Math.min(92, 26 + phaseT * 60) : 26;
    g.fillStyle = PAL.quantum;
    g.fillRect(fx0 + 9, flagY, 20, 11);
    drawText(g, "PROD", fx0 + 11, flagY + 3, PAL.ice);
    const hx = fx0 + 64;
    g.fillStyle = "#0c1830";
    g.fillRect(hx, 64, 64, 48);
    g.fillStyle = PAL.quantum;
    g.fillRect(hx, 64, 64, 2);
    g.fillRect(hx + 24, 88, 16, 24);
    g.fillStyle = PAL.black;
    g.fillRect(hx + 26, 90, 12, 22);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = Math.floor(t * 3 + i) % 2 ? PAL.glint : PAL.forest;
      g.fillRect(hx + 6 + i * 15, 72, 6, 4);
    }

    for (const c of world.coins) {
      if (c.taken) continue;
      const frame = Math.floor(t * 6 + c.x) % 4 === 0 ? coinB : coinA;
      drawSprite(g, frame, c.x - cam, c.y);
    }
    for (const c of pops) drawSprite(g, Math.floor(c.t * 16) % 2 ? coinB : coinA, c.x - cam, c.y - Math.sin((c.t / 0.5) * Math.PI) * 28);
    for (const it of items) if (!it.taken) drawSprite(g, mug, it.x - cam, it.y);
    for (const b of world.bugs) {
      if (!b.alive || !b.active) continue;
      if (b.flat) drawSprite(g, bugFlat, b.x - 1 - cam, b.y + b.h - 4);
      else drawSprite(g, Math.floor(t * 6) % 2 ? bugA : bugB, b.x - 1 - cam, b.y, b.dir > 0);
    }

    const look = p.power ? powered : normal;
    const blink = p.inv > 0 && phase === "play" && Math.floor(t * 20) % 2 === 0;
    if (!blink) {
      const frame =
        phase === "dying" || !p.ground && phase === "play"
          ? look.jump
          : Math.abs(p.vx) > 5 || phase === "clear"
            ? Math.floor(p.anim / 10) % 2
              ? look.run1
              : look.run2
            : look.idle;
      const inRoom = phase === "clear" && p.x > world.flagX + 88;
      if (!inRoom) drawSprite(g, frame, p.x - 1 - cam, p.y - 1, p.face < 0);
    }
    fx.draw(g, cam);
    g.restore();

    if (phase === "clear" && phaseT > 2.6) {
      g.fillStyle = "rgb(2 6 4 / 0.6)";
      g.fillRect(0, 56, W, 30);
      const title = text.clear;
      const sub = `${text.level} ${level + 1}`;
      drawText(g, title, Math.round(W / 2 - (title.length * 4) / 2), 63, PAL.glint);
      drawText(g, sub, Math.round(W / 2 - (sub.length * 4) / 2), 73, PAL.ice);
    }
  }

  const game: Game = {
    width: W,
    height: H,
    update,
    draw,
    setPaused: (paused) => {
      if (demo) return;
      if (paused || phase !== "play") music.stop();
      else music.start();
    },
    dispose: () => music.stop(),
  };
  return game;
};
