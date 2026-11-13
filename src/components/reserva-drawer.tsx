"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  UserCheck,
  X,
} from "lucide-react";
import {
  criarAgendamentoAction,
  getSlotsDisponiveisAction,
} from "@/app/[slug]/actions";
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

function getNext14DaysSaoPaulo(): Array<{ ymd: string; label: string; sub: string }> {
  const days: Array<{ ymd: string; label: string; sub: string }> = [];
  const nowSp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  for (let i = 0; i < 14; i++) {
    const d = new Date(nowSp.getTime() + i * 86_400_000);
    const ymd = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const label = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : weekNames[d.getUTCDay()];
    const sub = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
    days.push({ ymd, label, sub });
  }
  return days;
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
  const days = useMemo(() => getNext14DaysSaoPaulo(), []);
  const [selectedDate, setSelectedDate] = useState(days[0]?.ymd ?? "");
  const [slots, setSlots] = useState<SlotDisponivel[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponivel | null>(null);

  const { viewer, refreshViewer } = useViewerPerfil();
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [paraOutro, setParaOutro] = useState(false);
  const [beneficiarioNome, setBeneficiarioNome] = useState("");
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

  if (!open) return null;

  function handleConfirmar() {
    if (!selectedSlot || !selectedProfId) return;
    setSubmitError(null);

    startTransition(async () => {
      const res = await criarAgendamentoAction({
        loja_id: loja.id,
        profissional_id: selectedProfId,
        servicos_ids: selecionados.map((s) => s.id),
        inicio_iso: selectedSlot.inicioIso,
        whatsapp_cliente: whatsappCliente.trim() || undefined,
        beneficiario_nome: paraOutro ? beneficiarioNome.trim() || undefined : undefined,
      });

      if (res.error) {
        setSubmitError(res.error);
        // Recarrega os horários caso tenha dado conflito 23P01
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

  const profAtual = profissionais.find((p) => p.id === selectedProfId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4">
      <div
        className="max-h-[90vh] w-full max-w-[480px] space-y-4 overflow-y-auto p-5"
        style={{
          ...cardSurfaceStyle,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">
              {confirmed ? "Horário Confirmado" : "Escolher Horário"}
            </h2>
            <p className="font-mono-num text-xs" style={{ color: "var(--t-muted)" }}>
              {totalDuracao} min • {formatPrice(totalCentavos)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmed(null);
              onClose();
            }}
            aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--t-inner)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmed ? (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center gap-2 p-5 text-center"
              style={{
                backgroundColor: "var(--t-inner)",
                borderRadius: "calc(var(--t-radius) * 0.8)",
              }}
            >
              <CheckCircle2 className="h-10 w-10 text-[#10B981]" />
              <p className="text-sm font-bold">Reserva confirmada em {loja.nome}</p>
              <p className="font-mono-num text-xs" style={{ color: "var(--t-muted)" }}>
                {new Date(confirmed.inicio).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}{" "}
                às{" "}
                {new Date(confirmed.inicio).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                • {profAtual?.nome ?? "Profissional"}
              </p>
              {confirmed.sinal_centavos > 0 && (
                <p className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>
                  Sinal PIX previsto: <strong style={{ color: "var(--t-ink)" }}>{formatPrice(confirmed.sinal_centavos)}</strong>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/explorar"
                className="flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-bold"
                style={{
                  borderRadius: "calc(var(--t-radius) * 0.78)",
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
                    borderRadius: "calc(var(--t-radius) * 0.78)",
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
          <div className="space-y-3">
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
                  borderRadius: "calc(var(--t-radius) * 0.78)",
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
            {/* Profissional */}
            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>
                Profissional
              </span>
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {profissionais.map((p) => {
                  const active = selectedProfId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProf(p.id)}
                      className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-xs font-semibold transition-all"
                      style={{
                        borderRadius: "calc(var(--t-radius) * 0.7)",
                        backgroundColor: active ? "var(--t-accent)" : "var(--t-inner)",
                        color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                        ...(isBrutal && active ? { border: "2px solid #000000" } : {}),
                      }}
                    >
                      <span>{p.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>
                Dia
              </span>
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {days.map((d) => {
                  const active = selectedDate === d.ymd;
                  return (
                    <button
                      key={d.ymd}
                      type="button"
                      onClick={() => setSelectedDate(d.ymd)}
                      className="flex min-h-[48px] shrink-0 flex-col items-center justify-center px-3.5 py-1.5 text-xs transition-all"
                      style={{
                        borderRadius: "calc(var(--t-radius) * 0.7)",
                        backgroundColor: active ? "var(--t-accent)" : "var(--t-inner)",
                        color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                      }}
                    >
                      <span className="font-semibold">{d.label}</span>
                      <span className="font-mono-num text-[10px] opacity-80">{d.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horários */}
            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>
                Horários livres
              </span>
              {loadingSlots ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs" style={{ color: "var(--t-muted)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Calculando horários...</span>
                </div>
              ) : slotsError ? (
                <p className="text-xs text-red-500">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p
                  className="p-3.5 text-xs"
                  style={{
                    backgroundColor: "var(--t-inner)",
                    borderRadius: "calc(var(--t-radius) * 0.7)",
                    color: "var(--t-muted)",
                  }}
                >
                  Sem horários disponíveis nesta data. Tente outro dia ou profissional.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const active = selectedSlot?.inicioIso === slot.inicioIso;
                    return (
                      <button
                        key={slot.inicioIso}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className="flex min-h-[44px] items-center justify-center font-mono-num text-xs font-semibold transition-all"
                        style={{
                          borderRadius: "calc(var(--t-radius) * 0.65)",
                          backgroundColor: active ? "var(--t-accent)" : "var(--t-inner)",
                          color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                        }}
                      >
                        {slot.hora}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirmação */}
            {selectedSlot && (
              <div className="space-y-3 pt-1">
                {!viewer ? (
                  <Link
                    href={`/entrar?next=/${loja.slug}`}
                    className="flex min-h-[46px] w-full items-center justify-center gap-2 text-sm font-bold"
                    style={{
                      borderRadius: "calc(var(--t-radius) * 0.78)",
                      backgroundColor: "var(--t-accent)",
                      color: "var(--t-accent-ink)",
                    }}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Entrar para confirmar ({selectedSlot.hora})</span>
                  </Link>
                ) : (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--t-muted)" }}>
                        Seu WhatsApp para lembretes
                      </span>
                      <div
                        className="flex h-11 items-center gap-2 px-3"
                        style={{
                          backgroundColor: "var(--t-inner)",
                          borderRadius: "calc(var(--t-radius) * 0.65)",
                        }}
                      >
                        <Phone className="h-4 w-4 shrink-0" style={{ color: "var(--t-muted)" }} />
                        <input
                          type="tel"
                          value={whatsappCliente}
                          onChange={(e) => setWhatsappCliente(e.target.value)}
                          placeholder="(31) 99999-8888"
                          className="w-full bg-transparent font-mono-num text-xs outline-none"
                        />
                      </div>
                    </label>

                    <label className="flex items-center gap-2 text-xs" style={{ color: "var(--t-muted)" }}>
                      <input
                        type="checkbox"
                        checked={paraOutro}
                        onChange={(e) => setParaOutro(e.target.checked)}
                      />
                      <span>Agendar para outra pessoa</span>
                    </label>

                    {paraOutro && (
                      <input
                        type="text"
                        value={beneficiarioNome}
                        onChange={(e) => setBeneficiarioNome(e.target.value)}
                        placeholder="Nome de quem será atendido"
                        className="h-11 w-full px-3 text-xs outline-none"
                        style={{
                          backgroundColor: "var(--t-inner)",
                          borderRadius: "calc(var(--t-radius) * 0.65)",
                        }}
                      />
                    )}

                    {submitError && <p className="text-xs font-medium text-red-500">{submitError}</p>}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleConfirmar}
                      className="flex min-h-[46px] w-full items-center justify-center gap-2 text-sm font-bold transition-opacity disabled:opacity-60"
                      style={{
                        borderRadius: "calc(var(--t-radius) * 0.78)",
                        backgroundColor: "var(--t-accent)",
                        color: "var(--t-accent-ink)",
                      }}
                    >
                      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Confirmar às {selectedSlot.hora}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
