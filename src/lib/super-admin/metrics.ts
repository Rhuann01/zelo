import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeCsvCell } from "@/lib/security/sanitize-next";

export type SemaforoCor = "verde" | "amarelo" | "vermelho";

export interface SuperAdminLojaRow {
  id: string;
  nome: string;
  slug: string;
  nicho: string;
  cidade: string;
  bairro: string;
  plano: "trial" | "solo" | "estudio";
  assinatura_status: "trial" | "ativa" | "atrasada" | "cancelada";
  pausada: boolean;
  trial_ate: string;
  created_at: string;
  ultimo_acesso_painel_em: string | null;
  primeiro_agendamento_em: string | null;
  servicos_count: number;
  agendamentos_30d: number;
  indicacoes_confirmadas: number;
  semaforo: SemaforoCor;
  semaforoMotivo: string;
}

export interface SuperAdminDashboardData {
  kpis: {
    totalLojas: number;
    lojasAtivas: number;
    lojasTrial: number;
    lojasAtrasadas: number;
    mrrBrutoCentavos: number;
    mrrLiquidoCentavos: number;
    conversaoTrialPct: number;
    churnPct: number;
  };
  funil14d: {
    cadastradas: number;
    comServicos: number;
    comPrimeiroAgendamento: number;
    assinantes: number;
  };
  semaforoResumo: {
    verde: number;
    amarelo: number;
    vermelho: number;
  };
  cidadesRadar: Array<{
    cidade: string;
    lojas: number;
    agendamentos30d: number;
  }>;
  infra: {
    agendamentosTotal: number;
    pushSubscriptions: number;
    webhooksRecentes: Array<{
      id: string;
      provider: string;
      event_type: string;
      processed_at: string;
    }>;
    auditLogsRecentes: Array<{
      id: string;
      acao: string;
      alvo_loja_id: string | null;
      detalhes: Record<string, unknown>;
      created_at: string;
    }>;
  };
  lojas: SuperAdminLojaRow[];
}

function calcularSemaforo(params: {
  assinatura_status: string;
  pausada: boolean;
  trial_ate: string;
  servicos_count: number;
  agendamentos_30d: number;
  nowMs: number;
}): { semaforo: SemaforoCor; motivo: string } {
  const trialMs = Date.parse(params.trial_ate);
  const diasParaFimTrial = Math.ceil((trialMs - params.nowMs) / 86_400_000);

  if (
    params.assinatura_status === "atrasada" ||
    params.assinatura_status === "cancelada" ||
    params.pausada
  ) {
    return {
      semaforo: "vermelho",
      motivo:
        params.assinatura_status === "atrasada"
          ? "Pagamento atrasado"
          : params.assinatura_status === "cancelada"
            ? "Assinatura cancelada"
            : "Loja pausada",
    };
  }

  if (params.assinatura_status === "trial" && diasParaFimTrial <= 0) {
    return { semaforo: "vermelho", motivo: "Trial expirado" };
  }

  if (params.servicos_count === 0) {
    return { semaforo: "amarelo", motivo: "Sem serviços cadastrados" };
  }

  if (params.assinatura_status === "trial" && diasParaFimTrial <= 3) {
    return { semaforo: "amarelo", motivo: `Trial vence em ${diasParaFimTrial}d` };
  }

  if (params.agendamentos_30d === 0) {
    return { semaforo: "amarelo", motivo: "Zero agendamentos em 30d" };
  }

  return {
    semaforo: "verde",
    motivo:
      params.assinatura_status === "ativa"
        ? "Assinatura ativa e operando"
        : `Trial saudável (${diasParaFimTrial}d restantes)`,
  };
}

