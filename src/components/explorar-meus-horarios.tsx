"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  History,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Store,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  cancelarOuRemarcarAction,
  getSlotsDisponiveisAction,
} from "@/app/[slug]/actions";
import type { SlotDisponivel } from "@/lib/booking/disponibilidade";
import { buildExternalMapUrl } from "@/components/ui";
import { showToast } from "@/components/zelo-toast";
import type { ViewerPerfil } from "@/lib/supabase/use-viewer-perfil";

interface ClienteAgendamento {
  id: string;
  inicio: string;
  fim: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado" | "no_show";
  total_centavos: number;
  sinal_centavos: number;
  loja: {
    id: string;
    nome: string;
    slug: string;
    bairro: string;
    cidade: string;
    logo_url: string | null;
    cor_primaria: string | null;
    antecedencia_cancel_min: number;
    latitude: number | null;
    longitude: number | null;
    maps_url: string | null;
    endereco_texto: string | null;
  } | null;
  profissional: {
    id: string;
    nome: string;
    cargo: string | null;
    avatar_url: string | null;
  } | null;
  servicos: Array<{ nome: string; duracao_min: number }>;
}

const STATUS_STYLE: Record<
  ClienteAgendamento["status"],
  { label: string; cls: string; dot: string }
> = {
  confirmado: {
    label: "Confirmado",
    cls: "bg-[#10B981]/15 text-[#047857] dark:text-[#34D399]",
    dot: "bg-[#10B981]",
  },
  pendente: {
    label: "Pendente",
    cls: "bg-[#F59E0B]/15 text-[#B45309] dark:text-[#FBBF24]",
    dot: "bg-[#F59E0B]",
  },
  concluido: {
    label: "Concluído",
    cls: "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]",
    dot: "bg-[var(--zelo-muted)]",
  },
  cancelado: {
    label: "Cancelado",
    cls: "bg-red-500/12 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  no_show: {
    label: "Não compareceu",
    cls: "bg-red-500/12 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
};

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatAppointmentDate(iso: string) {
  const d = new Date(iso);
  const week = d
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  const dayMonth = d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    title: `${week.charAt(0).toUpperCase() + week.slice(1)}, ${dayMonth} às ${time}`,
    dateOnly: `${dayMonth}`,
    timeOnly: time,
  };
}

function getRelativeHint(iso: string): string {
  const now = new Date();
  const target = new Date(iso);
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60_000);
  const sameDay =
    now.toDateString() === target.toDateString();

  if (sameDay) {
    if (diffMin <= 0) return "Agora";
    if (diffMin < 60) return `Hoje • Em ${diffMin} min`;
    const hrs = Math.floor(diffMin / 60);
    return `Hoje • Em ${hrs}h`;
  }
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (tomorrow.toDateString() === target.toDateString()) {
    return "Amanhã";
  }
  const days = Math.ceil(diffMin / (60 * 24));
  return days > 0 ? `Em ${days} dias` : "Passado";
}

