"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BellRing, Check, Loader2, Send } from "lucide-react";
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
  const [permState, setPermState] = useState<"default" | "granted" | "denied" | "unsupported">("default");

  useEffect(() => {
    let mounted = true;
    async function checkExisting() {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (mounted) setPermState("unsupported");
        return;
      }

      const perm = Notification.permission;
      if (mounted) setPermState(perm);
      if (perm !== "granted") return;

      try {
        const reg =
          (await navigator.serviceWorker.getRegistration("/sw.js")) ??
          (await navigator.serviceWorker.register("/sw.js"));
        const sub = await reg.pushManager.getSubscription();
        if (sub && mounted) {
          setEnabled(true);
          const json = sub.toJSON();
          if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
            void savePushSubscriptionAction({
              endpoint: json.endpoint,
              keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            });
          }
        }
      } catch {
        // ignore check errors
      }
    }
    void checkExisting();
    return () => {
      mounted = false;
    };
  }, []);

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
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      setPermState(permission);
      if (permission !== "granted") {
        showToast("Permissão de notificação negada no navegador.", "error");
        return;
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
      await reg
        .showNotification("Zelo — Notificações ativadas!", {
          body: "Tudo certo! Agora você receberá avisos de agendamentos e alterações em tempo real.",
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: "zelo-ativado",
          data: { url: "/explorar" },
        })
        .catch(() => {});
    } catch {
      showToast("Não foi possível ativar notificações neste navegador.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestPush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg && Notification.permission === "granted") {
        await reg.showNotification("Zelo — Teste de Alerta", {
          body: "As notificações estão funcionando perfeitamente neste aparelho!",
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: "zelo-teste",
          data: { url: "/painel" },
        });
        showToast("Notificação de teste enviada!", "success");
      }
    } catch {
      showToast("Não foi possível disparar a notificação de teste.", "error");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--zelo-soft)] p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BellRing className={`h-4 w-4 shrink-0 ${enabled ? "text-[#10B981]" : "text-[#F59E0B]"}`} />
          <p className="text-[11px] leading-snug text-[var(--zelo-muted)]">
            {enabled
              ? "Alertas ativos neste aparelho para novos agendamentos e cancelamentos."
              : "Receba alertas instantâneos de novos agendamentos (iPhone: adicione à Tela de Início)."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {enabled && (
            <button
              type="button"
              onClick={handleTestPush}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--zelo-card)] px-2.5 text-[11px] font-semibold text-[var(--zelo-ink)] shadow-xs"
            >
              <Send className="h-3 w-3" />
              <span>Testar</span>
            </button>
          )}
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
      </div>

      {!enabled && (
        <div className="flex items-start gap-2 rounded-xl bg-[#F59E0B]/10 px-3 py-2 text-[11px] leading-snug text-[#B45309] dark:text-[#FBBF24]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {permState === "denied"
              ? "Notificações bloqueadas nas permissões do navegador. Sem elas você não recebe avisos de novos clientes, cancelamentos ou lembretes."
              : "Notificações ainda não ativadas neste aparelho: sem ativar, você precisa abrir o painel para ver novos agendamentos e cancelamentos."}
          </span>
        </div>
      )}
    </div>
  );
}
