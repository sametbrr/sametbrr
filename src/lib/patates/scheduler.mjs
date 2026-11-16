/** Process durable reminders. send is injectable so cancellation/restart tests need no push service. */
export async function deliverDue(db, send, now = Date.now()) {
  db.prepare("INSERT INTO scheduler(id,heartbeat) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat").run(now);
  const rooms = db.prepare("SELECT * FROM rooms WHERE due <= ? AND notified < revision AND EXISTS (SELECT 1 FROM subscriptions WHERE room=rooms.id) ORDER BY due LIMIT 100").all(now);
  for (const room of rooms) {
    const state = JSON.parse(room.state);
    const cutoff = state.phase === "focus" ? state.end + 125 * 60000 : state.phase === "break" ? state.end + 5 * 60000 : Infinity;
    if (now > cutoff) {
      db.prepare("UPDATE rooms SET notified=? WHERE id=? AND revision=?").run(room.revision, room.id, room.revision);
      continue;
    }
    if (room.due < now - 5 * 60000) {
      const next = state.phase === "focus" ? [0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((m) => state.end + m * 60000).find((due) => due > now) : null;
      if (next) db.prepare("UPDATE rooms SET due=? WHERE id=? AND revision=? AND due=?").run(next, room.id, room.revision, room.due);
      else db.prepare("UPDATE rooms SET notified=? WHERE id=? AND revision=?").run(room.revision, room.id, room.revision);
      continue;
    }
    const subs = db.prepare("SELECT * FROM subscriptions WHERE room=?").all(room.id);
    if (!subs.length) continue;
    // A persisted lease prevents concurrent workers; a crash can retry after 30 seconds.
    const claimed = db.prepare("UPDATE rooms SET due=? WHERE id=? AND revision=? AND due=?").run(now + 30000, room.id, room.revision, room.due);
    if (!claimed.changes) continue;
    let retry = false;
    for (const sub of subs) {
      const current = db.prepare("SELECT revision FROM rooms WHERE id=?").get(room.id);
      if (current?.revision !== room.revision) break;
      try {
        const body = state.phase === "focus" && now < state.end ? "Mola yaklaşıyor. Son yarım dakika." : room.body;
        await send(JSON.parse(sub.value), { title: "Pato", body, tag: `patates-${room.revision}`, url: "/pato" }, room.revision);
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) db.prepare("DELETE FROM subscriptions WHERE room=? AND device=?").run(room.id, sub.device);
        else { retry = true; console.error("Patates push delivery failed", error.statusCode || "network"); }
      }
    }
    if (!retry) {
      const next = state.phase === "focus" ? [0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((m) => state.end + m * 60000).find((due) => due > now + 500) : null;
      if (next) db.prepare("UPDATE rooms SET due=?,notified=0 WHERE id=? AND revision=?").run(next, room.id, room.revision);
      else db.prepare("UPDATE rooms SET notified=? WHERE id=? AND revision=?").run(room.revision, room.id, room.revision);
    }
  }
}
