import { writeFileSync } from "node:fs";
import * as webpush from "web-push";

const destination = process.argv[2];
if (!destination) throw new Error("Usage: node scripts/patates/keys.mjs /secure/path/patates.env");
const keys = webpush.generateVAPIDKeys();
writeFileSync(destination, `PATATES_VAPID_PUBLIC_KEY=${keys.publicKey}\nPATATES_VAPID_PRIVATE_KEY=${keys.privateKey}\nPATATES_VAPID_SUBJECT=mailto:sametbrr@gmail.com\n`, { flag: "wx", mode: 0o600 });
console.log("VAPID settings written to the requested private file. Keep this file out of git.");