export async function loadSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const admin = createAdminClient();
  const nowMs = Date.now();
  const ago30dIso = new Date(nowMs - 30 * 86_400_000).toISOString();
  const ago14dIso = new Date(nowMs - 14 * 86_400_000).toISOString();

  const [
    { data: lojasRaw },
    { data: servicosRaw },
    { data: ags30dRaw },
    { count: agsTotalCount },
    { count: pushCount },
    { data: webhooksRaw },
    { data: auditRaw },
  ] = await Promise.all([
    admin
      .from("lojas")
      .select(
        "id, nome, slug, nicho, cidade, bairro, plano, assinatura_status, pausada, trial_ate, created_at, ultimo_acesso_painel_em, primeiro_agendamento_em, indicado_por_loja_id, bonus_indicacao_pago, taxa_asaas_centavos"
      )
      .order("created_at", { ascending: false }),
    admin.from("servicos").select("loja_id").eq("ativo", true),
    admin
      .from("agendamentos")
      .select("loja_id")
      .gte("created_at", ago30dIso)
      .neq("status", "cancelado"),
    admin.from("agendamentos").select("id", { count: "exact", head: true }),
    admin.from("push_subscriptions").select("id", { count: "exact", head: true }),
    admin
      .from("webhook_events")
      .select("id, provider, event_type, processed_at")
      .order("processed_at", { ascending: false })
      .limit(12),
    admin
      .from("super_admin_audit_logs")
      .select("id, acao, alvo_loja_id, detalhes, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const servicosPorLoja = new Map<string, number>();
  for (const s of servicosRaw ?? []) {
    servicosPorLoja.set(s.loja_id, (servicosPorLoja.get(s.loja_id) ?? 0) + 1);
  }

  const agsPorLoja = new Map<string, number>();
  for (const a of ags30dRaw ?? []) {
    agsPorLoja.set(a.loja_id, (agsPorLoja.get(a.loja_id) ?? 0) + 1);
  }

  const indicacoesPorLoja = new Map<string, number>();
  for (const l of lojasRaw ?? []) {
    if (l.indicado_por_loja_id && l.bonus_indicacao_pago) {
      indicacoesPorLoja.set(
        l.indicado_por_loja_id,
        (indicacoesPorLoja.get(l.indicado_por_loja_id) ?? 0) + 1
      );
    }
  }

  let lojasAtivas = 0;
  let lojasTrial = 0;
  let lojasAtrasadas = 0;
  let lojasCanceladas = 0;
  let mrrBrutoCentavos = 0;
  let mrrLiquidoCentavos = 0;

  let verde = 0;
  let amarelo = 0;
  let vermelho = 0;

  const funil14d = {
    cadastradas: 0,
    comServicos: 0,
    comPrimeiroAgendamento: 0,
    assinantes: 0,
  };

  const radarMap = new Map<string, { lojas: number; agendamentos30d: number }>();

  const lojas: SuperAdminLojaRow[] = (lojasRaw ?? []).map((l) => {
    const servicosCount = servicosPorLoja.get(l.id) ?? 0;
    const ags30d = agsPorLoja.get(l.id) ?? 0;
    const indicacoesConfirmadas = indicacoesPorLoja.get(l.id) ?? 0;

    if (l.assinatura_status === "ativa") {
      lojasAtivas++;
      const precoPlano = l.plano === "estudio" ? 5900 : 2900;
      const taxaAsaas = l.taxa_asaas_centavos ?? 199;
      mrrBrutoCentavos += precoPlano;
      mrrLiquidoCentavos += Math.max(0, precoPlano - taxaAsaas);
    } else if (l.assinatura_status === "trial") {
      lojasTrial++;
    } else if (l.assinatura_status === "atrasada") {
      lojasAtrasadas++;
    } else if (l.assinatura_status === "cancelada") {
      lojasCanceladas++;
    }

    if (l.created_at >= ago14dIso) {
      funil14d.cadastradas++;
      if (servicosCount > 0) funil14d.comServicos++;
      if (l.primeiro_agendamento_em) funil14d.comPrimeiroAgendamento++;
      if (l.assinatura_status === "ativa") funil14d.assinantes++;
    }

    const cidadeKey = l.cidade || "Não informada";
    const radarEntry = radarMap.get(cidadeKey) ?? { lojas: 0, agendamentos30d: 0 };
    radarEntry.lojas += 1;
    radarEntry.agendamentos30d += ags30d;
    radarMap.set(cidadeKey, radarEntry);

    const { semaforo, motivo } = calcularSemaforo({
      assinatura_status: l.assinatura_status,
      pausada: l.pausada,
      trial_ate: l.trial_ate,
      servicos_count: servicosCount,
      agendamentos_30d: ags30d,
      nowMs,
    });

    if (semaforo === "verde") verde++;
    else if (semaforo === "amarelo") amarelo++;
    else vermelho++;

    return {
      id: l.id,
      nome: l.nome,
      slug: l.slug,
      nicho: l.nicho,
      cidade: l.cidade,
      bairro: l.bairro,
      plano: l.plano as "trial" | "solo" | "estudio",
      assinatura_status: l.assinatura_status as
        | "trial"
        | "ativa"
        | "atrasada"
        | "cancelada",
      pausada: l.pausada,
      trial_ate: l.trial_ate,
      created_at: l.created_at,
      ultimo_acesso_painel_em: l.ultimo_acesso_painel_em,
      primeiro_agendamento_em: l.primeiro_agendamento_em,
      servicos_count: servicosCount,
      agendamentos_30d: ags30d,
      indicacoes_confirmadas: indicacoesConfirmadas,
      semaforo,
      semaforoMotivo: motivo,
    };
  });

  const totalLojas = lojas.length;
  const baseConversao = lojasAtivas + lojasTrial + lojasCanceladas;
  const conversaoTrialPct =
    baseConversao > 0 ? Math.round((lojasAtivas / baseConversao) * 100) : 0;
  const baseChurn = lojasAtivas + lojasCanceladas;
  const churnPct =
    baseChurn > 0 ? Math.round((lojasCanceladas / baseChurn) * 100) : 0;

  const cidadesRadar = Array.from(radarMap.entries())
    .map(([cidade, stats]) => ({ cidade, ...stats }))
    .sort((a, b) => b.lojas - a.lojas || b.agendamentos30d - a.agendamentos30d)
    .slice(0, 10);

  return {
    kpis: {
      totalLojas,
      lojasAtivas,
      lojasTrial,
      lojasAtrasadas,
      mrrBrutoCentavos,
      mrrLiquidoCentavos,
      conversaoTrialPct,
      churnPct,
    },
    funil14d,
    semaforoResumo: { verde, amarelo, vermelho },
    cidadesRadar,
    infra: {
      agendamentosTotal: agsTotalCount ?? 0,
      pushSubscriptions: pushCount ?? 0,
      webhooksRecentes: webhooksRaw ?? [],
      auditLogsRecentes: (auditRaw ?? []) as Array<{
        id: string;
        acao: string;
        alvo_loja_id: string | null;
        detalhes: Record<string, unknown>;
        created_at: string;
      }>,
    },
    lojas,
  };
}

/**
 * Gera CSV sanitizado (sem e-mails, telefones ou PII) para análise em IA.
 */
export function generateSuperAdminCsv(lojas: SuperAdminLojaRow[]): string {
  const header = [
    "slug",
    "nicho",
    "cidade",
    "plano",
    "assinatura_status",
    "pausada",
    "semaforo",
    "servicos_count",
    "agendamentos_30d",
    "indicacoes_confirmadas",
    "trial_ate",
    "created_at",
  ].join(",");

  const esc = sanitizeCsvCell;

  const rows = lojas.map((l) =>
    [
      esc(l.slug),
      esc(l.nicho),
      esc(l.cidade),
      esc(l.plano),
      esc(l.assinatura_status),
      esc(l.pausada),
      esc(l.semaforo),
      l.servicos_count,
      l.agendamentos_30d,
      l.indicacoes_confirmadas,
      esc(l.trial_ate.slice(0, 10)),
      esc(l.created_at.slice(0, 10)),
    ].join(",")
  );

  return [header, ...rows].join("\n");
}
