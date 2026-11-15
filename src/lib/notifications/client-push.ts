"use client";

import { savePushSubscriptionAction } from "@/app/painel/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function enableBrowserPush(): Promise<{ ok: boolean; error?: string }> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return {
      ok: false,
      error: "No iPhone, toque em Compartilhar → Adicionar à Tela de Início para ativar.",
    };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { ok: false, error: "Chave VAPID não configurada no ambiente." };
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Permissão de notificação negada no navegador." };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: "Inscrição Push incompleta no navegador." };
    }

    const res = await savePushSubscriptionAction({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });

    if (res?.error) {
      return { ok: false, error: res.error };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível ativar notificações neste dispositivo." };
  }
}

export async function disableBrowserPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
    }
  } catch {
    // ignore browser unsubscribe errors
  }
}
