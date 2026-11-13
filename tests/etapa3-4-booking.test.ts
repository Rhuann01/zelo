import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  calcularSlotsDisponiveis,
  type HorariosLojaConfig,
} from "../src/lib/booking/disponibilidade";

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

describe("Etapa 3 — Motor Matemático de Disponibilidade", () => {
  const horariosBase: HorariosLojaConfig = {
    seg: { ativo: true, abre: "09:00", fecha: "19:00" },
    dom: { ativo: false, abre: "09:00", fecha: "13:00" },
    almoco_ativo: true,
    almoco_inicio: "12:30",
    almoco_fim: "13:30",
  };

  it("respeita soma de múltiplos serviços (35 + 25 = 60 min), almoço e borda de fechamento", () => {
    // 2026-11-16 é segunda-feira
    const slots = calcularSlotsDisponiveis({
      dataYmd: "2026-11-16",
      horariosLoja: horariosBase,
      duracaoTotalMin: 60,
      ocupados: [
        {
          inicio: "2026-11-16T10:00:00-03:00",
          fim: "2026-11-16T10:45:00-03:00",
        },
      ],
      passoMin: 15,
    });

    const horas = slots.map((s) => s.hora);
    // 09:00..10:00 cabe antes das 10:00
    expect(horas).toContain("09:00");
    // 09:15..10:15 colide com 10:00..10:45
    expect(horas).not.toContain("09:15");
    // 10:45 cabe após 10:00..10:45
    expect(horas).toContain("10:45");
    // 11:30..12:30 cabe antes do almoço 12:30..13:30
    expect(horas).toContain("11:30");
    // 11:45..12:45 invade almoço
    expect(horas).not.toContain("11:45");
    expect(horas).not.toContain("12:30");
    // 18:00..19:00 cabe na borda, 18:15..19:15 passa de 19:00
    expect(horas).toContain("18:00");
    expect(horas).not.toContain("18:15");
    // ISO gerado com offset America/Sao_Paulo (-03:00)
    expect(slots[0]?.inicioIso).toBe("2026-11-16T09:00:00-03:00");
  });

  it("retorna vazio em dia fechado e filtra horários passados", () => {
    // 2026-11-15 é domingo (ativo: false)
    const domingo = calcularSlotsDisponiveis({
      dataYmd: "2026-11-15",
      horariosLoja: horariosBase,
      duracaoTotalMin: 30,
      ocupados: [],
    });
    expect(domingo).toEqual([]);

    // Segunda às 17:00 com antecedência de 30 min -> só >= 17:30
    const agoraMs = Date.parse("2026-11-16T17:00:00-03:00");
    const tardinha = calcularSlotsDisponiveis({
      dataYmd: "2026-11-16",
      horariosLoja: horariosBase,
      duracaoTotalMin: 30,
      ocupados: [],
      passoMin: 15,
      nowMs: agoraMs,
      antecedenciaMin: 30,
    });
    expect(tardinha.map((s) => s.hora)).toEqual(["17:30", "17:45", "18:00", "18:15", "18:30"]);
  });
});