function formatFreeLimit(inicioIso: string, antecedenciaMin: number) {
  const limit = new Date(new Date(inicioIso).getTime() - antecedenciaMin * 60_000);
  if (limit.getTime() <= Date.now()) return null;
  return limit.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNext14DaysSaoPaulo(): Array<{ ymd: string; week: string; day: string }> {
  const days: Array<{ ymd: string; week: string; day: string }> = [];
  const nowSp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  for (let i = 0; i < 14; i++) {
    const d = new Date(nowSp.getTime() + i * 86_400_000);
    const ymd = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    days.push({
      ymd,
      week: i === 0 ? "Hoje" : weekNames[d.getUTCDay()] ?? "Dia",
      day: pad(d.getUTCDate()),
    });
  }
  return days;
}

const agendamentosCache = new Map<
  string,
  { items: ClienteAgendamento[]; fetchedAt: number }
>();
const AGENDAMENTOS_TTL_MS = 30_000;

export function ExplorarMeusHorarios({
  viewer,
  loaded,
  onGoExplorar,
}: {
  viewer: ViewerPerfil | null;
  loaded: boolean;
  onGoExplorar: () => void;
}) {
  const cached = viewer ? agendamentosCache.get(viewer.id) : undefined;
  const [items, setItems] = useState<ClienteAgendamento[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(() => Boolean(viewer && !cached));
  const [subTab, setSubTab] = useState<"proximos" | "historico">("proximos");
  const [remarcarTarget, setRemarcarTarget] = useState<ClienteAgendamento | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!viewer) return;
    const entry = agendamentosCache.get(viewer.id);
    if (entry) {
      setItems(entry.items);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let active = true;
    const supabase = createClient();
    supabase
      .from("agendamentos")
      .select(
        "id, inicio, fim, status, total_centavos, sinal_centavos, loja:lojas(id, nome, slug, bairro, cidade, logo_url, cor_primaria, antecedencia_cancel_min, latitude, longitude, maps_url, endereco_texto), profissional:profissionais(id, nome, cargo, avatar_url), agendamento_servicos(servico:servicos(nome, duracao_min))"
      )
      .eq("cliente_id", viewer.id)
      .order("inicio", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!active) return;
        const normalized: ClienteAgendamento[] = (data ?? []).map((row) => {
          const lojaRaw = Array.isArray(row.loja) ? row.loja[0] : row.loja;
          const profRaw = Array.isArray(row.profissional)
            ? row.profissional[0]
            : row.profissional;
          const agServsRaw = Array.isArray(row.agendamento_servicos)
            ? row.agendamento_servicos
            : [];
          const servicos = agServsRaw
            .map((item) => {
              const s = Array.isArray(item.servico) ? item.servico[0] : item.servico;
              if (!s) return null;
              return {
                nome: String(s.nome ?? "Atendimento"),
                duracao_min: Number(s.duracao_min ?? 30),
              };
            })
            .filter(Boolean) as Array<{ nome: string; duracao_min: number }>;

          return {
            id: row.id as string,
            inicio: row.inicio as string,
            fim: row.fim as string,
            status: row.status as ClienteAgendamento["status"],
            total_centavos: Number(row.total_centavos ?? 0),
            sinal_centavos: Number(row.sinal_centavos ?? 0),
            loja: lojaRaw
              ? {
                  id: String(lojaRaw.id),
                  nome: String(lojaRaw.nome),
                  slug: String(lojaRaw.slug),
                  bairro: String(lojaRaw.bairro ?? ""),
                  cidade: String(lojaRaw.cidade ?? ""),
                  logo_url: (lojaRaw.logo_url as string | null) ?? null,
                  cor_primaria: (lojaRaw.cor_primaria as string | null) ?? "#111111",
                  antecedencia_cancel_min: Number(
                    lojaRaw.antecedencia_cancel_min ?? 120
                  ),
                  latitude:
                    typeof lojaRaw.latitude === "number" ? lojaRaw.latitude : null,
                  longitude:
                    typeof lojaRaw.longitude === "number" ? lojaRaw.longitude : null,
                  maps_url: (lojaRaw.maps_url as string | null) ?? null,
                  endereco_texto: (lojaRaw.endereco_texto as string | null) ?? null,
                }
              : null,
            profissional: profRaw
              ? {
                  id: String(profRaw.id),
                  nome: String(profRaw.nome),
                  cargo: (profRaw.cargo as string | null) ?? null,
                  avatar_url: (profRaw.avatar_url as string | null) ?? null,
                }
              : null,
            servicos,
          };
        });
        agendamentosCache.set(viewer.id, { items: normalized, fetchedAt: Date.now() });
        setItems(normalized);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [viewer]);

  const { proximos, historico } = useMemo(() => {
    const nowMs = Date.now();
    const prox: ClienteAgendamento[] = [];
    const hist: ClienteAgendamento[] = [];
    for (const ag of items) {
      const isActiveStatus = ag.status === "pendente" || ag.status === "confirmado";
      const isFuture = new Date(ag.fim).getTime() >= nowMs - 30 * 60_000;
      if (isActiveStatus && isFuture) {
        prox.push(ag);
      } else {
        hist.push(ag);
      }
    }
    prox.sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    );
    return { proximos: prox, historico: hist };
  }, [items]);

  function handleCancelar(agId: string) {
    if (!viewer) return;
    startTransition(async () => {
      const res = await cancelarOuRemarcarAction({
        agendamento_id: agId,
        acao: "cancelar",
      });
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      setItems((prev) => {
        const next = prev.map((a) =>
          a.id === agId ? { ...a, status: "cancelado" as const } : a
        );
        agendamentosCache.set(viewer.id, { items: next, fetchedAt: Date.now() });
        return next;
      });
      showToast("Horário cancelado. A vaga foi liberada.", "success");
    });
  }

  function handleRemarcarSuccess(agId: string, novoInicioIso: string, duracaoMin: number) {
    if (!viewer) return;
    const novoFimIso = new Date(
      new Date(novoInicioIso).getTime() + duracaoMin * 60_000
    ).toISOString();
    setItems((prev) => {
      const next = prev.map((a) =>
        a.id === agId ? { ...a, inicio: novoInicioIso, fim: novoFimIso } : a
      );
      agendamentosCache.set(viewer.id, { items: next, fetchedAt: Date.now() });
      return next;
    });
    setRemarcarTarget(null);
    showToast("Horário remarcado com sucesso!", "success");
  }

  if (!loaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-[var(--zelo-card)] p-10 text-center shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--zelo-muted)]" />
        <p className="text-xs text-[var(--zelo-muted)]">Carregando seus horários...</p>
      </div>
    );
  }

  if (!viewer) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-[var(--zelo-card)] p-8 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
          <Calendar className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--zelo-ink)]">
            Entre para ver seus horários
          </p>
          <p className="mt-1 text-xs text-[var(--zelo-muted)]">
            Acompanhe seus agendamentos confirmados, remarque ou cancele em 1 toque.
          </p>
        </div>
        <Link
          href="/entrar?next=/explorar?tab=horarios"
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-5 text-xs font-semibold text-[var(--zelo-btn-ink)]"
        >
          <span>Entrar com Google</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-[var(--zelo-card)] p-8 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
          <Calendar className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--zelo-ink)]">
            Você ainda não marcou nenhum horário
          </p>
          <p className="mt-1 text-xs text-[var(--zelo-muted)]">
            Escolha um estabelecimento na vitrine para reservar em segundos.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoExplorar}
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-5 text-xs font-semibold text-[var(--zelo-btn-ink)]"
        >
          <span>Explorar estabelecimentos</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const visibleList = subTab === "proximos" ? proximos : historico;
  const repeatCandidate = historico[0] ?? proximos[0] ?? null;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header Summary */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">Meus Horários</h1>
          <p className="text-xs text-[var(--zelo-muted)]">
            {proximos.length === 0
              ? "Nenhum agendamento próximo"
              : proximos.length === 1
                ? "1 agendamento ativo"
                : `${proximos.length} agendamentos ativos`}
          </p>
        </div>
      </div>

      {/* Segmented Tabs Control */}
      <div className="flex items-center rounded-xl bg-[var(--zelo-soft)] p-1">
        <button
          type="button"
          onClick={() => setSubTab("proximos")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            subTab === "proximos"
              ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
              : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-[#10B981]" />
          <span>Próximos ({proximos.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab("historico")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            subTab === "historico"
              ? "bg-[var(--zelo-card)] font-bold text-[var(--zelo-ink)] shadow-sm"
              : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
          }`}
        >
          <span>Histórico ({historico.length})</span>
        </button>
      </div>

      {/* Appointments List */}
      {visibleList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-[var(--zelo-card)] p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-[var(--zelo-ink)]">
            {subTab === "proximos"
              ? "Nenhum horário ativo no momento"
              : "Nenhum atendimento no histórico"}
          </p>
          <p className="text-xs text-[var(--zelo-muted)]">
            {subTab === "proximos"
              ? "Que tal agendar um novo horário na vitrine?"
              : "Seus atendimentos concluídos ou cancelados aparecerão aqui."}
          </p>
          {subTab === "proximos" && (
            <button
              type="button"
              onClick={onGoExplorar}
              className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)]"
            >
              <span>Explorar agora</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleList.map((ag) => {
            const badge = STATUS_STYLE[ag.status] ?? STATUS_STYLE.confirmado;
            const dateFmt = formatAppointmentDate(ag.inicio);
            const relHint = getRelativeHint(ag.inicio);
            const isActive = ag.status === "pendente" || ag.status === "confirmado";
            const freeLimit = ag.loja
              ? formatFreeLimit(ag.inicio, ag.loja.antecedencia_cancel_min)
              : null;
            const mapsUrl = ag.loja
              ? buildExternalMapUrl({
                  latitude: ag.loja.latitude,
                  longitude: ag.loja.longitude,
                  mapsUrl: ag.loja.maps_url,
                  addressQuery: [
                    ag.loja.endereco_texto,
                    ag.loja.bairro,
                    ag.loja.cidade,
                  ]
                    .filter(Boolean)
                    .join(", "),
                })
              : null;
            const restanteCentavos = Math.max(
              0,
              ag.total_centavos - ag.sinal_centavos
            );
            const servicoLabel =
              ag.servicos.length > 0
                ? ag.servicos.map((s) => s.nome).join(" + ")
                : "Atendimento agendado";

            return (
              <article
                key={ag.id}
                className="flex flex-col gap-3.5 rounded-3xl bg-[var(--zelo-card)] p-4 shadow-sm"
              >
                {/* Store Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--zelo-soft)]">
                  <Link
                    href={ag.loja?.slug ? `/${ag.loja.slug}` : "/explorar"}
                    className="flex min-w-0 items-center gap-3"
                  >
                    {ag.loja?.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={ag.loja.logo_url}
                        alt={ag.loja.nome}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-xs"
                      />
                    ) : (
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-xs"
                        style={{
                          backgroundColor: ag.loja?.cor_primaria || "#18181D",
                        }}
                      >
                        {ag.loja ? getInitials(ag.loja.nome) : <Store className="h-5 w-5" />}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-extrabold text-[var(--zelo-ink)]">
                        {ag.loja?.nome ?? "Estabelecimento"}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--zelo-muted)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[ag.loja?.bairro, ag.loja?.cidade]
                            .filter(Boolean)
                            .join(" • ") || "Localização da loja"}
                        </span>
                      </p>
                    </div>
                  </Link>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Service, Date & Financial Box */}
                <div className="flex flex-col gap-3 rounded-2xl bg-[var(--zelo-soft)] p-3.5">
                  <div>
                    <p className="text-sm font-bold text-[var(--zelo-ink)]">
                      {servicoLabel}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--zelo-muted)]">
                      {ag.profissional?.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ag.profissional.avatar_url}
                          alt={ag.profissional.nome}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--zelo-card)] text-[10px] font-bold text-[var(--zelo-ink)]">
                          {(ag.profissional?.nome ?? "P").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">
                        Profissional: {ag.profissional?.nome ?? "Equipe"}
                        {ag.profissional?.cargo ? ` (${ag.profissional.cargo})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Date & Time Highlight Subcard */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-card)] p-2.5 shadow-xs">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)]">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono-num text-[13px] font-bold leading-snug text-[var(--zelo-ink)]">
                          {dateFmt.title}
                        </p>
                        <p className="text-[11px] font-semibold text-[#D97706]">
                          {relHint}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="shrink-0 rounded-md bg-[#10B981]/15 px-2 py-1 text-[11px] font-bold text-[#047857] dark:text-[#34D399]">
                        Ativo
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-1.5 border-t border-[var(--zelo-border)]/50 pt-2 text-xs">
                    <div className="flex items-center justify-between text-[var(--zelo-muted)]">
                      <span>Total do serviço</span>
                      <span className="font-mono-num font-semibold text-[var(--zelo-ink)]">
                        {formatBRL(ag.total_centavos)}
                      </span>
                    </div>
                    {ag.sinal_centavos > 0 && (
                      <div className="flex items-center justify-between text-[var(--zelo-muted)]">
                        <div className="flex items-center gap-1.5">
                          <span>Sinal via PIX</span>
                          <span className="rounded bg-[#10B981]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#047857] dark:text-[#34D399]">
                            Previsto
                          </span>
                        </div>
                        <span className="font-mono-num font-semibold text-[#047857] dark:text-[#34D399]">
                          - {formatBRL(ag.sinal_centavos)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-dashed border-[var(--zelo-border)] pt-1.5">
                      <span className="font-semibold text-[var(--zelo-ink)]">
                        Restante no local
                      </span>
                      <span className="font-mono-num text-sm font-extrabold text-[var(--zelo-ink)]">
                        {formatBRL(restanteCentavos)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ergonomic Action Buttons */}
                {isActive ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setRemarcarTarget(ag)}
                      className="flex h-12 w-full items-center justify-between rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-bold text-[var(--zelo-btn-ink)] shadow-sm transition-transform active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span>Remarcar horário</span>
                      </span>
                      {freeLimit && (
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-mono-num text-[11px] font-medium">
                          Grátis até {freeLimit}
                        </span>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] text-xs font-bold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
                        >
                          <Navigation className="h-4 w-4 text-[var(--zelo-muted)]" />
                          <span>Ver no Maps</span>
                        </a>
                      ) : (
                        <Link
                          href={ag.loja?.slug ? `/${ag.loja.slug}` : "/explorar"}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] text-xs font-bold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
                        >
                          <Store className="h-4 w-4 text-[var(--zelo-muted)]" />
                          <span>Ver loja</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleCancelar(ag.id)}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/15 disabled:opacity-50 dark:text-red-400"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  ag.loja?.slug && (
                    <Link
                      href={`/${ag.loja.slug}`}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] text-xs font-bold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
                    >
                      <span>Agendar novamente em {ag.loja.nome}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Quick Repeat Action Card */}
      {repeatCandidate?.loja?.slug && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
              <History className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--zelo-ink)]">
                Repetir último serviço?
              </p>
              <p className="truncate text-[11px] text-[var(--zelo-muted)]">
                {repeatCandidate.servicos[0]?.nome ?? repeatCandidate.loja.nome} com{" "}
                {repeatCandidate.profissional?.nome.split(" ")[0] ?? "a equipe"}
              </p>
            </div>
          </div>
          <Link
            href={`/${repeatCandidate.loja.slug}`}
            className="shrink-0 rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2 text-xs font-bold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
          >
            Pedir
          </Link>
        </div>
      )}

      {/* Reschedule Modal / Drawer */}
      {remarcarTarget && (
        <RemarcarDrawer
          agendamento={remarcarTarget}
          onClose={() => setRemarcarTarget(null)}
          onSuccess={handleRemarcarSuccess}
        />
      )}
    </div>
  );
}

