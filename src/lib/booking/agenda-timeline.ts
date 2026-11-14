import {
  getDiaSemanaSaoPaulo,
  msToSaoPauloHm,
  saoPauloToMs,
  type HorariosLojaConfig,
} from "@/lib/booking/disponibilidade";

export interface AgendaAgendamentoItem {
  id: string;
  profissional_id: string;
  profissional_nome: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  servicos_resumo: string;
  inicio: string;
  fim: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado" | "no_show";
  total_centavos: number;
  sinal_centavos: number;
  origem: "online" | "manual";
}

export interface AgendaBloqueioItem {
  id: string;
  profissional_id: string | null;
  inicio: string;
  fim: string;
  tipo: string;
  motivo: string;
}

export type TimelineItem =
  | {
      kind: "agendamento";
      sortMs: number;
      horaInicio: string;
      horaFim: string;
      duracaoMin: number;
      aguardandoBaixa: boolean;
      agendamento: AgendaAgendamentoItem;
    }
  | {
      kind: "bloqueio";
      sortMs: number;
      id: string;
      horaInicio: string;
      horaFim: string;
      duracaoMin: number;
      titulo: string;
      subtitulo: string;
    }
  | {
      kind: "livre";
      sortMs: number;
      horaInicio: string;
      horaFim: string;
      duracaoMin: number;
    }
  | {
      kind: "agora";
      sortMs: number;
      hora: string;
    };

export interface AgendaDayMetrics {
  totalAgendados: number;
  concluidos: number;
  aguardandoBaixa: number;
  minutosLivres: number;
  slotsLivresCount: number;
  estimadoCentavos: number;
  fimExpedienteHm: string | null;
}

