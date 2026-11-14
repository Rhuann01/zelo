"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  Phone,
  Scissors,
  ShieldCheck,
  Store,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import {
  criarAgendamentoAction,
  getSlotsDisponiveisAction,
} from "@/app/[slug]/actions";
import {
  formatBrazilPhone,
  isValidBrazilPhone,
} from "@/lib/schemas/agendamento";
import type { SlotDisponivel } from "@/lib/booking/disponibilidade";
import type {
  LojaPublica,
  ProfissionalPublico,
  ServicoPublico,
} from "@/lib/public/get-loja-publica";
import { useViewerPerfil } from "@/lib/supabase/use-viewer-perfil";

function formatPrice(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

type TurnoFilter = "todos" | "manha" | "tarde" | "noite";

function getTurno(hora: string): Exclude<TurnoFilter, "todos"> {
  const h = Number(hora.slice(0, 2));
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}

const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
const WEEK_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

interface DayItem {
  ymd: string;
  weekShort: string;
  dayNum: string;
  isToday: boolean;
  isOpen: boolean;
}

function getNext15DaysSaoPaulo(
  horariosLoja: Record<string, unknown> | undefined
): DayItem[] {
  const days: DayItem[] = [];
  const nowSp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let i = 0; i < 15; i++) {
    const d = new Date(nowSp.getTime() + i * 86_400_000);
    const ymd = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const dow = d.getUTCDay();
    const dayKey = DAY_KEYS[dow];
    const cfg = horariosLoja?.[dayKey] as { ativo?: boolean } | undefined;
    const isOpen = cfg?.ativo !== false;

    days.push({
      ymd,
      weekShort: WEEK_NAMES[dow] ?? "Dia",
      dayNum: pad(d.getUTCDate()),
      isToday: i === 0,
      isOpen,
    });
  }
  return days;
}

