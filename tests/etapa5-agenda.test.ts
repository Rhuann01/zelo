import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

describe("Etapa 5 — Encaixe Manual, Isolamento de Barbeiro & Push RLS", () => {
  it("grava encaixe manual (cliente_id NULL), trava conflito 23P01 e isola agenda entre barbeiros", async () => {
    const env = loadEnvLocal();
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const ownerClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const profBClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const ts = Date.now();
    const pass = "TestEtapa5123!";
    const emailOwner = `owner5_${ts}@zelo.test`;
    const emailProfB = `profb5_${ts}@zelo.test`;

    const { data: uOwner } = await admin.auth.admin.createUser({
      email: emailOwner,
      password: pass,
      email_confirm: true,
    });
    const { data: uProfB } = await admin.auth.admin.createUser({
      email: emailProfB,
      password: pass,
      email_confirm: true,
    });

    await ownerClient.auth.signInWithPassword({ email: emailOwner, password: pass });
    await profBClient.auth.signInWithPassword({ email: emailProfB, password: pass });

    const { data: loja } = await admin
      .from("lojas")
      .insert({
        owner_id: uOwner.user!.id,
        slug: `teste-etapa5-${ts}`,
        nome: "Barbearia Etapa 5",
        nicho: "barbearia",
        cidade: "Belo Horizonte",
        bairro: "Savassi",
      })
      .select("id")
      .single();

    const { data: profA } = await admin
      .from("profissionais")
      .insert({
        loja_id: loja!.id,
        user_id: uOwner.user!.id,
        nome: "Barbeiro A",
        eh_dono: true,
        ativo: true,
        comissao_percentual: 100,
      })
      .select("id")
      .single();

    const { data: profB } = await admin
      .from("profissionais")
      .insert({
        loja_id: loja!.id,
        user_id: uProfB.user!.id,
        nome: "Barbeiro B",
        email_convite: emailProfB,
        eh_dono: false,
        ativo: true,
        comissao_percentual: 50,
      })
      .select("id")
      .single();

    const inicio = new Date(Date.now() + 2 * 86_400_000);
    inicio.setUTCHours(16, 0, 0, 0);
    const fim = new Date(inicio.getTime() + 30 * 60_000);

    try {
      // Encaixe manual no balcão (cliente_id NULL) para profA
      const { data: manualA, error: errManual } = await ownerClient
        .from("agendamentos")
        .insert({
          loja_id: loja!.id,
          profissional_id: profA!.id,
          cliente_id: null,
          origem: "manual",
          cliente_nome: "Cliente Balcão",
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          status: "confirmado",
          total_centavos: 4500,
        })
        .select("id")
        .single();

      expect(errManual).toBeNull();
      expect(manualA?.id).toBeTruthy();

      // Segundo encaixe no mesmo horário para profA falha com 23P01
      const { error: errConflito } = await ownerClient.from("agendamentos").insert({
        loja_id: loja!.id,
        profissional_id: profA!.id,
        cliente_id: null,
        origem: "manual",
        cliente_nome: "Outro Cliente",
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        status: "confirmado",
        total_centavos: 4500,
      });
      expect(errConflito?.code).toBe("23P01");

      // Barbeiro B NÃO enxerga o agendamento do Barbeiro A
      const { data: visivelProfB } = await profBClient
        .from("agendamentos")
        .select("id")
        .eq("loja_id", loja!.id);
      expect(visivelProfB).toEqual([]);

      // Push subscription RLS: owner salva sua assinatura e profB não consegue ler
      const { error: pushErr } = await ownerClient.from("push_subscriptions").insert({
        user_id: uOwner.user!.id,
        endpoint: `https://push.zelo.test/${ts}`,
        p256dh: "BTestPublicKeyValue123456",
        auth: "AuthSecret123",
      });
      expect(pushErr).toBeNull();

      const { data: pushLeak } = await profBClient.from("push_subscriptions").select("id");
      expect(pushLeak).toEqual([]);
    } finally {
      await admin.from("push_subscriptions").delete().eq("user_id", uOwner.user!.id);
      await admin.from("agendamentos").delete().eq("loja_id", loja!.id);
      await admin.from("profissionais").delete().eq("loja_id", loja!.id);
      await admin.from("lojas").delete().eq("id", loja!.id);
      await admin.auth.admin.deleteUser(uOwner.user!.id);
      await admin.auth.admin.deleteUser(uProfB.user!.id);
    }
  });
});
