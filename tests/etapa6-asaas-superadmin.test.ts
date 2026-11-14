import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  asaasWebhookSchema,
  processAsaasWebhookEvent,
  verifyAsaasWebhookToken,
} from "../src/lib/asaas/webhook";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

describe("Etapa 6 — Assinatura Asaas, Idempotência, Indicação & Super Admin", () => {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  it("valida token Asaas em tempo constante e rejeita tokens ausentes ou inválidos", () => {
    expect(verifyAsaasWebhookToken("segredo-asaas-123", "segredo-asaas-123")).toBe(true);
    expect(verifyAsaasWebhookToken("segredo-asaas-124", "segredo-asaas-123")).toBe(false);
    expect(verifyAsaasWebhookToken("curto", "segredo-asaas-123")).toBe(false);
    expect(verifyAsaasWebhookToken(null, "segredo-asaas-123")).toBe(false);
    expect(verifyAsaasWebhookToken("abc", undefined)).toBe(false);
  });

  it("processa Webhook Asaas com idempotência, pausa por atraso, reativa no PIX e concede +30d de indicação apenas 1 vez", async () => {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ts = Date.now();
    const { data: uOwner } = await admin.auth.admin.createUser({
      email: `owner-etapa6-${ts}@zelo.test`,
      password: "Password123!",
      email_confirm: true,
    });

    const { data: lojaA } = await admin
      .from("lojas")
      .insert({
        owner_id: uOwner.user!.id,
        nome: "Loja Indicadora",
        slug: `indicadora-${ts}`,
        nicho: "barbearia",
        cidade: "BH",
        bairro: "Centro",
        whatsapp_loja: "31999990001",
      })
      .select("id, codigo_indicacao, trial_ate")
      .single();

    const { data: lojaB } = await admin
      .from("lojas")
      .insert({
        owner_id: uOwner.user!.id,
        nome: "Loja Indicada",
        slug: `indicada-${ts}`,
        nicho: "barbearia",
        cidade: "BH",
        bairro: "Savassi",
        whatsapp_loja: "31999990002",
        plano: "solo",
      })
      .select("id, slug")
      .single();

    const evOverdueId = `evt_overdue_${ts}`;
    const evPaidId = `evt_paid_${ts}`;

    try {
      // 1. Aplica código de indicação da Loja A na Loja B
      const { data: applied, error: applyErr } = await admin.rpc(
        "aplicar_indicacao_loja",
        {
          p_nova_loja_id: lojaB!.id,
          p_codigo_indicacao: lojaA!.codigo_indicacao,
        }
      );
      expect(applyErr).toBeNull();
      expect(applied).toBe(true);

      // 2. Evento PAYMENT_OVERDUE pausa a Loja B
      const overduePayload = asaasWebhookSchema.parse({
        id: evOverdueId,
        event: "PAYMENT_OVERDUE",
        payment: {
          id: `pay_1_${ts}`,
          customer: `cus_${ts}`,
          subscription: `sub_${ts}`,
          externalReference: lojaB!.id,
          value: 29,
        },
      });
      const resOverdue = await processAsaasWebhookEvent(admin, overduePayload);
      expect(resOverdue).toMatchObject({
        ok: true,
        duplicate: false,
        assinaturaStatus: "atrasada",
      });

      const { data: lojaBAposAtraso } = await admin
        .from("lojas")
        .select("assinatura_status, pausada")
        .eq("id", lojaB!.id)
        .single();
      expect(lojaBAposAtraso).toEqual({
        assinatura_status: "atrasada",
        pausada: true,
      });

      // 3. Evento PAYMENT_CONFIRMED reativa a Loja B e dá +30 dias à Loja A
      const paidPayload = asaasWebhookSchema.parse({
        id: evPaidId,
        event: "PAYMENT_CONFIRMED",
        payment: {
          id: `pay_2_${ts}`,
          customer: `cus_${ts}`,
          subscription: `sub_${ts}`,
          externalReference: lojaB!.id,
          value: 29,
        },
      });
      const resPaid = await processAsaasWebhookEvent(admin, paidPayload);
      expect(resPaid).toMatchObject({
        ok: true,
        duplicate: false,
        assinaturaStatus: "ativa",
      });

      const { data: lojaBAposPago } = await admin
        .from("lojas")
        .select("assinatura_status, pausada, bonus_indicacao_pago")
        .eq("id", lojaB!.id)
        .single();
      expect(lojaBAposPago).toEqual({
        assinatura_status: "ativa",
        pausada: false,
        bonus_indicacao_pago: true,
      });

      const { data: lojaADepois } = await admin
        .from("lojas")
        .select("trial_ate")
        .eq("id", lojaA!.id)
        .single();
      const diffDias =
        (Date.parse(lojaADepois!.trial_ate) - Date.parse(lojaA!.trial_ate)) /
        86_400_000;
      expect(diffDias).toBeGreaterThanOrEqual(29.9);

      // 4. Reenvio duplicado do mesmo webhook deve ser idempotente
      const resDup = await processAsaasWebhookEvent(admin, paidPayload);
      expect(resDup).toMatchObject({ ok: true, duplicate: true });

      const { data: lojaADup } = await admin
        .from("lojas")
        .select("trial_ate")
        .eq("id", lojaA!.id)
        .single();
      expect(lojaADup!.trial_ate).toBe(lojaADepois!.trial_ate);

      // 5. Usuário autenticado comum NÃO consegue ler webhook_events nem super_admin_audit_logs
      const userClient = createClient(url, anonKey);
      await userClient.auth.signInWithPassword({
        email: `owner-etapa6-${ts}@zelo.test`,
        password: "Password123!",
      });
      const { data: leakWebhook } = await userClient
        .from("webhook_events")
        .select("id");
      const { data: leakAudit } = await userClient
        .from("super_admin_audit_logs")
        .select("id");
      expect(leakWebhook).toEqual([]);
      expect(leakAudit).toEqual([]);
    } finally {
      await admin
        .from("webhook_events")
        .delete()
        .in("id", [`asaas:${evOverdueId}`, `asaas:${evPaidId}`]);
      await admin.from("lojas").delete().in("id", [lojaB!.id, lojaA!.id]);
      await admin.auth.admin.deleteUser(uOwner.user!.id);
    }
  });
});
