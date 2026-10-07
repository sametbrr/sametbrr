/**
 * UI sound effects (DESIGN.md §8): short, quiet, synthesized with Web Audio — no audio files.
 * On by default; the choice persists in localStorage. Browsers only start audio after a user
 * gesture, so sounds requested before the first click/key are dropped, never queued.
 */

export type SoundName =
  | "tick"
  | "tap"
  | "toggle"
  | "success"
  | "ting"
  | "whoosh"
  | "scan"
  | "decode"
  | "type"
  | "flip"
  | "rise"
  | "swell"
  | "pop";

const STORAGE_KEY = "sound";
const MASTER_GAIN = 0.3;
/** Minimum gap between two plays of the same sound, so bursts never stack up. */
const MIN_GAP_MS = 80;

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const lastPlayed = new Map<SoundName, number>();
const listeners = new Set<() => void>();

export function isSoundOn() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {}
  listeners.forEach((cb) => cb());
  if (on) playSound("toggle");
}

export function subscribeSound(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  out = ctx.createGain();
  out.gain.value = MASTER_GAIN;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 8;
  out.connect(limiter).connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** True once the browser lets this page play audio (after a gesture, or by autoplay policy). */
export const isSoundUnlocked = () => ctx?.state === "running";

/** Creates/resumes the audio context on the first gesture (earlier if the browser already allows it). */
export function armSound() {
  const nav = navigator as Navigator & { getAutoplayPolicy?: (type: string) => string };
  if (nav.getAutoplayPolicy?.("audiocontext") === "allowed" || nav.userActivation?.hasBeenActive) ensureContext();
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    void ensureContext()?.resume();
    events.forEach((e) => window.removeEventListener(e, unlock, true));
  };
  events.forEach((e) => window.addEventListener(e, unlock, true));
  return () => events.forEach((e) => window.removeEventListener(e, unlock, true));
}

type Tone = { f0: number; f1?: number; at?: number; dur: number; gain: number; attack?: number; type?: OscillatorType };

function tone(c: AudioContext, { f0, f1 = f0, at = 0, dur, gain, attack = 0.003, type = "sine" }: Tone) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

type Noise = { f0: number; f1?: number; at?: number; dur: number; gain: number; q?: number; filter?: BiquadFilterType };

function noise(c: AudioContext, { f0, f1 = f0, at = 0, dur, gain, q = 1, filter = "bandpass" }: Noise) {
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  const bq = c.createBiquadFilter();
  const env = c.createGain();
  src.buffer = noiseBuffer;
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + Math.min(0.004 + dur * 0.35, dur));
  env.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bq).connect(env).connect(out!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

/** Glassy, digital palette: every recipe stays under ~350ms. */
const RECIPES: Record<SoundName, (c: AudioContext, pitch: number) => void> = {
  /** Boot counter beat; `pitch` rises with progress. */
  tick: (c, pitch) => tone(c, { f0: 900 * pitch, dur: 0.03, gain: 0.12, type: "triangle" }),
  tap: (c) => {
    tone(c, { f0: 1500, f1: 900, dur: 0.035, gain: 0.22 });
    noise(c, { f0: 5000, dur: 0.015, gain: 0.05, filter: "highpass" });
  },
  toggle: (c) => {
    tone(c, { f0: 880, dur: 0.04, gain: 0.16, type: "triangle" });
    tone(c, { f0: 1320, at: 0.045, dur: 0.05, gain: 0.13, type: "triangle" });
  },
  success: (c) => {
    tone(c, { f0: 1318.5, dur: 0.12, gain: 0.16, type: "triangle" });
    tone(c, { f0: 1975.5, at: 0.07, dur: 0.24, gain: 0.13, type: "triangle" });
  },
  ting: (c) => {
    tone(c, { f0: 1760, dur: 0.34, gain: 0.18 });
    tone(c, { f0: 2637, dur: 0.22, gain: 0.06 });
    tone(c, { f0: 3520, dur: 0.12, gain: 0.03 });
  },
  whoosh: (c) => noise(c, { f0: 300, f1: 1800, dur: 0.32, gain: 0.32, q: 0.8 }),
  scan: (c) => {
    noise(c, { f0: 3200, f1: 700, dur: 0.3, gain: 0.2, q: 6 });
    tone(c, { f0: 2400, f1: 1200, dur: 0.22, gain: 0.025 });
  },
  decode: (c) => {
    for (let i = 0; i < 4; i++)
      tone(c, { f0: 1200 + Math.random() * 1400, at: i * 0.035, dur: 0.02, gain: 0.07, type: "triangle" });
  },
  type: (c) => {
    [0, 0.07, 0.15].forEach((at) =>
      noise(c, { f0: 2500 + Math.random() * 800, at: at + Math.random() * 0.02, dur: 0.014, gain: 0.16, filter: "highpass" }),
    );
  },
  flip: (c) => {
    noise(c, { f0: 1800, dur: 0.045, gain: 0.2, q: 1.5 });
    noise(c, { f0: 2400, at: 0.06, dur: 0.03, gain: 0.1, q: 1.5 });
  },
  rise: (c) => noise(c, { f0: 400, f1: 1400, dur: 0.22, gain: 0.18, q: 0.9 }),
  swell: (c) => tone(c, { f0: 520, f1: 780, dur: 0.3, gain: 0.06, attack: 0.12 }),
  pop: (c) => tone(c, { f0: 320, f1: 920, dur: 0.07, gain: 0.18, attack: 0.002 }),
};

export function playSound(name: SoundName, pitch = 1) {
  if (!ctx || !isSoundOn()) return;
  // Drop rather than queue: a suspended context would replay everything at once on resume.
  if (ctx.state !== "running" && !navigator.userActivation?.isActive) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);
  RECIPES[name](ctx, pitch);
}
