import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  addDaysYmd,
  buildAgendaTimeline,
  getTodayYmdSaoPaulo,
} from "../src/lib/booking/agenda-timeline";

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

describe("Etapa 5 — Timeline Stitch Agenda do Dia (Unit)", () => {
  const baseHorarios: Parameters<typeof buildAgendaTimeline>[0]["horariosLoja"] = {
    almoco_ativo: true,
    almoco_inicio: "12:00",
    almoco_fim: "13:00",
    seg: { ativo: true, abre: "09:00", fecha: "18:00" },
    ter: { ativo: true, abre: "09:00", fecha: "18:00" },
    qua: { ativo: true, abre: "09:00", fecha: "18:00" },
    qui: { ativo: true, abre: "09:00", fecha: "18:00" },
    sex: { ativo: true, abre: "09:00", fecha: "18:00" },
    sab: { ativo: true, abre: "09:00", fecha: "14:00" },
    dom: { ativo: false, abre: "09:00", fecha: "14:00" },
  };

  it("intercala agendamentos, almoço, bloqueio manual e lacunas livres >= 15 min", () => {
    // 2026-11-16 é segunda-feira; nowMs = 10:15 BRT (13:15 UTC)
    const nowMs = Date.parse("2026-11-16T10:15:00-03:00");
    const result = buildAgendaTimeline({
      dataYmd: "2026-11-16",
      horariosLoja: baseHorarios,
      nowMs,
      agendamentos: [
        {
          id: "ag-1",
          profissional_id: "p1",
          profissional_nome: "Lucas",
          cliente_nome: "Mateus",
          cliente_whatsapp: "31999990001",
          servicos_resumo: "Corte Degradê",
          inicio: "2026-11-16T09:00:00-03:00",
          fim: "2026-11-16T09:45:00-03:00",
          status: "confirmado",
          total_centavos: 5000,
          sinal_centavos: 1500,
          origem: "online",
        },
        {
          id: "ag-2",
          profissional_id: "p1",
          profissional_nome: "Lucas",
          cliente_nome: "Carlos",
          cliente_whatsapp: null,
          servicos_resumo: "Barba",
          inicio: "2026-11-16T10:30:00-03:00",
          fim: "2026-11-16T11:00:00-03:00",
          status: "concluido",
          total_centavos: 4000,
          sinal_centavos: 0,
          origem: "manual",
        },
      ],
      bloqueios: [
        {
          id: "bloq-1",
          profissional_id: "p1",
          inicio: "2026-11-16T15:00:00-03:00",
          fim: "2026-11-16T16:00:00-03:00",
          tipo: "manual",
          motivo: "Reunião fornecedor",
        },
      ],
    });

    expect(result.diaAberto).toBe(true);
    expect(result.metrics.totalAgendados).toBe(2);
    expect(result.metrics.concluidos).toBe(1);
    expect(result.metrics.aguardandoBaixa).toBe(1);
    expect(result.metrics.estimadoCentavos).toBe(9000);
    expect(result.metrics.fimExpedienteHm).toBe("18:00");

    // Lacunas livres esperadas (agora = 10:15, então 09:45-10:15 já passou):
    // 10:15-10:30 (15m), 11:00-12:00 (60m), 13:00-15:00 (120m), 16:00-18:00 (120m) => 315m, 4 slots
    expect(result.metrics.slotsLivresCount).toBe(4);
    expect(result.metrics.minutosLivres).toBe(315);

    const kinds = result.items.map((i) => i.kind);
    expect(kinds).toContain("agora");
    expect(kinds).toContain("bloqueio");
    expect(kinds).toContain("livre");

    const agoraItem = result.items.find((i) => i.kind === "agora");
    expect(agoraItem).toMatchObject({ kind: "agora", hora: "10:15" });

    const ag1Item = result.items.find(
      (i) => i.kind === "agendamento" && i.agendamento.id === "ag-1",
    );
    expect(ag1Item).toMatchObject({ kind: "agendamento", aguardandoBaixa: true });
  });

  it("omite a linha 'agora' em outros dias e ignora agendamentos cancelados/no_show", () => {
    const nowMs = Date.parse("2026-11-16T10:15:00-03:00");
    const result = buildAgendaTimeline({
      dataYmd: "2026-11-17", // amanhã
      horariosLoja: baseHorarios,
      nowMs,
      agendamentos: [
        {
          id: "ag-cancelado",
          profissional_id: "p1",
          profissional_nome: "Lucas",
          cliente_nome: "Cancelado",
          cliente_whatsapp: null,
          servicos_resumo: "Corte",
          inicio: "2026-11-17T09:00:00-03:00",
          fim: "2026-11-17T09:30:00-03:00",
          status: "cancelado",
          total_centavos: 5000,
          sinal_centavos: 0,
          origem: "online",
        },
      ],
      bloqueios: [],
    });

    expect(result.items.some((i) => i.kind === "agora")).toBe(false);
    expect(result.metrics.totalAgendados).toBe(0);
    expect(result.metrics.estimadoCentavos).toBe(0);
    expect(result.metrics.aguardandoBaixa).toBe(0);
  });

  it("retorna diaAberto=false em domingo fechado e calcula datas em America/Sao_Paulo", () => {
    const nowMs = Date.parse("2026-11-14T23:30:00-03:00"); // 2026-11-15T02:30:00Z
    expect(getTodayYmdSaoPaulo(nowMs)).toBe("2026-11-14");
    expect(addDaysYmd("2026-11-14", 1)).toBe("2026-11-15"); // domingo
    expect(addDaysYmd("2026-11-14", -1)).toBe("2026-11-13");

    const domingo = buildAgendaTimeline({
      dataYmd: "2026-11-15",
      horariosLoja: baseHorarios,
      agendamentos: [],
      bloqueios: [],
      nowMs,
    });

    expect(domingo.diaAberto).toBe(false);
    expect(domingo.items).toEqual([]);
    expect(domingo.metrics.minutosLivres).toBe(0);
    expect(domingo.metrics.fimExpedienteHm).toBeNull();
  });
});
