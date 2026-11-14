"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Clock, Sparkles } from "lucide-react";
import type { LojaPublica, ProfissionalPublico } from "@/lib/public/get-loja-publica";

type DiaKey = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

interface DiaConfig {
  key: DiaKey;
  label: string;
  shortLabel: string;
}

const DIAS_ORDEM: readonly DiaConfig[] = [
  { key: "seg", label: "Segunda-feira", shortLabel: "Seg" },
  { key: "ter", label: "Terça-feira", shortLabel: "Ter" },
  { key: "qua", label: "Quarta-feira", shortLabel: "Qua" },
  { key: "qui", label: "Quinta-feira", shortLabel: "Qui" },
  { key: "sex", label: "Sexta-feira", shortLabel: "Sex" },
  { key: "sab", label: "Sábado", shortLabel: "Sáb" },
  { key: "dom", label: "Domingo", shortLabel: "Dom" },
] as const;

const JS_DAY_TO_KEY: Record<number, DiaKey> = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

interface HorarioDia {
  key: DiaKey;
  label: string;
  shortLabel: string;
  ativo: boolean;
  abre: string;
  fecha: string;
}

interface GrupoHorario {
  id: string;
  label: string;
  horarioTexto: string;
  ativo: boolean;
  incluiHoje: boolean;
}

function parseMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function readDiaConfig(
  horariosLoja: Record<string, unknown> | null | undefined,
  dia: DiaConfig
): HorarioDia {
  const cfg = horariosLoja?.[dia.key] as
    | { ativo?: boolean; abre?: string; fecha?: string }
    | undefined;
  const ativo = cfg?.ativo ?? dia.key !== "dom";
  const abre = cfg?.abre ?? "09:00";
  const fecha = cfg?.fecha ?? "20:00";
  return {
    ...dia,
    ativo,
    abre,
    fecha,
  };
}

function agruparHorarios(dias: HorarioDia[], todayKey: DiaKey): GrupoHorario[] {
  const grupos: GrupoHorario[] = [];

  for (const dia of dias) {
    const assinatura = dia.ativo ? `1|${dia.abre}|${dia.fecha}` : "0";
    const ultimo = grupos[grupos.length - 1];
    const ultimaAssinatura = ultimo
      ? ultimo.ativo
        ? `1|${ultimo.horarioTexto}`
        : "0"
      : null;
    const assinaturaGrupo = dia.ativo ? `1|${dia.abre} – ${dia.fecha}` : "0";

    if (ultimo && ultimaAssinatura === assinaturaGrupo) {
      const primeiroShort = ultimo.label.split(" a ")[0];
      ultimo.label = `${primeiroShort} a ${dia.shortLabel}`;
      if (dia.key === todayKey) ultimo.incluiHoje = true;
    } else {
      grupos.push({
        id: `${dia.key}-${assinatura}`,
        label: dia.shortLabel,
        horarioTexto: dia.ativo ? `${dia.abre} – ${dia.fecha}` : "Fechado",
        ativo: dia.ativo,
        incluiHoje: dia.key === todayKey,
      });
    }
  }

  return grupos;
}