function formatMonthTitle(ymd: string) {
  if (!ymd) return "";
  const [year, month] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 15));
  const raw = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function ReservaDrawer({
  open,
  onClose,
  loja,
  selecionados,
  totalDuracao,
  totalCentavos,
  profissionais,
  selectedProfId,
  onSelectProf,
  isBrutal,
  cardSurfaceStyle,
  whatsappFallbackHref,
}: {
  open: boolean;
  onClose: () => void;
  loja: LojaPublica;
  selecionados: ServicoPublico[];
  totalDuracao: number;
  totalCentavos: number;
  profissionais: ProfissionalPublico[];
  selectedProfId: string;
  onSelectProf: (id: string) => void;
  isBrutal: boolean;
  cardSurfaceStyle: React.CSSProperties;
  whatsappFallbackHref: string | null;
}) {
  const days = useMemo(
    () => getNext15DaysSaoPaulo(loja.horarios_loja),
    [loja.horarios_loja]
  );
  const firstOpenDay = useMemo(
    () => days.find((d) => d.isOpen)?.ymd ?? days[0]?.ymd ?? "",
    [days]
  );
  const [dayPage, setDayPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(firstOpenDay);
  const [turno, setTurno] = useState<TurnoFilter>("todos");
  const [showProfPicker, setShowProfPicker] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const [slots, setSlots] = useState<SlotDisponivel[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponivel | null>(null);

  const { viewer, refreshViewer } = useViewerPerfil();
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [paraOutro, setParaOutro] = useState(false);
  const [beneficiarioNome, setBeneficiarioNome] = useState("");
  const [beneficiarioWhatsapp, setBeneficiarioWhatsapp] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    agendamento_id: string;
    inicio: string;
    total_centavos: number;
    sinal_centavos: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (viewer?.whatsapp && !whatsappCliente) {
      setWhatsappCliente(viewer.whatsapp);
    }
  }, [viewer, whatsappCliente]);

  useEffect(() => {
    if (!open || !selectedProfId || !selectedDate || totalDuracao <= 0) return;

    let active = true;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);

    getSlotsDisponiveisAction({
      loja_id: loja.id,
      profissional_id: selectedProfId,
      data: selectedDate,
      duracao_total_min: totalDuracao,
    }).then((res) => {
      if (!active) return;
      if (res.error) {
        setSlotsError(res.error);
        setSlots([]);
      } else {
        setSlots(res.slots ?? []);
      }
      setLoadingSlots(false);
    });

    return () => {
      active = false;
    };
  }, [open, loja.id, selectedProfId, selectedDate, totalDuracao]);

  const filteredSlots = useMemo(() => {
    if (turno === "todos") return slots;
    return slots.filter((s) => getTurno(s.hora) === turno);
  }, [slots, turno]);

  const visibleDays = useMemo(() => {
    const start = dayPage * 5;
    return days.slice(start, start + 5);
  }, [days, dayPage]);

  if (!open) return null;

  function handleRequestClose() {
    if (selectedSlot && !confirmed) {
      setShowDiscardConfirm(true);
      return;
    }
    setConfirmed(null);
    setShowDiscardConfirm(false);
    onClose();
  }

  function handleConfirmar() {
    if (!selectedSlot || !selectedProfId) return;
    setSubmitError(null);

    const telefoneFinal = paraOutro
      ? beneficiarioWhatsapp.trim()
      : whatsappCliente.trim();

    if (paraOutro && beneficiarioNome.trim().length < 2) {
      setSubmitError("Informe o nome de quem vai ser atendido.");
      return;
    }

    if (!isValidBrazilPhone(telefoneFinal)) {
      setSubmitError(
        "Informe um WhatsApp válido com DDD (ex: (11) 99999-9999) para o barbeiro conseguir falar com você."
      );
      return;
    }

    startTransition(async () => {
      const res = await criarAgendamentoAction({
        loja_id: loja.id,
        profissional_id: selectedProfId,
        servicos_ids: selecionados.map((s) => s.id),
        inicio_iso: selectedSlot.inicioIso,
        whatsapp_cliente: telefoneFinal,
        beneficiario_nome: paraOutro ? beneficiarioNome.trim() || undefined : undefined,
      });

      if (res.error) {
        setSubmitError(res.error);
        const refreshed = await getSlotsDisponiveisAction({
          loja_id: loja.id,
          profissional_id: selectedProfId,
          data: selectedDate,
          duracao_total_min: totalDuracao,
        });
        setSlots(refreshed.slots ?? []);
        setSelectedSlot(null);
        return;
      }

      if (res.agendamento) {
        await refreshViewer();
        setConfirmed(res.agendamento);
      }
    });
  }

  const profAtual = profissionais.find((p) => p.id === selectedProfId) ?? profissionais[0];
  const servicosResumo =
    selecionados.length === 1
      ? selecionados[0]?.nome
      : `${selecionados[0]?.nome ?? "Serviço"} +${selecionados.length - 1}`;
  const sinalCentavos = Math.min(loja.sinal_centavos ?? 0, totalCentavos);
  const restanteCentavos = Math.max(0, totalCentavos - sinalCentavos);
  const activeStep = confirmed ? 4 : selectedSlot ? 3 : 2;
  const firstSlot = slots[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4">
      <div
        className="relative max-h-[92dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain shadow-2xl"
        style={{
          backgroundColor: "var(--t-bg)",
          color: "var(--t-ink)",
          borderRadius: "24px 24px 0 0",
        }}
      >
        <div className="space-y-3 p-3.5 pb-6">
          {/* Ambient Studio Hint (Discreet Header Banner) */}
          <div
            className="flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5"
            style={{ backgroundColor: "var(--t-inner)" }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs"
                style={{ backgroundColor: "var(--t-card)", color: "var(--t-ink)" }}
              >
                <Store className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold leading-tight">{loja.nome}</p>
                <p
                  className="truncate text-[11px] leading-tight"
                  style={{ color: "var(--t-muted)" }}
                >
                  {[loja.endereco_texto, loja.bairro || loja.cidade]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span>Aberto</span>
            </span>
          </div>

          {/* MAIN STEPPER CARD */}
          <section
            className="overflow-hidden rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
            style={cardSurfaceStyle}
          >
            {/* Stepper Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="font-mono-num text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--t-muted)" }}
                    >
                      Passo {activeStep} de 4
                    </span>
                    <span
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ backgroundColor: "var(--t-muted)" }}
                    />
                    <span className="text-[11px] font-semibold">
                      {confirmed
                        ? "Concluído"
                        : selectedSlot
                          ? "Confirmação"
                          : "Disponibilidade"}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    {confirmed ? "Horário Confirmado" : "Data & Horário"}
                  </h2>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--t-muted)" }}>
                    {confirmed
                      ? "Sua vaga está garantida na agenda."
                      : "Selecione o melhor dia e período para o seu atendimento"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRequestClose}
                  aria-label="Fechar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "var(--t-inner)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 4-Segment Modern Stepper Bar */}
              <div className="mt-4 grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className="h-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        step <= activeStep ? "var(--t-accent)" : "var(--t-inner)",
                    }}
                  />
                ))}
              </div>
            </div>

            {confirmed ? (
              <div className="space-y-4 p-5">
                <div
                  className="flex flex-col items-center gap-2.5 rounded-2xl p-6 text-center"
                  style={{ backgroundColor: "var(--t-inner)" }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                  <p className="text-base font-extrabold">
                    Reserva confirmada em {loja.nome}
                  </p>
                  <p
                    className="font-mono-num text-xs font-medium"
                    style={{ color: "var(--t-muted)" }}
                  >
                    {new Date(confirmed.inicio).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    às{" "}
                    {new Date(confirmed.inicio).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {profAtual?.nome ?? "Profissional"}
                  </p>
                  {confirmed.sinal_centavos > 0 && (
                    <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                      Sinal PIX previsto:{" "}
                      <strong className="font-mono-num" style={{ color: "var(--t-ink)" }}>
                        {formatPrice(confirmed.sinal_centavos)}
                      </strong>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href="/explorar?tab=horarios"
                    className="flex min-h-[46px] w-full items-center justify-center gap-2 text-sm font-bold shadow-sm"
                    style={{
                      borderRadius: "calc(var(--t-radius) * 0.85)",
                      backgroundColor: "var(--t-accent)",
                      color: "var(--t-accent-ink)",
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Ver em Meus Horários</span>
                  </Link>
                  {whatsappFallbackHref && (
                    <a
                      href={whatsappFallbackHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 text-xs font-semibold"
                      style={{
                        borderRadius: "calc(var(--t-radius) * 0.85)",
                        backgroundColor: "var(--t-inner)",
                        color: "var(--t-ink)",
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Falar com a loja no WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ) : profissionais.length === 0 ? (
              <div className="space-y-3 p-5">
                <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                  Este espaço ainda não publicou profissionais com agenda online.
                </p>
                {whatsappFallbackHref && (
                  <a
                    href={whatsappFallbackHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-bold"
                    style={{
                      borderRadius: "calc(var(--t-radius) * 0.85)",
                      backgroundColor: "var(--t-accent)",
                      color: "var(--t-accent-ink)",
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Combinar no WhatsApp</span>
                  </a>
                )}
              </div>
            ) : (
              <>
                {/* SERVICE RECAP CARD */}
                <div
                  className="px-5 py-3.5"
                  style={{ backgroundColor: "var(--t-inner)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                        style={{
                          backgroundColor: "var(--t-accent)",
                          color: "var(--t-accent-ink)",
                        }}
                      >
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-tight">
                          {servicosResumo}
                        </p>
                        <div
                          className="mt-0.5 flex items-center gap-2 font-mono-num text-xs"
                          style={{ color: "var(--t-muted)" }}
                        >
                          <span>{totalDuracao} min</span>
                          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                          <span className="font-bold" style={{ color: "var(--t-ink)" }}>
                            {formatPrice(totalCentavos)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {profAtual && (
                      <button
                        type="button"
                        onClick={() => setShowProfPicker((v) => !v)}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 shadow-xs transition-opacity hover:opacity-85"
                        style={{ backgroundColor: "var(--t-card)" }}
                      >
                        {profAtual.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={profAtual.avatar_url}
                            alt={profAtual.nome}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: "var(--t-accent)",
                              color: "var(--t-accent-ink)",
                            }}
                          >
                            {profAtual.nome.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="max-w-[76px] truncate text-xs font-semibold">
                          {profAtual.nome.split(" ")[0]}
                        </span>
                        {profissionais.length > 1 && (
                          <span
                            className="text-[11px] font-semibold underline underline-offset-2"
                            style={{ color: "var(--t-muted)" }}
                          >
                            Trocar
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expandable Professional Selector */}
                  {showProfPicker && profissionais.length > 1 && (
                    <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                      {profissionais.map((p) => {
                        const active = selectedProfId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectProf(p.id);
                              setShowProfPicker(false);
                            }}
                            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-all"
                            style={{
                              backgroundColor: active
                                ? "var(--t-accent)"
                                : "var(--t-card)",
                              color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                              ...(isBrutal && active ? { border: "2px solid #000000" } : {}),
                            }}
                          >
                            <span>{p.nome}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Immediate Availability Highlight Pill */}
                  {firstSlot && !loadingSlots && (
                    <button
                      type="button"
                      onClick={() => {
                        setTurno("todos");
                        setSelectedSlot(firstSlot);
                      }}
                      className="mt-3 flex w-full items-center justify-between rounded-xl bg-emerald-500/12 px-3 py-2 text-left transition-opacity hover:opacity-90"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white">
                          <Zap className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Próxima vaga disponível
                        </span>
                      </div>
                      <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono-num text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {firstSlot.hora} →
                      </span>
                    </button>
                  )}
                </div>

                {/* DATE SELECTOR SECTION (5-Day Grid like Stitch) */}
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-sm font-bold">
                        {formatMonthTitle(selectedDate)}
                      </h3>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--t-muted)" }}
                      >
                        • Horário de Brasília
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={dayPage === 0}
                        onClick={() => setDayPage((p) => Math.max(0, p - 1))}
                        aria-label="Dias anteriores"
                        className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-35"
                        style={{ backgroundColor: "var(--t-inner)" }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={(dayPage + 1) * 5 >= days.length}
                        onClick={() =>
                          setDayPage((p) => ((p + 1) * 5 < days.length ? p + 1 : p))
                        }
                        aria-label="Próximos dias"
                        className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-35"
                        style={{ backgroundColor: "var(--t-inner)" }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 5-Column Day Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {visibleDays.map((d) => {
                      const active = selectedDate === d.ymd;
                      if (!d.isOpen) {
                        return (
                          <div
                            key={d.ymd}
                            className="flex cursor-not-allowed flex-col items-center rounded-2xl px-1 py-2.5 text-center opacity-45"
                            style={{ backgroundColor: "var(--t-inner)" }}
                          >
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: "var(--t-muted)" }}
                            >
                              {d.weekShort}
                            </span>
                            <span className="my-0.5 font-mono-num text-lg font-bold leading-tight">
                              {d.dayNum}
                            </span>
                            <span
                              className="mt-1 text-[10px] font-medium"
                              style={{ color: "var(--t-muted)" }}
                            >
                              Fechado
                            </span>
                          </div>
                        );
                      }

                      const slotCountLabel = active
                        ? loadingSlots
                          ? "..."
                          : `${slots.length} ${slots.length === 1 ? "vaga" : "vagas"}`
                        : d.isToday
                          ? "Hoje"
                          : "Aberto";

                      return (
                        <button
                          key={d.ymd}
                          type="button"
                          onClick={() => setSelectedDate(d.ymd)}
                          className={`flex flex-col items-center rounded-2xl px-1 py-2.5 text-center transition-all active:scale-95 ${
                            active ? "shadow-md ring-2 ring-offset-2" : ""
                          }`}
                          style={{
                            backgroundColor: active
                              ? "var(--t-accent)"
                              : "var(--t-inner)",
                            color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                            ...(active
                              ? { "--tw-ring-color": "var(--t-accent)" } as React.CSSProperties
                              : {}),
                          }}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                            {d.weekShort}
                          </span>
                          <span className="my-0.5 font-mono-num text-lg font-bold leading-tight">
                            {d.dayNum}
                          </span>
                          <span
                            className={`mt-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${
                              active
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {slotCountLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TIME SHIFTS & SLOTS */}
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--t-muted)" }}
                      >
                        Filtrar por turno
                      </span>

                      <div
                        className="inline-flex rounded-xl p-1"
                        style={{ backgroundColor: "var(--t-inner)" }}
                      >
                        {(
                          [
                            { id: "todos", label: "Todos" },
                            { id: "manha", label: "Manhã" },
                            { id: "tarde", label: "Tarde" },
                            { id: "noite", label: "Noite" },
                          ] as const
                        ).map((t) => {
                          const active = turno === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setTurno(t.id)}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
                              style={{
                                backgroundColor: active ? "var(--t-card)" : "transparent",
                                color: active ? "var(--t-ink)" : "var(--t-muted)",
                              }}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {loadingSlots ? (
                      <div
                        className="flex items-center justify-center gap-2 py-8 text-xs"
                        style={{ color: "var(--t-muted)" }}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Calculando horários disponíveis...</span>
                      </div>
                    ) : slotsError ? (
                      <p className="text-xs font-medium text-red-500">{slotsError}</p>
                    ) : filteredSlots.length === 0 ? (
                      <div
                        className="rounded-2xl p-4 text-center text-xs"
                        style={{
                          backgroundColor: "var(--t-inner)",
                          color: "var(--t-muted)",
                        }}
                      >
                        {slots.length === 0
                          ? "Sem horários disponíveis nesta data. Tente outro dia ou profissional."
                          : "Nenhum horário livre neste turno. Toque em 'Todos' para ver os demais."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {filteredSlots.map((slot) => {
                          const active = selectedSlot?.inicioIso === slot.inicioIso;
                          return (
                            <button
                              key={slot.inicioIso}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`flex h-11 items-center justify-center gap-1 rounded-xl font-mono-num text-xs font-bold transition-all active:scale-95 ${
                                active ? "shadow-sm ring-2 ring-offset-1" : "shadow-xs"
                              }`}
                              style={{
                                backgroundColor: active
                                  ? "var(--t-accent)"
                                  : "var(--t-inner)",
                                color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                                ...(active
                                  ? { "--tw-ring-color": "var(--t-accent)" } as React.CSSProperties
                                  : {}),
                              }}
                            >
                              <span>{slot.hora}</span>
                              {active && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* CUSTOMER DATA SECTION (Always visible like Stitch) */}
                <div
                  className="space-y-3 px-5 py-4"
                  style={{ backgroundColor: "var(--t-inner)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--t-muted)" }}
                      >
                        Seus dados para confirmação
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                        Sem senhas ou cadastros longos
                      </p>
                    </div>
                    {isValidBrazilPhone(whatsappCliente) && (
                      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                        <Check className="h-3 w-3 shrink-0" />
                        <span>WhatsApp Válido</span>
                      </span>
                    )}
                  </div>

                  <div
                    className="flex h-11 items-center gap-2.5 rounded-xl px-3.5"
                    style={{ backgroundColor: "var(--t-card)" }}
                  >
                    <Phone
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--t-muted)" }}
                    />
                    <input
                      type="tel"
                      required
                      value={whatsappCliente}
                      onChange={(e) => setWhatsappCliente(formatBrazilPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-transparent font-mono-num text-sm font-semibold outline-none"
                    />
                    {isValidBrazilPhone(whatsappCliente) && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                  </div>
                  {whatsappCliente.trim().length > 0 && !isValidBrazilPhone(whatsappCliente) && (
                    <p className="text-[11px] font-medium text-amber-500">
                      Digite DDD + 9 dígitos (ex: (11) 99999-9999). Números repetidos são bloqueados.
                    </p>
                  )}

                  {/* Toggle: Book for someone else */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold leading-tight">
                          Agendamento para outra pessoa?
                        </p>
                        <p
                          className="mt-0.5 text-[11px] leading-tight"
                          style={{ color: "var(--t-muted)" }}
                        >
                          O lembrete de confirmação será enviado diretamente ao convidado
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={paraOutro}
                        aria-label="Agendamento para outra pessoa"
                        onClick={() => setParaOutro((v) => !v)}
                        className="flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors"
                        style={{
                          backgroundColor: paraOutro
                            ? "var(--t-accent)"
                            : "rgba(100, 116, 139, 0.35)",
                          borderColor: paraOutro
                            ? "var(--t-accent)"
                            : "rgba(100, 116, 139, 0.45)",
                        }}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                            paraOutro ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {paraOutro && (
                      <div className="mt-3 space-y-2.5">
                        <div>
                          <label
                            className="mb-1 block text-[11px] font-semibold"
                            style={{ color: "var(--t-muted)" }}
                          >
                            Nome do beneficiário
                          </label>
                          <input
                            type="text"
                            value={beneficiarioNome}
                            onChange={(e) => setBeneficiarioNome(e.target.value)}
                            placeholder="Ex: Rodrigo Silveira"
                            className="h-10 w-full rounded-xl px-3 text-xs font-medium outline-none"
                            style={{ backgroundColor: "var(--t-card)" }}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-[11px] font-semibold"
                            style={{ color: "var(--t-muted)" }}
                          >
                            WhatsApp de quem vai comparecer
                          </label>
                          <input
                            type="tel"
                            value={beneficiarioWhatsapp}
                            onChange={(e) =>
                              setBeneficiarioWhatsapp(formatBrazilPhone(e.target.value))
                            }
                            placeholder="(11) 99999-9999"
                            className="h-10 w-full rounded-xl px-3 font-mono-num text-xs outline-none"
                            style={{ backgroundColor: "var(--t-card)" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TRANSPARENT PAYMENT / DEPOSIT POLICY */}
                <div className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Política Transparente de Reserva
                    </h4>
                  </div>
                  <div
                    className="space-y-2.5 rounded-2xl p-3.5"
                    style={{ backgroundColor: "var(--t-inner)" }}
                  >
                    {sinalCentavos > 0 ? (
                      <>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            <span className="font-medium">Sinal de garantia de vaga</span>
                          </div>
                          <span className="shrink-0 whitespace-nowrap font-mono-num font-bold">
                            {formatPrice(sinalCentavos)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: "var(--t-muted)" }}
                            />
                            <span style={{ color: "var(--t-muted)" }}>
                              Restante pago no balcão após o serviço
                            </span>
                          </div>
                          <span
                            className="shrink-0 whitespace-nowrap font-mono-num font-medium"
                            style={{ color: "var(--t-muted)" }}
                          >
                            {formatPrice(restanteCentavos)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          <span className="font-medium">
                            Reserva gratuita — pagamento no local
                          </span>
                        </div>
                        <span className="shrink-0 whitespace-nowrap font-mono-num font-bold">
                          {formatPrice(totalCentavos)}
                        </span>
                      </div>
                    )}

                    <div
                      className="flex items-center justify-between pt-2 text-[11px]"
                      style={{ color: "var(--t-muted)" }}
                    >
                      <span>
                        {sinalCentavos > 0
                          ? "Pagamento do sinal via PIX instantâneo"
                          : "Sem cobrança antecipada"}
                      </span>
                      <span className="font-semibold" style={{ color: "var(--t-ink)" }}>
                        Cancelamento grátis
                      </span>
                    </div>
                  </div>
                  {submitError && (
                    <p className="text-xs font-medium text-red-500">{submitError}</p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Sticky Bottom Ergonomic Footer */}
        {!confirmed && profissionais.length > 0 && (
          <footer
            className="sticky bottom-0 z-20 flex items-center justify-between gap-4 px-5 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
            style={{ backgroundColor: "var(--t-card)" }}
          >
            <div className="flex flex-col">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--t-muted)" }}
              >
                Total do Serviço
              </span>
              <span className="font-mono-num text-xl font-extrabold leading-tight">
                {formatPrice(totalCentavos)}
              </span>
              <span className="text-[10.5px] font-semibold text-emerald-500">
                {sinalCentavos > 0
                  ? `Sinal: ${formatPrice(sinalCentavos)} via PIX`
                  : "Sem taxa de reserva"}
              </span>
            </div>

            {!selectedSlot ? (
              <button
                type="button"
                disabled
                className="flex h-12 flex-1 max-w-[210px] items-center justify-center rounded-2xl text-xs font-bold opacity-50"
                style={{
                  backgroundColor: "var(--t-inner)",
                  color: "var(--t-muted)",
                }}
              >
                Escolha um horário
              </button>
            ) : !viewer ? (
              <Link
                href={`/entrar?next=/${loja.slug}`}
                className="flex h-12 flex-1 max-w-[220px] items-center justify-center gap-2 rounded-2xl px-4 text-xs font-bold shadow-sm transition-transform active:scale-[0.98]"
                style={{
                  backgroundColor: "var(--t-accent)",
                  color: "var(--t-accent-ink)",
                }}
              >
                <UserCheck className="h-4 w-4" />
                <span>Entrar ({selectedSlot.hora})</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmar}
                className="flex h-12 flex-1 max-w-[220px] items-center justify-center gap-2 rounded-2xl px-4 text-xs font-bold shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{
                  backgroundColor: "var(--t-accent)",
                  color: "var(--t-accent-ink)",
                }}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Confirmar Horário</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </footer>
        )}

        {/* Discard Draft Confirmation Sheet */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs sm:items-center">
            <div
              className="w-full max-w-sm rounded-3xl p-5 shadow-2xl"
              style={cardSurfaceStyle}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">Descartar reserva atual?</h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
                Você perderá o horário selecionado das{" "}
                <strong className="font-mono-num" style={{ color: "var(--t-ink)" }}>
                  {selectedSlot?.hora}
                </strong>{" "}
                com {profAtual?.nome ?? "o profissional"}.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="h-11 w-full rounded-xl text-xs font-bold"
                  style={{
                    backgroundColor: "var(--t-accent)",
                    color: "var(--t-accent-ink)",
                  }}
                >
                  Continuar agendamento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    setConfirmed(null);
                    onClose();
                  }}
                  className="h-10 w-full rounded-xl text-xs font-semibold text-red-500"
                  style={{ backgroundColor: "var(--t-inner)" }}
                >
                  Descartar e voltar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
