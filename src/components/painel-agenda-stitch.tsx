"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  Lock,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  PlusCircle,
  QrCode,
  RotateCcw,
  TrendingUp,
  User,
  Users,
  UserX,
  Utensils,
  XCircle,
} from "lucide-react";
import { BottomSheet } from "@/components/ui";
import { formatBrazilPhone } from "@/lib/schemas/agendamento";
import {
  atualizarStatusAgendamentoAction,
  criarEncaixeManualAction,
} from "@/app/painel/actions";
import {
  addDaysYmd,
  buildAgendaTimeline,
  getTodayYmdSaoPaulo,
  type AgendaAgendamentoItem,
  type AgendaBloqueioItem,
} from "@/lib/booking/agenda-timeline";
import { msToSaoPauloHm, saoPauloToMs, type HorariosLojaConfig } from "@/lib/booking/disponibilidade";
import { showToast } from "@/components/zelo-toast";

export interface AgendaProfissionalItem {
  id: string;
  nome: string;
}

export interface AgendaServicoItem {
  id: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatBRLShort(centavos: number) {
  return `R$ ${Math.round(centavos / 100)}`;
}

function formatDurationHuman(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateLabel(dataYmd: string, todayYmd: string) {
  const ms = saoPauloToMs(dataYmd, "12:00");
  const d = new Date(ms);
  const weekday = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  });
  const dayMonth = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
  const cleanWeek = weekday.replace(".", "");
  const formatted = `${cleanWeek.charAt(0).toUpperCase() + cleanWeek.slice(1)}, ${dayMonth.replace(".", "")}`;
  if (dataYmd === todayYmd) return `Hoje • ${formatted}`;
  if (dataYmd === addDaysYmd(todayYmd, 1)) return `Amanhã • ${formatted}`;
  return formatted;
}

