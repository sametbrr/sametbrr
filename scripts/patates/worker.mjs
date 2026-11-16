import * as webpush from "web-push";
import { database, cleanup, config } from "../../src/lib/patates/database.mjs";
import { deliverDue } from "../../src/lib/patates/scheduler.mjs";

if (!process.env.PATATES_DB_PATH) throw new Error("Pato: PATATES_DB_PATH is required");
const db = database();
// Keys come from the environment when given; otherwise they are created once and kept in the
// persistent database, so no secret has to be configured by hand. The web app reads the public key from there.
let publicKey = process.env.PATATES_VAPID_PUBLIC_KEY || config("vapid_public"), privateKey = process.env.PATATES_VAPID_PRIVATE_KEY || config("vapid_private");
if (!publicKey || !privateKey) {
  ({ publicKey, privateKey } = webpush.generateVAPIDKeys());
  config("vapid_private", privateKey);
  console.log("Pato: created notification keys");
}
config("vapid_public", publicKey);
webpush.setVapidDetails(process.env.PATATES_VAPID_SUBJECT || "mailto:sametbrr@gmail.com", publicKey, privateKey);
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
console.log("Pato notification worker ready");
while (!stopping) {
  try {
    cleanup();
    await deliverDue(db, (subscription, payload, revision) => webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 120, timeout: 8000, urgency: "high", topic: `patates-${revision}` }));
  } catch (error) { console.error("Patates scheduler failed", error.message); }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
db.close();
