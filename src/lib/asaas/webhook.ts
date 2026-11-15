import crypto from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const asaasWebhookSchema = z.object({
  id: z.string().min(1).optional(),
  event: z.string().min(1),
  dateCreated: z.string().optional(),
  payment: z
    .object({
      id: z.string().min(1),
      customer: z.string().optional(),
      subscription: z.string().nullable().optional(),
      externalReference: z.string().nullable().optional(),
      value: z.number().optional(),
      billingType: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
  subscription: z
    .object({
      id: z.string().min(1),
      customer: z.string().optional(),
      externalReference: z.string().nullable().optional(),
      status: z.string().optional(),
    })
    .optional(),
});

export type AsaasWebhookPayload = z.infer<typeof asaasWebhookSchema>;

/**
 * Comparação em tempo constante do header `asaas-access-token`.
 */
export function verifyAsaasWebhookToken(
  receivedToken: string | null | undefined,
  expectedToken: string | undefined
): boolean {
  if (!receivedToken || !expectedToken) return false;
  const a = Buffer.from(receivedToken.trim(), "utf8");
  const b = Buffer.from(expectedToken.trim(), "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface BillingTransition {
  assinatura_status: "ativa" | "atrasada" | "cancelada";
  pausada: boolean;
  grantReferralBonus: boolean;
}

export function mapAsaasEventToBillingUpdate(event: string): BillingTransition | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
    case "SUBSCRIPTION_ACTIVATED":
      return {
        assinatura_status: "ativa",
        pausada: false,
        grantReferralBonus: true,
      };
    case "PAYMENT_OVERDUE":
      return {
        assinatura_status: "atrasada",
        pausada: true,
        grantReferralBonus: false,
      };
    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED":
    case "PAYMENT_REFUNDED":
      return {
        assinatura_status: "cancelada",
        pausada: true,
        grantReferralBonus: false,
      };
    default:
      return null;
  }
}

export interface ProcessAsaasWebhookResult {
  ok: true;
  duplicate: boolean;
  ignored: boolean;
  lojaId?: string;
  slug?: string;
  assinaturaStatus?: string;
}

/**
 * Processa o evento do Asaas com idempotência em `webhook_events`
 * e atualização atômica da assinatura da loja.
 */
export async function processAsaasWebhookEvent(
  admin: SupabaseClient,
  payload: AsaasWebhookPayload
): Promise<ProcessAsaasWebhookResult> {
  const targetId =
    payload.payment?.id ??
    payload.subscription?.id ??
    payload.dateCreated ??
    "no-ref";
  const eventId = payload.id
    ? `asaas:${payload.id}`
    : `asaas:${payload.event}:${targetId}`;

  const { error: insertErr } = await admin.from("webhook_events").insert({
    id: eventId,
    provider: "asaas",
    event_type: payload.event,
    payload,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { ok: true, duplicate: true, ignored: false };
    }
    throw new Error(`Falha ao registrar webhook_events: ${insertErr.message}`);
  }

  const transition = mapAsaasEventToBillingUpdate(payload.event);
  if (!transition) {
    return { ok: true, duplicate: false, ignored: true };
  }

  const externalRef =
    payload.payment?.externalReference ??
    payload.subscription?.externalReference ??
    null;
  const subscriptionId =
    payload.payment?.subscription ?? payload.subscription?.id ?? null;
  const customerId =
    payload.payment?.customer ?? payload.subscription?.customer ?? null;

  let lojaQuery = admin.from("lojas").select("id, slug").limit(1);
  if (externalRef) {
    lojaQuery = lojaQuery.eq("id", externalRef);
  } else if (subscriptionId) {
    lojaQuery = lojaQuery.eq("asaas_subscription_id", subscriptionId);
  } else if (customerId) {
    lojaQuery = lojaQuery.eq("asaas_customer_id", customerId);
  } else {
    return { ok: true, duplicate: false, ignored: true };
  }

  const { data: loja } = await lojaQuery.maybeSingle();
  if (!loja) {
    return { ok: true, duplicate: false, ignored: true };
  }

  const updateFields: Record<string, unknown> = {
    assinatura_status: transition.assinatura_status,
    pausada: transition.pausada,
    assinatura_atualizada_em: new Date().toISOString(),
    ...(transition.assinatura_status === "ativa" ? { is_cortesia: false } : {}),
  };

  if (subscriptionId) updateFields.asaas_subscription_id = subscriptionId;
  if (customerId) updateFields.asaas_customer_id = customerId;

  const { error: updateErr } = await admin
    .from("lojas")
    .update(updateFields)
    .eq("id", loja.id);

  if (updateErr) {
    throw new Error(`Falha ao atualizar assinatura da loja: ${updateErr.message}`);
  }

  if (transition.grantReferralBonus) {
    await admin.rpc("conceder_bonus_indicacao", {
      p_loja_indicada_id: loja.id,
    });
  }

  return {
    ok: true,
    duplicate: false,
    ignored: false,
    lojaId: loja.id,
    slug: loja.slug,
    assinaturaStatus: transition.assinatura_status,
  };
}
