/** Digital terminal palette, synthesized locally; unlocked gestures only, no queued audio. */
export type SoundName = "tick" | "hover" | "tap" | "toggle" | "success" | "ting" | "whoosh" | "scan" | "decode" | "type" | "flip" | "rise" | "swell" | "pop";
const STORAGE_KEY = "sound";
const SESSION_MUTE_KEY = "sound-session-muted";
const MASTER_GAIN = 0.38;
const lastPlayed = new Map<SoundName, number>();
const listeners = new Set<() => void>();
const sources = new Set<OscillatorNode>();
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let sessionMuted = false;
let lastReveal = -Infinity;
let lastInteraction = -Infinity;

export function isSoundOn() {
  try { return !sessionMuted && sessionStorage.getItem(SESSION_MUTE_KEY) !== "1" && localStorage.getItem(STORAGE_KEY) !== "off"; }
  catch { return !sessionMuted; }
}
function syncOutput() {
  if (!ctx || !out) return;
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setTargetAtTime(isSoundOn() ? MASTER_GAIN : 0, ctx.currentTime, 0.008);
  if (!isSoundOn()) {
    sources.forEach((source) => { try { source.stop(); } catch {} });
    sources.clear();
  }
}
/** Timeout only mutes this tab; an explicit later choice restores the saved preference. */
export function muteSoundForSession() {
  sessionMuted = true;
  try { sessionStorage.setItem(SESSION_MUTE_KEY, "1"); } catch {}
  syncOutput();
  listeners.forEach((cb) => cb());
}
export function setSoundOn(on: boolean) {
  sessionMuted = !on;
  try { sessionStorage.removeItem(SESSION_MUTE_KEY); localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch {}
  syncOutput();
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
  try {
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = isSoundOn() ? MASTER_GAIN : 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 8;
    out.connect(limiter).connect(ctx.destination);
    return ctx;
  } catch { ctx = null; out = null; return null; }
}
export const isSoundUnlocked = () => ctx?.state === "running";
export function armSound() {
  const nav = navigator as Navigator & { getAutoplayPolicy?: (type: string) => string };
  if (nav.getAutoplayPolicy?.("audiocontext") === "allowed" || nav.userActivation?.hasBeenActive) void ensureContext()?.resume();
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    void ensureContext()?.resume();
    events.forEach((event) => window.removeEventListener(event, unlock, true));
  };
  events.forEach((event) => window.addEventListener(event, unlock, true));
  return () => events.forEach((event) => window.removeEventListener(event, unlock, true));
}

type Tone = { f0: number; f1?: number; at?: number; dur: number; gain: number; type?: OscillatorType };
function tone(c: AudioContext, { f0, f1 = f0, at = 0, dur, gain, type = "triangle" }: Tone) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out!);
  sources.add(osc);
  osc.onended = () => { sources.delete(osc); osc.disconnect(); env.disconnect(); };
  osc.start(t);
  osc.stop(t + dur + 0.01);
}
const RECIPES: Record<SoundName, (c: AudioContext, pitch: number) => void> = {
  tick: (c, pitch) => tone(c, { f0: 620 * pitch, dur: 0.055, gain: 0.25 }),
  hover: (c) => tone(c, { f0: 1046, dur: 0.035, gain: 0.075, type: "sine" }),
  tap: (c) => {
    tone(c, { f0: 880, dur: 0.045, gain: 0.24 });
    tone(c, { f0: 1320, at: 0.045, dur: 0.065, gain: 0.2 });
  },
  toggle: (c) => {
    tone(c, { f0: 784, dur: 0.045, gain: 0.2 });
    tone(c, { f0: 1174, at: 0.055, dur: 0.08, gain: 0.18 });
  },
  success: (c) => [784, 1046, 1568].forEach((f0, i) => tone(c, { f0, at: i * 0.075, dur: 0.12, gain: 0.22 })),
  ting: (c) => {
    tone(c, { f0: 1174, dur: 0.09, gain: 0.26 });
    tone(c, { f0: 1568, at: 0.08, dur: 0.16, gain: 0.22 });
  },
  whoosh: (c) => tone(c, { f0: 784, f1: 1046, dur: 0.1, gain: 0.085 }),
  scan: (c) => tone(c, { f0: 880, f1: 1320, dur: 0.13, gain: 0.09 }),
  decode: (c) => [880, 1046, 1320].forEach((f0, i) => tone(c, { f0, at: i * 0.04, dur: 0.025, gain: 0.075 })),
  type: (c) => [0, 0.045].forEach((at) => tone(c, { f0: 880, at, dur: 0.025, gain: 0.07 })),
  flip: (c) => {
    tone(c, { f0: 1046, dur: 0.03, gain: 0.075 });
    tone(c, { f0: 784, at: 0.04, dur: 0.04, gain: 0.065 });
  },
  rise: (c) => tone(c, { f0: 784, f1: 1174, dur: 0.09, gain: 0.08 }),
  swell: (c) => tone(c, { f0: 880, f1: 1046, dur: 0.12, gain: 0.07, type: "sine" }),
  pop: (c) => tone(c, { f0: 1046, dur: 0.055, gain: 0.08 }),
};
export function playSound(name: SoundName, pitch = 1) {
  if (!ctx || ctx.state !== "running" || !isSoundOn() || !(name in RECIPES)) return false;
  const now = performance.now();
  const gap = name === "hover" ? 150 : 80;
  if (now - (lastPlayed.get(name) ?? -Infinity) < gap) return false;
  if (name === "hover" && now - lastInteraction < 180) return false;
  lastPlayed.set(name, now);
  if (name === "tap" || name === "toggle") lastInteraction = now;
  RECIPES[name](ctx, Math.min(2, Math.max(0.5, pitch)));
  return true;
}
/** Several headings entering together produce one tone, without a backlog. */
export function playRevealSound(name: SoundName) {
  const now = performance.now();
  if (now - lastReveal < 250 || now - lastInteraction < 180) return false;
  if (!playSound(name)) return false;
  lastReveal = now;
  return true;
}