export function PainelAgendaStitch({
  lojaId,
  isOwner,
  horariosLoja,
  agendamentos,
  bloqueios,
  profissionais,
  servicos,
}: {
  lojaId: string;
  isOwner: boolean;
  horariosLoja: HorariosLojaConfig;
  agendamentos: AgendaAgendamentoItem[];
  bloqueios: AgendaBloqueioItem[];
  profissionais: AgendaProfissionalItem[];
  servicos: AgendaServicoItem[];
}) {
  const router = useRouter();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const todayYmd = useMemo(() => getTodayYmdSaoPaulo(nowMs), [nowMs]);
  const [selectedDate, setSelectedDate] = useState(() => getTodayYmdSaoPaulo());
  const [filtroProf, setFiltroProf] = useState<string>("todos");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [encaixeOpen, setEncaixeOpen] = useState(false);

  const [encNome, setEncNome] = useState("");
  const [encWhatsapp, setEncWhatsapp] = useState("");
  const [encProfId, setEncProfId] = useState(profissionais[0]?.id ?? "");
  const [encData, setEncData] = useState(getTodayYmdSaoPaulo);
  const [encHora, setEncHora] = useState("14:00");
  const [encServicos, setEncServicos] = useState<string[]>(() =>
    servicos[0]?.id ? [servicos[0].id] : []
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const agsFiltrados = useMemo(
    () =>
      agendamentos.filter((a) =>
        filtroProf === "todos" ? true : a.profissional_id === filtroProf
      ),
    [agendamentos, filtroProf]
  );

  const bloqueiosFiltrados = useMemo(
    () =>
      bloqueios.filter((b) =>
        filtroProf === "todos" || !b.profissional_id ? true : b.profissional_id === filtroProf
      ),
    [bloqueios, filtroProf]
  );

  const { items, metrics, diaAberto } = useMemo(
    () =>
      buildAgendaTimeline({
        dataYmd: selectedDate,
        horariosLoja,
        agendamentos: agsFiltrados,
        bloqueios: bloqueiosFiltrados,
        nowMs,
      }),
    [selectedDate, horariosLoja, agsFiltrados, bloqueiosFiltrados, nowMs]
  );

  const firstPendingSettlement = useMemo(() => {
    const found = items.find((item) => item.kind === "agendamento" && item.aguardandoBaixa);
    return found && found.kind === "agendamento" ? found.agendamento : null;
  }, [items]);

  const progressPct =
    metrics.totalAgendados > 0
      ? Math.round((metrics.concluidos / metrics.totalAgendados) * 100)
      : 0;

  function openEncaixeAt(hora?: string) {
    const dataAlvo = selectedDate < todayYmd ? todayYmd : selectedDate;
    setEncData(dataAlvo);
    if (hora) {
      setEncHora(hora);
    } else if (dataAlvo === todayYmd) {
      setEncHora(agoraHm);
    }
    if (filtroProf !== "todos") setEncProfId(filtroProf);
    setEncaixeOpen(true);
  }

  function handleQuickStatus(
    agId: string,
    status: "confirmado" | "concluido" | "no_show" | "cancelado"
  ) {
    startTransition(async () => {
      const res = await atualizarStatusAgendamentoAction({
        agendamento_id: agId,
        loja_id: lojaId,
        status,
      });
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      showToast(
        status === "concluido"
          ? "Atendimento concluído!"
          : status === "no_show"
            ? "Marcado como não compareceu."
            : "Agendamento cancelado.",
        "success"
      );
      setOpenMenuId(null);
      router.refresh();
    });
  }

  function handleCriarEncaixe(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await criarEncaixeManualAction({
        loja_id: lojaId,
        profissional_id: encProfId,
        servicos_ids: encServicos,
        inicio_iso: `${encData}T${encHora}:00-03:00`,
        cliente_nome: encNome,
        cliente_whatsapp: encWhatsapp,
      });
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      showToast("Encaixe salvo na agenda.", "success");
      setEncNome("");
      setEncWhatsapp("");
      setEncaixeOpen(false);
      router.refresh();
    });
  }

  const agoraHm = msToSaoPauloHm(nowMs);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Date & Staff Sub-header Filter (Stitch) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => setSelectedDate((d) => addDaysYmd(d, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)] transition-colors hover:opacity-80"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(todayYmd)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--zelo-card)] px-3 text-xs font-semibold text-[var(--zelo-ink)] shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5 text-[var(--zelo-muted)]" />
            <span>{formatDateLabel(selectedDate, todayYmd)}</span>
          </button>

          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => setSelectedDate((d) => addDaysYmd(d, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)] transition-colors hover:opacity-80"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {isOwner && profissionais.length > 1 && (
          <select
            aria-label="Filtrar profissional"
            value={filtroProf}
            onChange={(e) => setFiltroProf(e.target.value)}
            className="h-9 max-w-[130px] truncate rounded-lg bg-[var(--zelo-card)] px-2.5 text-xs font-semibold text-[var(--zelo-ink)] shadow-sm outline-none"
          >
            <option value="todos">Todos</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Operational Alert Banner: Pending settlements */}
      {metrics.aguardandoBaixa > 0 && firstPendingSettlement && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FEF3C7] p-3.5 text-[#92400E] shadow-sm dark:bg-[#451A03]/80 dark:text-[#FDE68A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FDE68A] text-[#B45309] dark:bg-[#78350F] dark:text-[#FBBF24]">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#78350F] dark:text-[#FEF3C7]">
                {metrics.aguardandoBaixa}{" "}
                {metrics.aguardandoBaixa === 1 ? "atendimento" : "atendimentos"}
              </span>
              <span className="text-[11px]">Aguardando baixa no sistema</span>
            </div>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleQuickStatus(firstPendingSettlement.id, "concluido")}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg bg-[#78350F] px-3 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95 dark:bg-[#F59E0B] dark:text-[#111111]"
          >
            <span>Dar Baixa</span>
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Daily Pulse Metrics (Bento-style 3-card grid) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col justify-between rounded-xl bg-[var(--zelo-card)] p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-[var(--zelo-muted)]">Agendados</span>
            <Users className="h-3.5 w-3.5 text-[var(--zelo-muted)]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono-num text-base font-bold text-[var(--zelo-ink)]">
              {metrics.totalAgendados}
            </span>
            <span className="text-[11px] text-[var(--zelo-muted)]">
              {metrics.totalAgendados === 1 ? "cliente" : "clientes"}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--zelo-soft)]">
            <div
              className="h-full rounded-full bg-[var(--zelo-btn-bg)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-[var(--zelo-card)] p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-[var(--zelo-muted)]">Livre Hoje</span>
            <Clock className="h-3.5 w-3.5 text-[var(--zelo-muted)]" />
          </div>
          <span className="font-mono-num text-base font-bold text-[var(--zelo-ink)]">
            {diaAberto ? formatDurationHuman(metrics.minutosLivres) : "Fechado"}
          </span>
          <span className="mt-2 font-mono-num text-[10px] text-[var(--zelo-muted)]">
            {diaAberto ? `${metrics.slotsLivresCount} espaços` : "Sem expediente"}
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-[var(--zelo-card)] p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-[var(--zelo-muted)]">Estimado</span>
            <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />
          </div>
          <span className="font-mono-num text-base font-bold text-[var(--zelo-ink)]">
            {formatBRLShort(metrics.estimadoCentavos)}
          </span>
          <span className="mt-2 font-mono-num text-[10px] font-medium text-[#10B981]">
            {metrics.concluidos} concluído(s)
          </span>
        </div>
      </div>

      {/* Section Header with Real-time Clock Indicator */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-[var(--zelo-muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--zelo-muted)]">
            Grade de Horários
          </h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-2.5 py-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EF4444]" />
          <span className="font-mono-num text-[11px] font-semibold text-[var(--zelo-ink)]">
            {agoraHm} Agora
          </span>
        </div>
      </div>

      {/* Stitch Visual Timeline */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-card)] p-8 text-center shadow-sm">
          <Calendar className="h-7 w-7 text-[var(--zelo-muted)]" />
          <p className="text-sm font-semibold">Estabelecimento fechado neste dia</p>
          <p className="text-xs text-[var(--zelo-muted)]">
            Ajuste os horários de expediente em Gestão ou faça um encaixe manual.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item, idx) => {
            if (item.kind === "agora") {
              return (
                <div key={`agora-${idx}`} className="relative my-1 flex items-center py-1">
                  <div className="flex w-12 shrink-0 items-center justify-end pr-2">
                    <span className="rounded bg-[#FEE2E2] px-1 font-mono-num text-[11px] font-bold text-[#EF4444] dark:bg-[#450A0A]">
                      {item.hora}
                    </span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div className="-ml-1 h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-4 ring-[#FEE2E2] dark:ring-[#450A0A]" />
                    <div className="h-[2px] flex-1 rounded-full bg-[#EF4444]" />
                  </div>
                </div>
              );
            }

            if (item.kind === "bloqueio") {
              return (
                <div key={`blk-${item.id}-${idx}`} className="flex gap-2.5">
                  <div className="flex w-12 shrink-0 flex-col items-end pt-1">
                    <span className="font-mono-num text-xs font-semibold text-[var(--zelo-muted)]">
                      {item.horaInicio}
                    </span>
                    <span className="font-mono-num text-[10px] text-[var(--zelo-muted)]/60">
                      {item.horaFim}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center justify-between rounded-xl bg-[var(--zelo-soft)] p-3 shadow-xs">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-card)] text-[var(--zelo-muted)]">
                        {item.id === "almoco" ? (
                          <Utensils className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-[var(--zelo-ink)]">
                            {item.titulo}
                          </span>
                          <span className="shrink-0 rounded-full bg-[var(--zelo-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--zelo-muted)]">
                            Bloqueio
                          </span>
                        </div>
                        <span className="font-mono-num text-[11px] text-[var(--zelo-muted)]">
                          {item.subtitulo}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (item.kind === "livre") {
              return (
                <div key={`livre-${item.horaInicio}-${idx}`} className="flex gap-2.5">
                  <div className="flex w-12 shrink-0 flex-col items-end pt-1">
                    <span className="font-mono-num text-xs font-medium text-[var(--zelo-muted)]">
                      {item.horaInicio}
                    </span>
                    <span className="font-mono-num text-[10px] text-[var(--zelo-muted)]/60">
                      {item.horaFim}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2 rounded-xl bg-[var(--zelo-card)] p-3.5 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
                        <PlusCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-[var(--zelo-ink)]">
                          Horário Disponível
                        </span>
                        <span className="font-mono-num text-[11px] text-[var(--zelo-muted)]">
                          {item.duracaoMin} min livres
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEncaixeAt(item.horaInicio)}
                      className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] transition-colors hover:opacity-80"
                    >
                      <span>Encaixar</span>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            const ag = item.agendamento;
            const isConcluido = ag.status === "concluido";
            const isNoShow = ag.status === "no_show";
            const isBaixa = item.aguardandoBaixa;
            const barColor = isConcluido
              ? "bg-[#10B981]"
              : isBaixa
                ? "bg-[#F59E0B]"
                : isNoShow
                  ? "bg-red-500"
                  : "bg-[var(--zelo-btn-bg)]";

            const phoneDigits = ag.cliente_whatsapp
              ? ag.cliente_whatsapp.replace(/\D/g, "")
              : "";
            const whatsappUrl =
              phoneDigits.length >= 10
                ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}?text=${encodeURIComponent(
                    `Olá ${ag.cliente_nome}! Confirmando seu horário às ${item.horaInicio}.`
                  )}`
                : null;
            const telUrl =
              phoneDigits.length >= 10
                ? `tel:${phoneDigits.startsWith("55") ? `+${phoneDigits}` : `+55${phoneDigits}`}`
                : null;

            return (
              <div key={ag.id} className="flex gap-2.5">
                <div className="flex w-12 shrink-0 flex-col items-end pt-1">
                  <span className="font-mono-num text-xs font-semibold text-[var(--zelo-ink)]">
                    {item.horaInicio}
                  </span>
                  <span className="font-mono-num text-[10px] text-[var(--zelo-muted)]/60">
                    {item.horaFim}
                  </span>
                </div>

                <div
                  className={`relative flex-1 rounded-xl bg-[var(--zelo-card)] p-3.5 shadow-sm ${
                    openMenuId === ag.id ? "z-30" : ""
                  }`}
                >
                  <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl ${barColor}`} />

                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold tracking-tight text-[var(--zelo-ink)]">
                          {ag.cliente_nome}
                        </span>
                        {isConcluido && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                            <CheckCheck className="h-3 w-3" />
                            Finalizado
                          </span>
                        )}
                        {isBaixa && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309] dark:bg-[#451A03] dark:text-[#FBBF24]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                            Aguardando Baixa
                          </span>
                        )}
                        {!isConcluido && !isBaixa && !isNoShow && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                            <BadgeCheck className="h-3 w-3" />
                            {ag.sinal_centavos > 0 ? "Sinal Confirmado" : "Confirmado"}
                          </span>
                        )}
                        {isNoShow && (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                            Faltou
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--zelo-muted)]">
                        {ag.servicos_resumo}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      <span className="font-mono-num text-sm font-bold text-[var(--zelo-ink)]">
                        {formatBRL(ag.total_centavos)}
                      </span>
                      <span className="font-mono-num text-[10px] text-[var(--zelo-muted)]">
                        {item.duracaoMin} min
                      </span>
                    </div>
                  </div>

                  {ag.sinal_centavos > 0 && (
                    <div className="mt-2 ml-1 flex items-center justify-between rounded-lg bg-[var(--zelo-soft)] px-2.5 py-1.5 text-[11px]">
                      <span className="flex items-center gap-1 text-[var(--zelo-muted)]">
                        <QrCode className="h-3.5 w-3.5 text-[#10B981]" />
                        Sinal {formatBRL(ag.sinal_centavos)} via PIX
                      </span>
                      <span className="font-mono-num font-bold text-[var(--zelo-ink)]">
                        Resta {formatBRL(Math.max(0, ag.total_centavos - ag.sinal_centavos))}
                      </span>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between gap-2 pl-1">
                    {isBaixa ? (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleQuickStatus(ag.id, "concluido")}
                          className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] transition-transform active:scale-95"
                        >
                          <span>Dar Baixa</span>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((prev) => (prev === ag.id ? null : ag.id))
                            }
                            aria-expanded={openMenuId === ag.id}
                            className="flex min-h-[36px] items-center gap-1 rounded-lg bg-[var(--zelo-soft)] px-3 text-xs font-medium text-[var(--zelo-ink)]"
                          >
                            <span>Gerenciar</span>
                            <MoreVertical className="h-3.5 w-3.5 text-[var(--zelo-muted)]" />
                          </button>

                          {openMenuId === ag.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="zelo-pop-in absolute right-0 bottom-full mb-1.5 z-40 w-48 rounded-2xl bg-[var(--zelo-card)] p-1.5 shadow-xl ring-1 ring-black/10 dark:ring-white/10 space-y-0.5">
                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpenMenuId(null)}
                                    className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#10B981] hover:bg-[var(--zelo-soft)]"
                                  >
                                    <MessageCircle className="h-4 w-4 shrink-0" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                                {telUrl && (
                                  <a
                                    href={telUrl}
                                    onClick={() => setOpenMenuId(null)}
                                    className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[var(--zelo-ink)] hover:bg-[var(--zelo-soft)]"
                                  >
                                    <Phone className="h-4 w-4 shrink-0" />
                                    <span>Ligar ({formatBrazilPhone(phoneDigits)})</span>
                                  </a>
                                )}
                                {(isNoShow || isConcluido || ag.status === "cancelado") && (
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleQuickStatus(ag.id, "confirmado")}
                                    className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#F59E0B] hover:bg-[var(--zelo-soft)]"
                                  >
                                    <RotateCcw className="h-4 w-4 shrink-0" />
                                    <span>Voltar p/ Confirmado</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleQuickStatus(ag.id, "concluido")}
                                  className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#10B981] hover:bg-[var(--zelo-soft)]"
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>Concluir</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleQuickStatus(ag.id, "no_show")}
                                  className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[var(--zelo-ink)] hover:bg-[var(--zelo-soft)]"
                                >
                                  <UserX className="h-4 w-4 shrink-0" />
                                  <span>Faltou</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleQuickStatus(ag.id, "cancelado")}
                                  className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                                >
                                  <XCircle className="h-4 w-4 shrink-0" />
                                  <span>Cancelar</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--zelo-muted)]">
                          <User className="h-3.5 w-3.5" />
                          <span>{ag.profissional_nome}</span>
                          {ag.origem === "manual" && (
                            <span className="rounded bg-[var(--zelo-soft)] px-1.5 py-0.5 font-mono-num text-[10px]">
                              Balcão
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center gap-1.5">
                          {telUrl && (
                            <a
                              href={telUrl}
                              title={`Ligar para ${formatBrazilPhone(phoneDigits)}`}
                              aria-label={`Ligar para ${ag.cliente_nome}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)] hover:opacity-80"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#25D366]/15 px-2.5 text-[11px] font-semibold text-[#10B981]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((prev) => (prev === ag.id ? null : ag.id))
                            }
                            aria-expanded={openMenuId === ag.id}
                            aria-label="Mais opções"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openMenuId === ag.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 bottom-full mb-1.5 z-40 w-44 rounded-2xl bg-[var(--zelo-card)] p-1.5 shadow-xl ring-1 ring-black/10 dark:ring-white/10 space-y-0.5">
                                {(isNoShow || isConcluido || ag.status === "cancelado") && (
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleQuickStatus(ag.id, "confirmado")}
                                    className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#F59E0B] hover:bg-[var(--zelo-soft)]"
                                  >
                                    <RotateCcw className="h-4 w-4 shrink-0" />
                                    <span>Voltar p/ Confirmado</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleQuickStatus(ag.id, "concluido")}
                                  className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#10B981] hover:bg-[var(--zelo-soft)]"
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>Concluir</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleQuickStatus(ag.id, "no_show")}
                                  className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[var(--zelo-ink)] hover:bg-[var(--zelo-soft)]"
                                >
                                  <UserX className="h-4 w-4 shrink-0" />
                                  <span>Faltou</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleQuickStatus(ag.id, "cancelado")}
                                  className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                                >
                                  <XCircle className="h-4 w-4 shrink-0" />
                                  <span>Cancelar</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* End of Day Milestone Card */}
      {diaAberto && metrics.fimExpedienteHm && (
        <div className="flex items-center gap-3 rounded-xl bg-[var(--zelo-soft)] p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--zelo-card)] text-[var(--zelo-ink)]">
            <Flag className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--zelo-ink)]">
              Fim do expediente às {metrics.fimExpedienteHm}
            </span>
            <span className="text-[11px] text-[var(--zelo-muted)]">
              {metrics.concluidos} de {metrics.totalAgendados} atendimento(s) concluídos.
            </span>
          </div>
        </div>
      )}

      {/* Floating + Encaixe CTA (Stitch) */}
      <button
        type="button"
        onClick={() => openEncaixeAt()}
        disabled={servicos.length === 0 || profissionais.length === 0}
        className="fixed right-4 bottom-20 z-40 flex min-h-[46px] items-center gap-1.5 rounded-full bg-[var(--zelo-btn-bg)] px-5 text-sm font-semibold text-[var(--zelo-btn-ink)] shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-transform active:scale-95 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        <span>Encaixe</span>
      </button>

      {/* Modal de Encaixe Manual (Balcão) */}
      <BottomSheet
        open={encaixeOpen}
        onClose={() => setEncaixeOpen(false)}
        title="Encaixe Rápido (Balcão)"
        maxWidth="md"
      >
        <form onSubmit={handleCriarEncaixe} className="space-y-3">

            <input
              type="text"
              required
              minLength={2}
              value={encNome}
              onChange={(e) => setEncNome(e.target.value)}
              placeholder="Nome do cliente"
              className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm outline-none"
            />

            <input
              type="tel"
              value={encWhatsapp}
              onChange={(e) => setEncWhatsapp(e.target.value)}
              placeholder="WhatsApp (opcional)"
              className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 font-mono-num text-sm outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                min={todayYmd}
                value={encData}
                onChange={(e) => setEncData(e.target.value)}
                className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 font-mono-num text-xs outline-none"
              />
              <input
                type="time"
                required
                min={encData === todayYmd ? agoraHm : undefined}
                value={encHora}
                onChange={(e) => setEncHora(e.target.value)}
                className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 font-mono-num text-xs outline-none"
              />
            </div>

            {profissionais.length > 1 && (
              <select
                value={encProfId}
                onChange={(e) => setEncProfId(e.target.value)}
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-medium outline-none"
              >
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            )}

            <div className="flex flex-wrap gap-1.5">
              {servicos.map((s) => {
                const active = encServicos.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setEncServicos((prev) =>
                        prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                      )
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      active
                        ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                        : "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]"
                    }`}
                  >
                    {s.nome}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isPending || encServicos.length === 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Salvar Encaixe</span>
            </button>
        </form>
      </BottomSheet>
    </div>
  );
}
