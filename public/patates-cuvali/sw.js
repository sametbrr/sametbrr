self.addEventListener("push", (event) => {
  let message = {};
  try { message = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification("Pato", {
    body: message.body || "Molan hazır.", icon: "/patates-cuvali/icon-192.png",
    badge: "/patates-cuvali/icon-192.png", tag: message.tag || "patates",
    data: { url: "/pato" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => /\/(?:pato|patates-cuvali)\/?$/.test(new URL(client.url).pathname));
    if (existing) return existing.focus();
    return self.clients.openWindow("/pato");
  })());
});