export function getTodayYmdSaoPaulo(nowMs = Date.now()): string {
  const sp = new Date(nowMs - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sp.getUTCFullYear()}-${pad(sp.getUTCMonth() + 1)}-${pad(sp.getUTCDate())}`;
}

export function addDaysYmd(dataYmd: string, deltaDays: number): string {
  const baseMs = saoPauloToMs(dataYmd, "12:00");
  return getTodayYmdSaoPaulo(baseMs + deltaDays * 86_400_000);
}

/**
 * Constrói a linha do tempo cronológica de um dia (America/Sao_Paulo),
 * intercalando agendamentos, bloqueios/almoço, lacunas livres (>= 15 min)
 * e a linha de horário atual ("Agora").
 */
export function buildAgendaTimeline({
  dataYmd,
  horariosLoja,
  agendamentos,
  bloqueios,
  nowMs = Date.now(),
  minGapMin = 15,
}: {
  dataYmd: string;
  horariosLoja: HorariosLojaConfig;
  agendamentos: AgendaAgendamentoItem[];
  bloqueios: AgendaBloqueioItem[];
  nowMs?: number;
  minGapMin?: number;
}): { items: TimelineItem[]; metrics: AgendaDayMetrics; diaAberto: boolean } {
  const dayStartMs = saoPauloToMs(dataYmd, "00:00");
  const dayEndMs = dayStartMs + 86_400_000;

  const diaKey = getDiaSemanaSaoPaulo(dataYmd);
  const diaConfig = horariosLoja[diaKey];
  const diaAberto = Boolean(diaConfig?.ativo);

  const abreMs = diaConfig?.ativo ? saoPauloToMs(dataYmd, diaConfig.abre) : saoPauloToMs(dataYmd, "09:00");
  const fechaMs = diaConfig?.ativo ? saoPauloToMs(dataYmd, diaConfig.fecha) : saoPauloToMs(dataYmd, "19:00");

  const agsDoDia = agendamentos
    .filter((a) => {
      if (a.status === "cancelado") return false;
      const startMs = Date.parse(a.inicio);
      return startMs >= dayStartMs && startMs < dayEndMs;
    })
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));

  const occupiedIntervals: Array<{ startMs: number; endMs: number }> = [];
  const timeline: TimelineItem[] = [];

  let concluidos = 0;
  let aguardandoBaixa = 0;
  let estimadoCentavos = 0;

  for (const ag of agsDoDia) {
    const startMs = Date.parse(ag.inicio);
    const endMs = Date.parse(ag.fim);
    const duracaoMin = Math.max(5, Math.round((endMs - startMs) / 60_000));
    const isPendingSettlement =
      (ag.status === "confirmado" || ag.status === "pendente") && endMs <= nowMs;

    if (ag.status === "concluido") concluidos++;
    if (isPendingSettlement) aguardandoBaixa++;
    if (ag.status !== "no_show") estimadoCentavos += ag.total_centavos;

    occupiedIntervals.push({ startMs, endMs });
    timeline.push({
      kind: "agendamento",
      sortMs: startMs,
      horaInicio: msToSaoPauloHm(startMs),
      horaFim: msToSaoPauloHm(endMs),
      duracaoMin,
      aguardandoBaixa: isPendingSettlement,
      agendamento: ag,
    });
  }

  // Intervalo de almoço padrão
  if (diaAberto && horariosLoja.almoco_ativo && horariosLoja.almoco_inicio && horariosLoja.almoco_fim) {
    const almStart = saoPauloToMs(dataYmd, horariosLoja.almoco_inicio);
    const almEnd = saoPauloToMs(dataYmd, horariosLoja.almoco_fim);
    if (almEnd > almStart) {
      occupiedIntervals.push({ startMs: almStart, endMs: almEnd });
      timeline.push({
        kind: "bloqueio",
        sortMs: almStart,
        id: "almoco",
        horaInicio: horariosLoja.almoco_inicio,
        horaFim: horariosLoja.almoco_fim,
        duracaoMin: Math.round((almEnd - almStart) / 60_000),
        titulo: "Intervalo de Almoço",
        subtitulo: `${Math.round((almEnd - almStart) / 60_000)} minutos reservados`,
      });
    }
  }

  // Bloqueios da agenda no dia
  for (const b of bloqueios) {
    const bStart = Date.parse(b.inicio);
    const bEnd = Date.parse(b.fim);
    if (bEnd <= dayStartMs || bStart >= dayEndMs) continue;
    const clampedStart = Math.max(bStart, dayStartMs);
    const clampedEnd = Math.min(bEnd, dayEndMs);
    occupiedIntervals.push({ startMs: clampedStart, endMs: clampedEnd });
    timeline.push({
      kind: "bloqueio",
      sortMs: clampedStart,
      id: b.id,
      horaInicio: msToSaoPauloHm(clampedStart),
      horaFim: msToSaoPauloHm(clampedEnd),
      duracaoMin: Math.max(5, Math.round((clampedEnd - clampedStart) / 60_000)),
      titulo: b.motivo || (b.tipo === "feriado" ? "Feriado" : "Bloqueio"),
      subtitulo: b.tipo === "folga" ? "Folga programada" : "Horário bloqueado",
    });
  }

  // Calcular lacunas livres dentro do expediente
  let minutosLivres = 0;
  let slotsLivresCount = 0;

  if (diaAberto && fechaMs > abreMs) {
    const sorted = [...occupiedIntervals]
      .filter((iv) => iv.endMs > abreMs && iv.startMs < fechaMs)
      .map((iv) => ({
        startMs: Math.max(iv.startMs, abreMs),
        endMs: Math.min(iv.endMs, fechaMs),
      }))
      .sort((a, b) => a.startMs - b.startMs);

    const isTodayDay = dataYmd === getTodayYmdSaoPaulo(nowMs);
    const isPastDay = dataYmd < getTodayYmdSaoPaulo(nowMs);
    const minFutureMs = isTodayDay ? Math.ceil(nowMs / (5 * 60_000)) * (5 * 60_000) : abreMs;

    let cursor = abreMs;
    for (const iv of sorted) {
      if (iv.startMs > cursor && !isPastDay) {
        const effectiveStart = isTodayDay ? Math.max(cursor, minFutureMs) : cursor;
        const gapMin = Math.round((iv.startMs - effectiveStart) / 60_000);
        if (iv.startMs > effectiveStart && gapMin >= minGapMin) {
          minutosLivres += gapMin;
          slotsLivresCount++;
          timeline.push({
            kind: "livre",
            sortMs: effectiveStart,
            horaInicio: msToSaoPauloHm(effectiveStart),
            horaFim: msToSaoPauloHm(iv.startMs),
            duracaoMin: gapMin,
          });
        }
      }
      cursor = Math.max(cursor, iv.endMs);
    }

    if (fechaMs > cursor && !isPastDay) {
      const effectiveStart = isTodayDay ? Math.max(cursor, minFutureMs) : cursor;
      const tailGapMin = Math.round((fechaMs - effectiveStart) / 60_000);
      if (fechaMs > effectiveStart && tailGapMin >= minGapMin) {
        minutosLivres += tailGapMin;
        slotsLivresCount++;
        timeline.push({
          kind: "livre",
          sortMs: effectiveStart,
          horaInicio: msToSaoPauloHm(effectiveStart),
          horaFim: msToSaoPauloHm(fechaMs),
          duracaoMin: tailGapMin,
        });
      }
    }
  }

  // Indicador em tempo real se for hoje
  const isToday = dataYmd === getTodayYmdSaoPaulo(nowMs);
  if (isToday && nowMs >= dayStartMs && nowMs < dayEndMs) {
    timeline.push({
      kind: "agora",
      sortMs: nowMs,
      hora: msToSaoPauloHm(nowMs),
    });
  }

  timeline.sort((a, b) => a.sortMs - b.sortMs);

  return {
    items: timeline,
    diaAberto,
    metrics: {
      totalAgendados: agsDoDia.length,
      concluidos,
      aguardandoBaixa,
      minutosLivres,
      slotsLivresCount,
      estimadoCentavos,
      fimExpedienteHm: diaConfig?.ativo ? diaConfig.fecha : null,
    },
  };
}
