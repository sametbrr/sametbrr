import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { z } from "zod";
import { allowed, cleanup, config, database, hash } from "@/lib/patates/database.mjs";
import { reminder, stateSchema, settingsSchema, transition, type Action } from "@/lib/patates/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const configured = () => process.env.NODE_ENV !== "production" || !!process.env.PATATES_DB_PATH;
// Push is ready when the worker is alive and has published its public key; no web-side secret is needed.
const publicKey = (): string | null => process.env.PATATES_VAPID_PUBLIC_KEY || config("vapid_public");
const pushReady = () => process.env.PATATES_PUSH_ENABLED !== "false" && Number(database().prepare("SELECT heartbeat FROM scheduler WHERE id=1").get()?.heartbeat ?? 0) > Date.now() - 30000 && !!publicKey();
const actionSchema = z.union([
  z.object({ type: z.enum(["start", "resume", "postpone", "reset", "quiet", "seated"]) }),
  z.object({ type: z.literal("break"), seated: z.boolean().optional(), auto: z.boolean().optional(), at: z.number().nonnegative().optional() }),
  z.object({ type: z.literal("settings"), settings: settingsSchema }),
]);
const tokenOf = (r: Request) => r.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
function room(r: Request) {
  const token = tokenOf(r);
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return database().prepare("SELECT * FROM rooms WHERE id = ? AND expires > ?").get(hash(token), Date.now());
}
function packet(row: Record<string, unknown>) {
  return { state: JSON.parse(String(row.state)), revision: Number(row.revision), now: Date.now(), pushReady: pushReady(), publicKey: pushReady() ? publicKey() : null };
}
// Wakes open streams in this process at once; the timed re-read below covers other processes.
const store = globalThis as typeof globalThis & { patatesBus?: EventEmitter };
const bus = store.patatesBus ?? (store.patatesBus = new EventEmitter().setMaxListeners(0));
function stream(request: Request, id: string) {
  const encoder = new TextEncoder();
  let last = 0, ticks = 0, timer: ReturnType<typeof setInterval> | undefined, stop = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = () => {
        try {
          const row = database().prepare("SELECT * FROM rooms WHERE id = ? AND expires > ?").get(id, Date.now());
          if (!row) return stop();
          if (Number(row.revision) === last) return;
          last = Number(row.revision);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(packet(row))}\n\n`));
        } catch { stop(); }
      };
      stop = () => {
        if (!timer) return;
        clearInterval(timer); timer = undefined; bus.off(id, push);
        try { controller.close(); } catch {}
      };
      timer = setInterval(() => {
        // Streams end after five minutes; the client reconnects.
        if (++ticks >= 100) return stop();
        if (ticks % 5 === 0) { try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { return stop(); } }
        push();
      }, 3000);
      bus.on(id, push); request.signal.addEventListener("abort", () => stop());
      push();
    },
    cancel() { stop(); },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}
export async function GET(request: Request) {
  if (!configured()) return json({ enabled: false, pushReady: false });
  if (!tokenOf(request)) return json({ enabled: true, pushReady: pushReady() });
  if (!allowed(tokenOf(request))) return json({ error: "rate" }, 429);
  const row = room(request);
  if (!row) return json({ error: "room" }, 404);
  return new URL(request.url).searchParams.has("stream") ? stream(request, String(row.id)) : json(packet(row));
}
const deviceSchema = z.string().regex(/^[a-f0-9-]{20,40}$/);
const subSchema = z.object({ endpoint: z.string().url().max(2048), keys: z.object({ p256dh: z.string().min(80).max(150), auth: z.string().min(16).max(40) }) });
export async function POST(request: Request) {
  if (!configured()) return json({ error: "unconfigured" }, 503);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ error: "origin" }, 403);
  if (Number(request.headers.get("content-length")) > 16000) return json({ error: "size" }, 413);
  let raw: Record<string, unknown>;
  try { const text = await request.text(); if (text.length > 16000) return json({ error: "size" }, 413); raw = JSON.parse(text); } catch { return json({ error: "json" }, 400); }
  if (!raw || typeof raw !== "object") return json({ error: "body" }, 400);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(`write:${ip}`, 120)) return json({ error: "rate" }, 429);
  const db = database();
  if (raw.op === "create") {
    if (!allowed(`create:${ip}`, 8)) return json({ error: "rate" }, 429);
    const parsed = stateSchema.safeParse(raw.state);
    if (!parsed.success) return json({ error: "state" }, 400);
    cleanup();
    const token = randomBytes(24).toString("hex"), state = parsed.data;
    // Local history is imported, but timer deadlines are rebased to server time.
    const clientNow = typeof raw.now === "number" ? raw.now : Date.now();
    const shift = Date.now() - clientNow;
    if (state.phase === "focus" || state.phase === "break") {
      state.start = Math.max(0, state.start + shift); state.end = Math.max(0, state.end + shift);
      if (state.end > Date.now() + 96 * 60_000) return json({ error: "deadline" }, 400);
    }
    state.quietUntil = Math.min(Math.max(0, state.quietUntil + (state.quietUntil ? shift : 0)), Date.now() + 3600000);
    const note = reminder(state);
    db.prepare("INSERT INTO rooms(id,state,expires,due,body) VALUES(?,?,?,?,?)").run(hash(token), JSON.stringify(state), Date.now() + 30 * 86400000, note?.due ?? null, note?.body ?? null);
    return json({ ...packet({ state: JSON.stringify(state), revision: 1 }), token });
  }
  const row = room(request);
  if (!row) return json({ error: "room" }, 404);
  if (raw.op === "action") {
    const parsed = actionSchema.safeParse(raw.action);
    if (!parsed.success || !Number.isSafeInteger(raw.revision)) return json({ error: "action" }, 400);
    if (Number(row.revision) !== raw.revision) return json(packet(row), 409);
    const state = transition(stateSchema.parse(JSON.parse(String(row.state))), parsed.data as Action, Date.now());
    const note = reminder(state);
    const result = db.prepare("UPDATE rooms SET state=?,revision=revision+1,due=?,body=?,expires=? WHERE id=? AND revision=?").run(JSON.stringify(state), note?.due ?? null, note?.body ?? null, Date.now() + 30 * 86400000, row.id, Number(raw.revision));
    if (!result.changes) return json({ error: "conflict" }, 409);
    bus.emit(String(row.id));
    return json(packet({ state: JSON.stringify(state), revision: Number(raw.revision) + 1 }));
  }
  const device = deviceSchema.safeParse(raw.device);
  if (!device.success) return json({ error: "device" }, 400);
  if (raw.op === "unsubscribe") {
    db.prepare("DELETE FROM subscriptions WHERE room=? AND device=?").run(row.id, device.data);
    return json({ ok: true });
  }
  if (raw.op === "subscribe") {
    if (!pushReady()) return json({ error: "push-unconfigured" }, 503);
    const parsed = subSchema.safeParse(raw.subscription);
    if (!parsed.success) return json({ error: "subscription" }, 400);
    const endpoint = new URL(parsed.data.endpoint), host = endpoint.hostname;
    if (endpoint.protocol !== "https:" || endpoint.port || endpoint.username || endpoint.password || !(host === "fcm.googleapis.com" || host === "android.googleapis.com" || host === "updates.push.services.mozilla.com" || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com"))) return json({ error: "endpoint" }, 400);
    const count = db.prepare("SELECT count(*) AS n FROM subscriptions WHERE room=?").get(row.id);
    const existing = db.prepare("SELECT device FROM subscriptions WHERE room=? AND device=?").get(row.id, device.data);
    if (Number(count?.n) >= 5 && !existing) return json({ error: "devices" }, 400);
    db.prepare("INSERT INTO subscriptions(room,device,value) VALUES(?,?,?) ON CONFLICT(room,device) DO UPDATE SET value=excluded.value").run(row.id, device.data, JSON.stringify(parsed.data));
    return json({ ok: true });
  }
  return json({ error: "operation" }, 400);
}
