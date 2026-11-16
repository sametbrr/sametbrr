import { z } from "zod";

export const settingsSchema = z.object({
  goal: z.number().int().min(1).max(12),
  focus: z.number().int().min(5).max(90),
  rest: z.number().int().min(1).max(20),
  longRest: z.number().int().min(5).max(30),
  auto: z.boolean(),
  demo: z.boolean(),
});
export const defaults = { goal: 4, focus: 25, rest: 5, longRest: 15, auto: false, demo: false };
const statsSchema = z.object({ date: z.string().max(10), sessions: z.number().min(0), focus: z.number().min(0), walk: z.number().min(0) });
/** A focus block counts as a session once at least this share of it was worked. */
export const COUNTED = 0.6;
export const stateSchema = z.object({
  v: z.literal(1), phase: z.enum(["idle", "focus", "break", "done"]),
  settings: settingsSchema, start: z.number().nonnegative(), end: z.number().nonnegative(),
  // round = counted sessions; progress = journey distance earned by breaks (1 per full break).
  round: z.number().int().min(0).max(999), progress: z.number().min(0).max(12).default(0),
  postponed: z.boolean(), seated: z.boolean(), autoBreak: z.boolean().default(false),
  quietUntil: z.number().nonnegative(), stats: statsSchema,
  sessionFocus: z.number().nonnegative(), sessionWalk: z.number().nonnegative(),
  total: z.number().int().nonnegative(), streak: z.number().int().nonnegative(), lastDay: z.string().max(10),
});
export type FocusState = z.infer<typeof stateSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export const day = (now: number) => new Date(now).toLocaleDateString("sv-SE");
export const minute = (state: FocusState) => state.settings.demo ? 1000 : 60_000;
export function fresh(now = Date.now()): FocusState {
  return { v: 1, phase: "idle", settings: { ...defaults }, start: 0, end: 0, round: 0, progress: 0, postponed: false, seated: false, autoBreak: false, quietUntil: 0, stats: { date: day(now), sessions: 0, focus: 0, walk: 0 }, sessionFocus: 0, sessionWalk: 0, total: 0, streak: 0, lastDay: "" };
}
/** Planned length of a whole session in minutes, including the long breaks. */
export function planned(settings: Settings) {
  let total = settings.goal * settings.focus;
  for (let i = 1; i <= settings.goal; i++) total += i % 4 === 0 ? settings.longRest : settings.rest;
  return total;
}
/** Minutes of the current break already taken, capped at its planned length. */
export function walkedSoFar(s: FocusState, now: number) {
  return s.phase === "break" ? Math.min((s.end - s.start) / minute(s), Math.max(0, (now - s.start) / minute(s))) : 0;
}
/** Journey position including the break in progress. */
export function journey(s: FocusState, now: number) {
  return Math.min(s.settings.goal, s.progress + Math.min(1, walkedSoFar(s, now) / s.settings.rest));
}
export type Action =
  | { type: "start" | "resume" | "postpone" | "reset" | "quiet" | "seated" }
  | { type: "break"; seated?: boolean; auto?: boolean; at?: number }
  | { type: "settings"; settings: Settings };
export function transition(input: FocusState, action: Action, now: number): FocusState {
  const s = structuredClone(input);
  if (s.stats.date !== day(now)) s.stats = { date: day(now), sessions: 0, focus: 0, walk: 0 };
  const unit = minute(s);
  if (action.type === "settings" && ((s.phase === "idle" && s.round === 0 && s.progress === 0) || s.phase === "done")) s.settings = settingsSchema.parse(action.settings);
  if (action.type === "quiet") s.quietUntil = s.quietUntil > now ? 0 : now + 60 * 60_000;
  if (action.type === "reset") return { ...fresh(now), settings: s.settings, stats: s.stats, total: s.total, streak: s.streak, lastDay: s.lastDay };
  if (action.type === "start" && s.phase === "idle") {
    s.phase = "focus"; s.start = now; s.end = now + s.settings.focus * unit; s.postponed = false;
  }
  if (action.type === "postpone" && s.phase === "focus" && now >= s.end && !s.postponed) { s.end = now + 5 * unit; s.postponed = true; }
  if (action.type === "break" && s.phase === "focus") {
    // "at" backdates an automatic break to the moment the user actually left.
    const at = Math.min(now, Math.max(s.start, action.at ?? now));
    const focused = (at - s.start) / unit;
    s.stats.focus += focused; s.sessionFocus += focused;
    const counted = focused >= s.settings.focus * COUNTED;
    if (counted) {
      s.round++; s.stats.sessions++; s.total++;
      const today = day(now), yesterday = day(now - 86_400_000);
      if (s.lastDay !== today) s.streak = s.lastDay === yesterday ? s.streak + 1 : 1;
      s.lastDay = today;
    }
    const long = counted && s.round % 4 === 0;
    s.phase = "break"; s.start = at; s.end = at + (long ? s.settings.longRest : s.settings.rest) * unit;
    s.seated = !!action.seated; s.autoBreak = !!action.auto;
  }
  if (action.type === "seated" && s.phase === "break") s.seated = !s.seated;
  // Returning is allowed at any time; the journey advances by the share of the break taken.
  if (action.type === "resume" && s.phase === "break") {
    const walked = walkedSoFar(s, now);
    if (!s.seated) { s.stats.walk += walked; s.sessionWalk += walked; }
    s.progress = journey(s, now); s.autoBreak = false;
    if (s.progress >= s.settings.goal - 1e-6) { s.progress = s.settings.goal; s.phase = "done"; }
    else { s.phase = "focus"; s.start = now; s.end = now + s.settings.focus * unit; s.postponed = false; }
  }
  return s;
}
export function reminder(s: FocusState) {
  return (s.phase === "focus" || s.phase === "break") && !s.settings.demo
    ? { due: Math.max(s.end - (s.phase === "focus" ? 30000 : 0), s.quietUntil), body: s.phase === "focus" ? "Mola hazır. Birlikte birkaç adım atalım." : "Mola tamamlandı. Hazır olduğunda devam edelim." }
    : null;
}
export const reminderOffsets = [-0.5, 0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
