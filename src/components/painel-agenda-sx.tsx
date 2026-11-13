"use client";

import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createViewDay, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import {
  atualizarStatusAgendamentoAction,
  criarEncaixeManualAction,
} from "@/app/painel/actions";
import { showToast } from "@/components/zelo-toast";

export interface AgendaAgendamentoItem {
  id: string;
  profissional_id: string;
  profissional_nome: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  inicio: string;
  fim: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado" | "no_show";
  total_centavos: number;
  origem: "online" | "manual";
}

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

const PRO_PALETTE = [
  { main: "#F59E0B", container: "#FEF3C7", onContainer: "#78350F" },
  { main: "#10B981", container: "#D1FAE5", onContainer: "#064E3B" },
  { main: "#3B82F6", container: "#DBEAFE", onContainer: "#1E3A8A" },
  { main: "#EC4899", container: "#FCE7F3", onContainer: "#831843" },
  { main: "#8B5CF6", container: "#EDE9FE", onContainer: "#4C1D95" },
];

function toTemporalZdt(iso: string) {
  return Temporal.Instant.from(iso).toZonedDateTimeISO("America/Sao_Paulo");
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getTodayYmdSaoPaulo() {
  const sp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sp.getUTCFullYear()}-${pad(sp.getUTCMonth() + 1)}-${pad(sp.getUTCDate())}`;
}

export function PainelAgendaSX({
  lojaId,
  isOwner,
  agendamentos,
  profissionais,
  servicos,
}: {
  lojaId: string;
  isOwner: boolean;
  agendamentos: AgendaAgendamentoItem[];
  profissionais: AgendaProfissionalItem[];
  servicos: AgendaServicoItem[];
}) {
  const router = useRouter();
  const [filtroProf, setFiltroProf] = useState<string>("todos");
  const [selectedEvent, setSelectedEvent] = useState<AgendaAgendamentoItem | null>(null);
  const [encaixeOpen, setEncaixeOpen] = useState(false);

  // Encaixe rápido state
  const [encNome, setEncNome] = useState("");
  const [encWhatsapp, setEncWhatsapp] = useState("");
  const [encProfId, setEncProfId] = useState(profissionais[0]?.id ?? "");
  const [encData, setEncData] = useState(getTodayYmdSaoPaulo);
  const [encHora, setEncHora] = useState("14:00");
  const [encServicos, setEncServicos] = useState<string[]>(() =>
    servicos[0]?.id ? [servicos[0].id] : []
  );
  const [isPending, startTransition] = useTransition();

  const eventosVisiveis = useMemo(() => {
    return agendamentos.filter((a) => {
      if (a.status === "cancelado") return false;
      if (filtroProf !== "todos" && a.profissional_id !== filtroProf) return false;
      return true;
    });
  }, [agendamentos, filtroProf]);

  const calendarsMap = useMemo(() => {
    const map: Record<
      string,
      {
        colorName: string;
        lightColors: { main: string; container: string; onContainer: string };
      }
    > = {};
    profissionais.forEach((p, idx) => {
      const pal = PRO_PALETTE[idx % PRO_PALETTE.length];
      map[p.id] = {
        colorName: `pro_${idx}`,
        lightColors: pal,
      };
    });
    return map;
  }, [profissionais]);

  const sxEvents = useMemo(
    () =>
      eventosVisiveis.map((a) => ({
        id: a.id,
        title: `${a.cliente_nome} (${formatBRL(a.total_centavos)})`,
        start: toTemporalZdt(a.inicio),
        end: toTemporalZdt(a.fim),
        calendarId: calendarsMap[a.profissional_id] ? a.profissional_id : undefined,
      })),
    [eventosVisiveis, calendarsMap]
  );

  const [eventsService] = useState(() => createEventsServicePlugin());

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek()],
    defaultView: "day",
    locale: "pt-BR",
    firstDayOfWeek: 1,
    dayBoundaries: { start: "07:00", end: "22:00" },
    calendars: calendarsMap,
    events: sxEvents,
    plugins: [eventsService],
    callbacks: {
      onEventClick(event) {
        const found = agendamentos.find((a) => a.id === String(event.id));
        if (found) setSelectedEvent(found);
      },
    },
  });

  useEffect(() => {
    eventsService.set(sxEvents);
  }, [eventsService, sxEvents]);

  function handleStatus(status: "concluido" | "no_show" | "cancelado") {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await atualizarStatusAgendamentoAction({
        agendamento_id: selectedEvent.id,
        loja_id: lojaId,
        status,
      });
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      showToast("Status atualizado.", "success");
      setSelectedEvent(null);
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

  return (
    <section className="space-y-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">Agenda do Dia</h2>
          <p className="text-[11px] text-[var(--zelo-muted)]">
            {eventosVisiveis.length} horário(s) ativos
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEncaixeOpen(true)}
          disabled={servicos.length === 0 || profissionais.length === 0}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3.5 text-xs font-semibold text-[var(--zelo-btn-ink)] shadow-xs transition-transform active:scale-95 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Encaixe</span>
        </button>
      </div>

      {isOwner && profissionais.length > 1 && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFiltroProf("todos")}
            className={`h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${
              filtroProf === "todos"
                ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                : "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]"
            }`}
          >
            Todos
          </button>
          {profissionais.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFiltroProf(p.id)}
              className={`h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${
                filtroProf === p.id
                  ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                  : "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      <div className="sx-react-calendar-wrapper overflow-hidden rounded-xl">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>

      {/* Modal de Ações do Agendamento */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="w-full max-w-[440px] space-y-4 rounded-t-2xl bg-[var(--zelo-card)] p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">{selectedEvent.cliente_nome}</h3>
                <p className="mt-0.5 font-mono-num text-xs text-[var(--zelo-muted)]">
                  {new Date(selectedEvent.inicio).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • {selectedEvent.profissional_nome} • {formatBRL(selectedEvent.total_centavos)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--zelo-soft)]"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedEvent.cliente_whatsapp && (
              <a
                href={`https://wa.me/55${selectedEvent.cliente_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Olá ${selectedEvent.cliente_nome}! Confirmando seu horário.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981]/15 text-xs font-semibold text-[#10B981]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chamar no WhatsApp</span>
              </a>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatus("concluido")}
                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[#10B981] text-xs font-semibold text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Concluir</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatus("no_show")}
                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[var(--zelo-soft)] text-xs font-semibold text-[var(--zelo-ink)]"
              >
                <UserX className="h-4 w-4" />
                <span>Faltou</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatus("cancelado")}
                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-red-500/15 text-xs font-semibold text-red-500"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Encaixe Manual (Balcão) */}
      {encaixeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4">
          <form
            onSubmit={handleCriarEncaixe}
            className="w-full max-w-[440px] space-y-3 rounded-t-2xl bg-[var(--zelo-card)] p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Encaixe Rápido (Balcão)</h3>
              <button
                type="button"
                onClick={() => setEncaixeOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--zelo-soft)]"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                value={encData}
                onChange={(e) => setEncData(e.target.value)}
                className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 font-mono-num text-xs outline-none"
              />
              <input
                type="time"
                required
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
        </div>
      )}
    </section>
  );
}