export function EquipeHorariosTab({
  loja,
  profissionais,
  selectedProfId,
  isBrutal,
  cardSurfaceStyle,
  onAgendarComProfissional,
}: {
  loja: LojaPublica;
  profissionais: ProfissionalPublico[];
  selectedProfId: string;
  isBrutal: boolean;
  cardSurfaceStyle: React.CSSProperties;
  onAgendarComProfissional: (profId: string) => void;
}) {
  const [horariosExpandido, setHorariosExpandido] = useState(false);

  const { todayKey, dias, grupos, statusLoja } = useMemo(() => {
    const now = new Date();
    const currentKey = JS_DAY_TO_KEY[now.getDay()] ?? "seg";
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const listaDias = DIAS_ORDEM.map((d) => readDiaConfig(loja.horarios_loja, d));
    const diaHoje = listaDias.find((d) => d.key === currentKey) ?? listaDias[0];

    let abertoAgora = false;
    let statusTexto = "Fechado hoje";
    let statusTom: "open" | "soon" | "closed" = "closed";

    if (loja.pausada) {
      statusTexto = "Agendamentos pausados";
      statusTom = "closed";
    } else if (diaHoje.ativo) {
      const abreMin = parseMinutes(diaHoje.abre);
      const fechaMin = parseMinutes(diaHoje.fecha);
      if (abreMin !== null && fechaMin !== null) {
        if (nowMin >= abreMin && nowMin < fechaMin) {
          abertoAgora = true;
          statusTexto = `Aberto agora • fecha às ${diaHoje.fecha}`;
          statusTom = "open";
        } else if (nowMin < abreMin) {
          statusTexto = `Abre hoje às ${diaHoje.abre}`;
          statusTom = "soon";
        } else {
          statusTexto = `Fechado agora • abriu até ${diaHoje.fecha}`;
          statusTom = "closed";
        }
      } else {
        abertoAgora = true;
        statusTexto = `Atende hoje • ${diaHoje.abre}–${diaHoje.fecha}`;
        statusTom = "open";
      }
    }

    return {
      todayKey: currentKey,
      dias: listaDias,
      grupos: agruparHorarios(listaDias, currentKey),
      statusLoja: {
        abertoAgora,
        statusTexto,
        statusTom,
        atendeHoje: !loja.pausada && diaHoje.ativo,
        fechaHoje: diaHoje.fecha,
        abreHoje: diaHoje.abre,
      },
    };
  }, [loja.horarios_loja, loja.pausada]);

  const temMultiplos = profissionais.length >= 2;
  const profBadgeLabel = loja.pausada
    ? "Pausado"
    : statusLoja.atendeHoje
      ? statusLoja.abertoAgora
        ? `Atende hoje • até ${statusLoja.fechaHoje}`
        : `Atende hoje • ${statusLoja.abreHoje}`
      : "Fechado hoje";

  return (
    <div className="space-y-4">
      {/* PROFISSIONAIS */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-bold">Profissionais</h2>
          {profissionais.length > 0 && (
            <span className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>
              {profissionais.length === 1
                ? "1 especialista"
                : `${profissionais.length} especialistas`}
            </span>
          )}
        </div>

        {profissionais.length === 0 ? (
          <div
            className="p-4 text-xs"
            style={{ ...cardSurfaceStyle, color: "var(--t-muted)" }}
          >
            Nenhum profissional disponível para exibição pública no momento.
          </div>
        ) : temMultiplos ? (
          /* Grade horizontal dinâmica quando houver 2+ profissionais */
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {profissionais.map((p) => {
              const pInicial = (p.nome.trim()[0] || "P").toUpperCase();
              const isSelected = selectedProfId === p.id;
              return (
                <div
                  key={p.id}
                  className="flex min-w-[200px] flex-1 snap-start flex-col justify-between gap-3 p-3.5 transition-transform"
                  style={{
                    ...cardSurfaceStyle,
                    ...(isSelected && !isBrutal
                      ? {
                          boxShadow:
                            "0 0 0 1.5px var(--t-accent), var(--t-shadow)",
                        }
                      : {}),
                  }}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      {p.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.avatar_url}
                          alt={p.nome}
                          className="h-14 w-14 shrink-0 rounded-full object-cover"
                          style={{ backgroundColor: "var(--t-inner)" }}
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold"
                          style={{ backgroundColor: "var(--t-inner)", color: "var(--t-ink)" }}
                        >
                          {pInicial}
                        </div>
                      )}

                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--t-accent) 16%, transparent)"
                            : "var(--t-inner)",
                          color: isSelected ? "var(--t-accent)" : "var(--t-muted)",
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Sparkles className="h-2.5 w-2.5" />
                            Selecionado
                          </>
                        ) : statusLoja.atendeHoje ? (
                          "Atende hoje"
                        ) : (
                          "Agenda aberta"
                        )}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-tight">{p.nome}</p>
                      <p className="mt-0.5 truncate text-xs" style={{ color: "var(--t-muted)" }}>
                        {p.cargo}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loja.pausada}
                    onClick={() => onAgendarComProfissional(p.id)}
                    className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--t-accent)",
                      color: "var(--t-accent-ink)",
                      ...(isBrutal ? { border: "1.5px solid #000000" } : {}),
                    }}
                  >
                    <span>Agendar</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Card único rico com status rápido e CTA direto */
          profissionais.map((p) => {
            const pInicial = (p.nome.trim()[0] || "P").toUpperCase();
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3.5"
                style={cardSurfaceStyle}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {p.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.avatar_url}
                      alt={p.nome}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                      style={{ backgroundColor: "var(--t-inner)" }}
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: "var(--t-inner)", color: "var(--t-ink)" }}
                    >
                      {pInicial}
                    </div>
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-bold leading-tight">{p.nome}</p>
                    <p className="truncate text-xs" style={{ color: "var(--t-muted)" }}>
                      {p.cargo}
                    </p>
                    <span
                      className="inline-flex items-center gap-1.5 pt-0.5 text-[11px] font-medium"
                      style={{
                        color: statusLoja.atendeHoje ? "#10B981" : "var(--t-muted)",
                      }}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          statusLoja.atendeHoje ? "bg-[#10B981]" : "bg-current opacity-50"
                        }`}
                      />
                      {profBadgeLabel}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loja.pausada}
                  onClick={() => onAgendarComProfissional(p.id)}
                  className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--t-accent)",
                    color: "var(--t-accent-ink)",
                    ...(isBrutal ? { border: "1.5px solid #000000" } : {}),
                  }}
                >
                  <span>Agendar</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* HORÁRIO DE FUNCIONAMENTO */}
      <section className="space-y-3 p-4" style={cardSurfaceStyle}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--t-accent)" }} />
            <h2 className="text-sm font-bold">Horário de Funcionamento</h2>
          </div>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor:
                statusLoja.statusTom === "open"
                  ? "rgba(16, 185, 129, 0.14)"
                  : statusLoja.statusTom === "soon"
                    ? "rgba(245, 158, 11, 0.14)"
                    : "var(--t-inner)",
              color:
                statusLoja.statusTom === "open"
                  ? "#10B981"
                  : statusLoja.statusTom === "soon"
                    ? "#F59E0B"
                    : "var(--t-muted)",
            }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                statusLoja.statusTom === "open"
                  ? "animate-pulse bg-[#10B981]"
                  : statusLoja.statusTom === "soon"
                    ? "bg-[#F59E0B]"
                    : "bg-current opacity-60"
              }`}
            />
            {statusLoja.statusTexto}
          </span>
        </div>

        {!horariosExpandido ? (
          <div className="space-y-1">
            {grupos.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs"
                style={
                  g.incluiHoje
                    ? {
                        backgroundColor:
                          "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={g.incluiHoje ? "font-bold" : "font-medium"}
                    style={{ color: g.ativo ? "var(--t-ink)" : "var(--t-muted)" }}
                  >
                    {g.label}
                  </span>
                  {g.incluiHoje && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: "var(--t-accent)",
                        color: "var(--t-accent-ink)",
                      }}
                    >
                      Hoje
                    </span>
                  )}
                </div>
                <span
                  className="font-mono-num font-medium"
                  style={{ color: g.ativo ? "var(--t-ink)" : "var(--t-muted)" }}
                >
                  {g.horarioTexto}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {dias.map((dia) => {
              const isToday = dia.key === todayKey;
              return (
                <div
                  key={dia.key}
                  className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs"
                  style={
                    isToday
                      ? {
                          backgroundColor:
                            "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={isToday ? "font-bold" : undefined}
                      style={{ color: dia.ativo ? "var(--t-ink)" : "var(--t-muted)" }}
                    >
                      {dia.label}
                    </span>
                    {isToday && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: "var(--t-accent)",
                          color: "var(--t-accent-ink)",
                        }}
                      >
                        Hoje
                      </span>
                    )}
                  </div>
                  <span
                    className="font-mono-num font-medium"
                    style={{ color: dia.ativo ? "var(--t-ink)" : "var(--t-muted)" }}
                  >
                    {dia.ativo ? `${dia.abre} – ${dia.fecha}` : "Fechado"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setHorariosExpandido((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1 pt-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--t-muted)" }}
        >
          {horariosExpandido ? (
            <>
              <span>Recolher horários</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <span>Ver semana completa</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </section>
    </div>
  );
}