describe("Etapa 4 — RPCs de Reserva Blindada & Concorrência GiST (23P01)", () => {
  it("dispara Promise.all no mesmo milissegundo: 1 grava, 1 falha com 23P01 e cancelamento libera vaga", async () => {
    const env = loadEnvLocal();
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const clientA = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const clientB = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const ts = Date.now();
    const emailA = `cli_a_${ts}@zelo.test`;
    const emailB = `cli_b_${ts}@zelo.test`;
    const pass = "TestBooking123!";

    const { data: uA } = await admin.auth.admin.createUser({
      email: emailA,
      password: pass,
      email_confirm: true,
    });
    const { data: uB } = await admin.auth.admin.createUser({
      email: emailB,
      password: pass,
      email_confirm: true,
    });

    await clientA.auth.signInWithPassword({ email: emailA, password: pass });
    await clientB.auth.signInWithPassword({ email: emailB, password: pass });

    const { data: loja } = await admin
      .from("lojas")
      .insert({
        owner_id: uA.user!.id,
        slug: `teste-booking-${ts}`,
        nome: "Barbearia Concorrência",
        nicho: "barbearia",
        cidade: "Belo Horizonte",
        bairro: "Centro",
        sinal_centavos: 1500,
      })
      .select("id")
      .single();

    const { data: prof } = await admin
      .from("profissionais")
      .insert({
        loja_id: loja!.id,
        user_id: uA.user!.id,
        nome: "Barbeiro Teste",
        eh_dono: true,
        ativo: true,
        comissao_percentual: 100,
      })
      .select("id")
      .single();

    const { data: srv } = await admin
      .from("servicos")
      .insert({
        loja_id: loja!.id,
        nome: "Corte Teste",
        duracao_min: 30,
        preco_centavos: 4000,
        ativo: true,
      })
      .select("id")
      .single();

    const inicioFuturo = new Date(Date.now() + 3 * 86_400_000);
    inicioFuturo.setUTCHours(17, 0, 0, 0); // 14:00 -03:00
    const inicioIso = inicioFuturo.toISOString();

    try {
      const [resA, resB] = await Promise.all([
        clientA.rpc("criar_agendamento_online", {
          p_loja_id: loja!.id,
          p_profissional_id: prof!.id,
          p_servicos_ids: [srv!.id],
          p_inicio: inicioIso,
        }),
        clientB.rpc("criar_agendamento_online", {
          p_loja_id: loja!.id,
          p_profissional_id: prof!.id,
          p_servicos_ids: [srv!.id],
          p_inicio: inicioIso,
        }),
      ]);

      const sucessos = [resA, resB].filter((r) => !r.error);
      const erros = [resA, resB].filter((r) => r.error);

      expect(sucessos).toHaveLength(1);
      expect(erros).toHaveLength(1);
      expect(erros[0]?.error?.code).toBe("23P01");

      const agendamentoId = sucessos[0]!.data[0].agendamento_id as string;
      const winnerClient = resA.error ? clientB : clientA;

      // get_horarios_ocupados retorna 1 intervalo sem PII
      const anonClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: ocupadosAntes } = await anonClient.rpc("get_horarios_ocupados", {
        p_loja_id: loja!.id,
        p_profissional_id: prof!.id,
        p_data_inicio: new Date(inicioFuturo.getTime() - 3_600_000).toISOString(),
        p_data_fim: new Date(inicioFuturo.getTime() + 7_200_000).toISOString(),
      });
      expect(ocupadosAntes).toHaveLength(1);
      expect(Object.keys(ocupadosAntes![0]).sort()).toEqual(["fim", "inicio", "origem_bloqueio"]);

      // Cliente cancela -> vaga volta na hora
      const { error: cancelErr } = await winnerClient.rpc("cancelar_ou_remarcar", {
        p_agendamento_id: agendamentoId,
        p_acao: "cancelar",
      });
      expect(cancelErr).toBeNull();

      const { data: ocupadosDepois } = await anonClient.rpc("get_horarios_ocupados", {
        p_loja_id: loja!.id,
        p_profissional_id: prof!.id,
        p_data_inicio: new Date(inicioFuturo.getTime() - 3_600_000).toISOString(),
        p_data_fim: new Date(inicioFuturo.getTime() + 7_200_000).toISOString(),
      });
      expect(ocupadosDepois).toHaveLength(0);
    } finally {
      await admin.from("agendamentos").delete().eq("loja_id", loja!.id);
      await admin.from("servicos").delete().eq("loja_id", loja!.id);
      await admin.from("profissionais").delete().eq("loja_id", loja!.id);
      await admin.from("lojas").delete().eq("id", loja!.id);
      await admin.auth.admin.deleteUser(uA.user!.id);
      await admin.auth.admin.deleteUser(uB.user!.id);
    }
  });
});