function RemarcarDrawer({
  agendamento,
  onClose,
  onSuccess,
}: {
  agendamento: ClienteAgendamento;
  onClose: () => void;
  onSuccess: (agId: string, novoInicioIso: string, duracaoMin: number) => void;
}) {
  const days = useMemo(() => getNext14DaysSaoPaulo(), []);
  const [selectedDate, setSelectedDate] = useState(days[0]?.ymd ?? "");
  const [slots, setSlots] = useState<SlotDisponivel[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponivel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const duracaoMin = useMemo(() => {
    const sum = agendamento.servicos.reduce((acc, s) => acc + s.duracao_min, 0);
    if (sum > 0) return sum;
    const diff = Math.round(
      (new Date(agendamento.fim).getTime() - new Date(agendamento.inicio).getTime()) /
        60_000
    );
    return Math.max(15, diff || 30);
  }, [agendamento]);

  useEffect(() => {
    if (!agendamento.loja?.id || !agendamento.profissional?.id || !selectedDate) return;
    let active = true;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    getSlotsDisponiveisAction({
      loja_id: agendamento.loja.id,
      profissional_id: agendamento.profissional.id,
      data: selectedDate,
      duracao_total_min: duracaoMin,
    }).then((res) => {
      if (!active) return;
      if (res.error) {
        setError(res.error);
        setSlots([]);
      } else {
        setSlots(res.slots ?? []);
      }
      setLoadingSlots(false);
    });

    return () => {
      active = false;
    };
  }, [agendamento.loja?.id, agendamento.profissional?.id, selectedDate, duracaoMin]);

  function handleConfirmRemarcar() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelarOuRemarcarAction({
        agendamento_id: agendamento.id,
        acao: "remarcar",
        novo_inicio_iso: selectedSlot.inicioIso,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess(agendamento.id, selectedSlot.inicioIso, duracaoMin);
    });
  }

  return (
    <div className="zelo-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="zelo-sheet-up flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-[var(--zelo-card)] shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[var(--zelo-ink)]">
              Remarcar Horário
            </h2>
            <p className="text-xs text-[var(--zelo-muted)]">
              {agendamento.loja?.nome} • {agendamento.profissional?.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--zelo-soft)] text-[var(--zelo-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          {/* Modo Remarcação Banner (Stitch) */}
          <div className="flex items-start gap-3 rounded-2xl bg-[#FEF7EE] p-3.5 text-[#92400E]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDDB8]/80 text-[#9A3412]">
              <Clock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#78350F]">
                  Modo Remarcação
                </span>
                <span className="rounded bg-[#FFEDD5] px-1.5 py-0.5 text-[10px] font-bold text-[#9A3412]">
                  Sem Taxa
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug text-[#92400E]">
                Você pode escolher um novo horário sem custos adicionais. Sua vaga atual só será liberada após confirmar.
              </p>
            </div>
          </div>

          {/* Days Strip */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const active = selectedDate === d.ymd;
              return (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => setSelectedDate(d.ymd)}
                  className={`flex min-w-[62px] shrink-0 flex-col items-center rounded-2xl px-2 py-2.5 text-center transition-all ${
                    active
                      ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                      : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)]"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase opacity-75">
                    {d.week}
                  </span>
                  <span className="font-mono-num text-base font-bold">{d.day}</span>
                </button>
              );
            })}
          </div>

          {/* Available Slots */}
          {loadingSlots ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-[var(--zelo-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Buscando horários livres...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl bg-[var(--zelo-soft)] p-4 text-center text-xs text-[var(--zelo-muted)]">
              Sem horários livres nesta data. Escolha outro dia acima.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const active = selectedSlot?.inicioIso === slot.inicioIso;
                return (
                  <button
                    key={slot.inicioIso}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex h-11 items-center justify-center gap-1 rounded-xl font-mono-num text-xs font-bold transition-all ${
                      active
                        ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                        : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)] hover:bg-[var(--zelo-border)]"
                    }`}
                  >
                    <span>{slot.hora}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-[var(--zelo-soft)] px-5 py-3.5">
          <button
            type="button"
            disabled={!selectedSlot || isPending}
            onClick={handleConfirmRemarcar}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-btn-bg)] text-xs font-bold text-[var(--zelo-btn-ink)] shadow-sm transition-opacity disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>
                  {selectedSlot
                    ? `Confirmar novo horário (${selectedSlot.hora})`
                    : "Selecione um horário"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
