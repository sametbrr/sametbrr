import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

let connection;
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function database() {
  if (connection) return connection;
  const path = process.env.PATATES_DB_PATH || resolve(".data/patates.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  connection = new DatabaseSync(path, { timeout: 5000 });
  connection.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, expires INTEGER NOT NULL, due INTEGER, body TEXT, notified INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS subscriptions (room TEXT NOT NULL, device TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(room, device));
    CREATE TABLE IF NOT EXISTS limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS scheduler (id INTEGER PRIMARY KEY, heartbeat INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS rooms_due ON rooms(due);`);
  return connection;
}
/** Small settings shared between the web app and the notification worker. */
export function config(id, value) {
  const db = database();
  if (value !== undefined) db.prepare("INSERT INTO config(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(id, value);
  return db.prepare("SELECT value FROM config WHERE id=?").get(id)?.value ?? null;
}
export function allowed(key, maximum = 150) {
  const db = database(), now = Date.now();
  db.prepare("DELETE FROM limits WHERE expires < ?").run(now);
  const row = db.prepare("INSERT INTO limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count").get(hash(key + Math.floor(now / 60000)), now + 120000);
  return Number(row.count) <= maximum;
}
export function cleanup() {
  const db = database();
  db.prepare("DELETE FROM subscriptions WHERE room IN (SELECT id FROM rooms WHERE expires < ?)").run(Date.now());
  db.prepare("DELETE FROM rooms WHERE expires < ?").run(Date.now());
}
