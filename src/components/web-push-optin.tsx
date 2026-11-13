"use client";

import { useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { savePushSubscriptionAction } from "@/app/painel/actions";
import { showToast } from "@/components/zelo-toast";

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

export function WebPushOptIn() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  async function handleEnablePush() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      showToast("No iPhone, toque em Compartilhar → Adicionar à Tela de Início para ativar.", "error");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      showToast("Chave VAPID ainda não configurada no ambiente.", "error");
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("Permissão de notificação negada no navegador.", "error");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Assinatura incompleta.");
      }

      const res = await savePushSubscriptionAction({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      if (res.error) {
        showToast(res.error, "error");
        return;
      }

      setEnabled(true);
      showToast("Alertas Web Push ativados neste aparelho.", "success");
    } catch {
      showToast("Não foi possível ativar notificações neste navegador.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--zelo-soft)] p-3">
      <div className="flex items-center gap-2.5">
        <BellRing className="h-4 w-4 shrink-0 text-[#F59E0B]" />
        <p className="text-[11px] leading-snug text-[var(--zelo-muted)]">
          Receba alertas instantâneos de novos agendamentos (iPhone: adicione à Tela de Início).
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnablePush}
        disabled={loading || enabled}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : enabled ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>Ativo</span>
          </>
        ) : (
          <span>Ativar Push</span>
        )}
      </button>
    </div>
  );
}
