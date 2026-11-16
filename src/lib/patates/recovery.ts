/** Disconnect locally even when the server is gone; keep failed remote cancellation for retry. */
export async function settleDisconnect(remote: () => Promise<unknown>, local: () => Promise<unknown>) {
  let remotePending = false, localPending = false;
  try { await remote(); } catch (error) { remotePending = !(error instanceof Error && error.message === "404"); }
  try { await local(); } catch { localPending = true; }
  return { remotePending, localPending };
}
