self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {
    title: "Zelo",
    body: "Você tem uma atualização na agenda.",
    url: "/painel",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "zelo-alerta",
  };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/icon.svg",
      badge: payload.badge || "/icon.svg",
      tag: payload.tag || "zelo-alerta",
      renotify: true,
      data: { url: payload.url || "/painel" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/painel";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
