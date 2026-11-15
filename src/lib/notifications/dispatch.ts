import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationTipo =
  | "novo_agendamento"
  | "reagendamento"
  | "adiamento"
  | "cancelamento"
  | "lembrete"
  | "trial_expirando"
  | "sistema";

interface NotifyParams {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tipo?: NotificationTipo;
  lojaId?: string | null;
  agendamentoId?: string | null;
  acaoTipo?: string | null;
  acaoPayload?: Record<string, unknown>;
  tag?: string;
}

/**
 * Salva na central de notificações in-app e envia Web Push PWA (custo zero).
 */
export async function notifyUserPrioritizingPush({
  userId,
  title,
  body,
  url = "/painel",
  tipo = "sistema",
  lojaId = null,
  agendamentoId = null,
  acaoTipo = null,
  acaoPayload = {},
  tag,
}: NotifyParams): Promise<{ channel: "push" | "in_app" | "none" }> {
  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("perfis")
    .select("notificacoes_push, notificacoes_novo_agendamento")
    .eq("id", userId)
    .maybeSingle();

  if (!perfil) return { channel: "none" };

  if (tipo === "novo_agendamento" && perfil.notificacoes_novo_agendamento === false) {
    return { channel: "none" };
  }

  // Persiste na central de notificações (visível no sheet lateral)
  await admin.from("notificacoes").insert({
    user_id: userId,
    loja_id: lojaId,
    agendamento_id: agendamentoId,
    tipo,
    titulo: title,
    mensagem: body,
    url,
    acao_tipo: acaoTipo,
    acao_status: "pendente",
    acao_payload: acaoPayload,
  });

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (perfil.notificacoes_push && vapidPublic && vapidPrivate) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subs && subs.length > 0) {
      webpush.setVapidDetails("mailto:contato@zelo.app", vapidPublic, vapidPrivate);
      let delivered = 0;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title,
              body,
              url,
              icon: "/icon.svg",
              badge: "/icon.svg",
              tag: tag ?? `${tipo}-${agendamentoId ?? lojaId ?? "zelo"}`,
            })
          );
          delivered++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      if (delivered > 0) {
        return { channel: "push" };
      }
    }
  }

  return { channel: "in_app" };
}

export function formatBrDataHora(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return { data, hora };
}
