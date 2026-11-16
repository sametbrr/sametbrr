/** Runs once when the server starts. Pato's reminders are sent from this process; there is no separate worker. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.PATATES_PUSH_ENABLED === "false") return;
  // Same rule as the API: production needs the persistent database path.
  if (process.env.NODE_ENV === "production" && !process.env.PATATES_DB_PATH) return;
  try { (await import("@/lib/patates/notifier")).startNotifier(); }
  catch (error) { console.error("Pato notifier failed to start", error instanceof Error ? error.message : error); }
}
