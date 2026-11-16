import * as webpush from "web-push";
import { cleanup, config, database } from "./database.mjs";
import { deliverDue } from "./scheduler.mjs";

const store = globalThis as typeof globalThis & { patatesNotifier?: boolean };

/** Sends due reminders from inside the web server, once per process. */
export function startNotifier() {
  if (store.patatesNotifier) return;
  store.patatesNotifier = true;
  const db = database();
  // Keys come from the environment when given; otherwise they are created once and kept in the
  // persistent database, so no secret has to be configured by hand.
  let publicKey = process.env.PATATES_VAPID_PUBLIC_KEY || config("vapid_public"), privateKey = process.env.PATATES_VAPID_PRIVATE_KEY || config("vapid_private");
  if (!publicKey || !privateKey) {
    ({ publicKey, privateKey } = webpush.generateVAPIDKeys());
    config("vapid_private", privateKey);
    console.log("Pato: created notification keys");
  }
  config("vapid_public", publicKey);
  webpush.setVapidDetails(process.env.PATATES_VAPID_SUBJECT || "mailto:sametbrr@gmail.com", publicKey, privateKey);
  const tick = async () => {
    try {
      cleanup();
      await deliverDue(db, (subscription: webpush.PushSubscription, payload: unknown, revision: number) => webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 120, timeout: 8000, urgency: "high", topic: `patates-${revision}` }));
    } catch (error) { console.error("Patates scheduler failed", error instanceof Error ? error.message : error); }
    // Unreferenced so the timer never keeps the server from shutting down.
    setTimeout(tick, 1000).unref();
  };
  void tick();
  console.log("Pato notifier ready");
}
