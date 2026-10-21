import { audioTime, playTones, type Tone } from "@/lib/sound";

/** 8-bit sound effects, synthesized like the rest of the site (square/triangle, no files). */
export type Sfx =
  | "jump"
  | "coin"
  | "stomp"
  | "bump"
  | "hurt"
  | "die"
  | "win"
  | "eat"
  | "bonus"
  | "paddle"
  | "brick"
  | "wall"
  | "power"
  | "start"
  | "pause";

const sq = (f0: number, dur: number, gain = 0.12, at = 0, f1?: number): Tone => ({ f0, f1, at, dur, gain, type: "square" });
const tri = (f0: number, dur: number, gain = 0.2, at = 0, f1?: number): Tone => ({ f0, f1, at, dur, gain, type: "triangle" });

const SFX: Record<Sfx, (pitch: number) => Tone[]> = {
  jump: () => [sq(330, 0.16, 0.1, 0, 880)],
  coin: () => [sq(988, 0.06, 0.1), sq(1319, 0.22, 0.1, 0.06)],
  stomp: () => [sq(440, 0.08, 0.12, 0, 110), tri(220, 0.1, 0.2, 0.02, 80)],
  bump: () => [tri(160, 0.07, 0.3, 0, 90)],
  hurt: () => [sq(600, 0.25, 0.12, 0, 120)],
  die: () => [
    sq(784, 0.1, 0.1),
    sq(659, 0.1, 0.1, 0.12),
    sq(523, 0.1, 0.1, 0.24),
    sq(392, 0.35, 0.1, 0.36, 196),
  ],
  win: () =>
    [523, 659, 784, 1047, 784, 1047].map((f, i) => sq(f, i === 5 ? 0.45 : 0.1, 0.1, i * 0.11)).concat(tri(262, 0.7, 0.2, 0.55)),
  eat: (pitch) => [sq(660 * pitch, 0.05, 0.09), sq(990 * pitch, 0.07, 0.08, 0.04)],
  bonus: () => [880, 1109, 1319, 1760].map((f, i) => sq(f, 0.07, 0.08, i * 0.05)),
  paddle: () => [sq(392, 0.05, 0.09)],
  brick: (pitch) => [sq(784 * pitch, 0.06, 0.09)],
  wall: () => [tri(220, 0.04, 0.15)],
  power: () => [sq(392, 0.3, 0.09, 0, 1568), sq(523, 0.3, 0.05, 0.05, 2093)],
  start: () => [523, 784, 1047].map((f, i) => sq(f, 0.08, 0.1, i * 0.08)),
  pause: () => [sq(988, 0.05, 0.08), sq(740, 0.08, 0.08, 0.07)],
};

export function sfx(name: Sfx, pitch = 1) {
  playTones(SFX[name](pitch));
}

/**
 * Chiptune loop: each track is a lead and a bass line in the same step grid.
 * Notes are MIDI numbers; 0 is a rest, a negative number holds the previous note.
 */
export type Track = { bpm: number; lead: number[]; bass: number[] };

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Steps to hold a note: counts the following "-1" cells. */
function length(line: number[], i: number) {
  let n = 1;
  while (line[i + n] === -1) n++;
  return n;
}

/**
 * Schedules notes a little ahead of the audio clock (lookahead sequencer), so timing
 * stays steady even when the game loop stutters. Silent while muted; never queues audio.
 */
export function createMusic(track: Track) {
  const step = 60 / track.bpm / 4;
  let timer: ReturnType<typeof setInterval> | null = null;
  let next = 0;
  let index = 0;
  const tick = () => {
    const now = audioTime();
    if (now === null) {
      next = 0;
      return;
    }
    if (next < now) next = now + 0.05;
    while (next < now + 0.25) {
      const at = next - now;
      const lead = track.lead[index % track.lead.length];
      const bass = track.bass[index % track.bass.length];
      const tones: Tone[] = [];
      if (lead > 0) tones.push(sq(midi(lead), step * length(track.lead, index % track.lead.length) * 0.9, 0.05, at));
      if (bass > 0) tones.push(tri(midi(bass), step * length(track.bass, index % track.bass.length) * 0.9, 0.16, at));
      if (tones.length) playTones(tones);
      next += step;
      index++;
    }
  };
  return {
    start() {
      if (timer) return;
      next = 0;
      timer = setInterval(tick, 50);
      tick();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    reset() {
      index = 0;
    },
  };
}
