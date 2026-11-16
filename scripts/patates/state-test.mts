import assert from "node:assert/strict";
import { fresh, journey, planned, transition, reminder, stateSchema } from "../../src/lib/patates/state.ts";

const start = Date.UTC(2026, 10, 16, 8), min = 60000;
let s = fresh(start);
assert.equal(planned(s.settings), 4 * 25 + 3 * 5 + 15, "estimated total includes the long break");
s = transition(s, { type: "start" }, start);
assert.equal(s.end, start + 25 * min);
assert.equal(transition(s, { type: "postpone" }, start + 1000).end, s.end, "can't snooze before due");

// Early break: under 60% of the block is not a session, but focus minutes are kept.
let early = transition(s, { type: "break" }, start + 10 * min);
assert.equal(early.round, 0); assert.equal(early.stats.sessions, 0); assert.equal(early.total, 0); assert.equal(early.stats.focus, 10);
assert.equal(early.end - early.start, 5 * min);
// Early return: partial walk, partial journey, straight back to focus.
early = transition(early, { type: "resume" }, early.start + 2 * min);
assert.equal(early.phase, "focus"); assert.equal(early.stats.walk, 2); assert.ok(Math.abs(early.progress - 0.4) < 1e-9);
assert.equal(transition(s, { type: "break" }, start + 15 * min).round, 1, "60% counts");

s = transition(s, { type: "postpone" }, s.end + 10000);
const postponed = s.end;
assert.equal(transition(s, { type: "postpone" }, s.end).end, postponed, "only one snooze");
assert.equal(reminder(s)?.due, postponed - 30000);
s = transition(s, { type: "break" }, postponed);
assert.equal(s.stats.sessions, 1); assert.equal(s.streak, 1); assert.equal(s.phase, "break");
assert.ok(Math.abs(journey(s, s.start + 2.5 * min) - 0.5) < 1e-9, "journey moves during the break");
// A finished break waits for the user; overtime doesn't add walking.
s = transition(s, { type: "resume" }, s.end + 30 * min);
assert.equal(s.phase, "focus"); assert.equal(s.stats.walk, 5); assert.equal(s.progress, 1);
const walked = s.stats.walk;
s = transition(s, { type: "resume" }, s.start + 1);
assert.equal(s.stats.walk, walked, "duplicate completion can't credit twice");

// Automatic break is backdated to when the user left, and never before the block began.
const away = transition(s, { type: "break", auto: true, at: s.start + 20 * min }, s.start + 23 * min);
assert.equal(away.autoBreak, true); assert.equal(away.start, s.start + 20 * min); assert.equal(away.round, 2);
assert.equal(transition(s, { type: "break", auto: true, at: 0 }, s.start + min).start, s.start);
assert.equal(transition(away, { type: "resume" }, away.start + 4 * min).autoBreak, false);

for (let round = 1; round < 4; round++) {
  s = transition(s, { type: "break", seated: round === 2 }, s.end);
  if (round === 3) assert.equal(s.end - s.start, 15 * min, "fourth break is long");
  if (round === 2) { s = transition(s, { type: "seated" }, s.start); assert.equal(s.seated, false); s = transition(s, { type: "seated" }, s.start); }
  s = transition(s, { type: "resume" }, s.end);
}
assert.equal(s.phase, "done"); assert.equal(s.stats.sessions, 4); assert.equal(s.stats.walk, 25); assert.equal(s.progress, 4);
assert.equal(s.streak, 1); assert.equal(reminder(s), null);
const reset = transition(s, { type: "reset" }, s.end);
assert.equal(reset.stats.sessions, 4); assert.equal(reset.round, 0); assert.equal(reset.progress, 0); assert.equal(reset.total, 4);
const next = transition(reset, { type: "start" }, start + 86400000);
assert.equal(next.stats.sessions, 0, "daily history rolls over");
assert.equal(transition(next, { type: "break" }, next.end).streak, 2, "streak grows with the first session of the next day");
assert.equal(stateSchema.safeParse({ ...next, settings: { ...next.settings, focus: -5 } }).success, false);
const { progress: _p, autoBreak: _a, ...legacy } = next; void _p; void _a;
assert.equal(stateSchema.parse(legacy).progress, 0, "older saved state still loads");
console.log("Patates state checks passed: timing, snooze, early break, early return, auto break, long break, seated break, duplicate completion, rollover, reset, validation");
