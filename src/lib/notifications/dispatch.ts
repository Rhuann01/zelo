import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

interface NotifyParams {
  userId: string;
  title: string;
  body: string;
  url?: string;
  emailSubject?: string;
  emailHtml?: string;
}

/**
 * Prioriza Web Push (custo zero) antes de usar a cota diária do Resend (100/dia).
 */
export async function notifyUserPrioritizingPush({
  userId,
  title,
  body,
  url = "/painel",
  emailSubject,
  emailHtml,
}: NotifyParams): Promise<{ channel: "push" | "email" | "none" }> {
  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("perfis")
    .select("email, notificacoes_push, notificacoes_email")
    .eq("id", userId)
    .maybeSingle();

  if (!perfil) return { channel: "none" };

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
            JSON.stringify({ title, body, url })
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

  const resendKey = process.env.RESEND_API_KEY;
  if (perfil.notificacoes_email && perfil.email && resendKey && emailHtml) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Zelo <agenda@zelo.app>",
        to: [perfil.email],
        subject: emailSubject || title,
        html: emailHtml,
      }),
    }).catch(() => null);

    if (res?.ok) {
      return { channel: "email" };
    }
  }

  return { channel: "none" };
}
