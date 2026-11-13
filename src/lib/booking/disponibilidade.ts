export type DiaSemanaKey = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

export interface DiaExpediente {
  ativo: boolean;
  abre: string;
  fecha: string;
}

export interface HorariosLojaConfig {
  seg?: DiaExpediente;
  ter?: DiaExpediente;
  qua?: DiaExpediente;
  qui?: DiaExpediente;
  sex?: DiaExpediente;
  sab?: DiaExpediente;
  dom?: DiaExpediente;
  almoco_ativo?: boolean;
  almoco_inicio?: string;
  almoco_fim?: string;
}

export interface IntervaloOcupado {
  inicio: string | Date;
  fim: string | Date;
}

export interface SlotDisponivel {
  hora: string;
  inicioIso: string;
  fimIso: string;
}

const DIAS_SEMANA: DiaSemanaKey[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

/**
 * Converte "YYYY-MM-DD" + "HH:mm" no fuso America/Sao_Paulo (-03:00) para timestamp UTC (ms).
 */
export function saoPauloToMs(dataYmd: string, horaHm: string): number {
  const iso = `${dataYmd}T${horaHm}:00-03:00`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new Error(`Data ou horário inválido: ${iso}`);
  }
  return ms;
}

/**
 * Formata timestamp UTC (ms) para ISO-8601 com offset -03:00 (America/Sao_Paulo).
 */
export function msToSaoPauloIso(ms: number): string {
  const spDate = new Date(ms - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = spDate.getUTCFullYear();
  const m = pad(spDate.getUTCMonth() + 1);
  const d = pad(spDate.getUTCDate());
  const h = pad(spDate.getUTCHours());
  const min = pad(spDate.getUTCMinutes());
  return `${y}-${m}-${d}T${h}:${min}:00-03:00`;
}

export function msToSaoPauloHm(ms: number): string {
  const spDate = new Date(ms - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(spDate.getUTCHours())}:${pad(spDate.getUTCMinutes())}`;
}

export function getDiaSemanaSaoPaulo(dataYmd: string): DiaSemanaKey {
  const ms = saoPauloToMs(dataYmd, "12:00");
  const spDate = new Date(ms - 3 * 60 * 60 * 1000);
  return DIAS_SEMANA[spDate.getUTCDay()];
}

export interface CalcularSlotsInput {
  dataYmd: string;
  horariosLoja: HorariosLojaConfig;
  duracaoTotalMin: number;
  ocupados: IntervaloOcupado[];
  passoMin?: number;
  nowMs?: number;
  antecedenciaMin?: number;
}

/**
 * Motor matemático determinístico de disponibilidade (America/Sao_Paulo).
 * Cruza expediente semanal, intervalo de almoço, duração total somada de serviços,
 * bloqueios e agendamentos já confirmados/pendentes.
 */
export function calcularSlotsDisponiveis({
  dataYmd,
  horariosLoja,
  duracaoTotalMin,
  ocupados,
  passoMin = 15,
  nowMs,
  antecedenciaMin = 0,
}: CalcularSlotsInput): SlotDisponivel[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataYmd)) return [];
  if (duracaoTotalMin <= 0 || passoMin <= 0) return [];

  const diaKey = getDiaSemanaSaoPaulo(dataYmd);
  const dia = horariosLoja[diaKey];
  if (!dia || !dia.ativo) return [];

  const abreMs = saoPauloToMs(dataYmd, dia.abre);
  const fechaMs = saoPauloToMs(dataYmd, dia.fecha);
  if (fechaMs <= abreMs) return [];

  const duracaoMs = duracaoTotalMin * 60_000;
  const passoMs = passoMin * 60_000;
  const limiteMinimoMs = nowMs !== undefined ? nowMs + antecedenciaMin * 60_000 : -Infinity;

  const bloqueios: Array<{ inicioMs: number; fimMs: number }> = [];

  if (horariosLoja.almoco_ativo && horariosLoja.almoco_inicio && horariosLoja.almoco_fim) {
    const almocoInicioMs = saoPauloToMs(dataYmd, horariosLoja.almoco_inicio);
    const almocoFimMs = saoPauloToMs(dataYmd, horariosLoja.almoco_fim);
    if (almocoFimMs > almocoInicioMs) {
      bloqueios.push({ inicioMs: almocoInicioMs, fimMs: almocoFimMs });
    }
  }

  for (const item of ocupados) {
    const inicioMs = item.inicio instanceof Date ? item.inicio.getTime() : Date.parse(item.inicio);
    const fimMs = item.fim instanceof Date ? item.fim.getTime() : Date.parse(item.fim);
    if (!Number.isNaN(inicioMs) && !Number.isNaN(fimMs) && fimMs > inicioMs) {
      bloqueios.push({ inicioMs, fimMs });
    }
  }

  const slots: SlotDisponivel[] = [];
  for (let cursor = abreMs; cursor + duracaoMs <= fechaMs; cursor += passoMs) {
    if (cursor < limiteMinimoMs) continue;

    const slotFim = cursor + duracaoMs;
    const conflito = bloqueios.some((b) => cursor < b.fimMs && slotFim > b.inicioMs);
    if (conflito) continue;

    slots.push({
      hora: msToSaoPauloHm(cursor),
      inicioIso: msToSaoPauloIso(cursor),
      fimIso: msToSaoPauloIso(slotFim),
    });
  }

  return slots;
}
