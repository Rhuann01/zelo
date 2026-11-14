"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Gift,
  Globe,
  PauseCircle,
  PlayCircle,
  Search,
  Server,
  ShieldCheck,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  EmptyState,
  KpiCard,
  StatusBadge,
  SurfaceCard,
} from "@/components/ui";
import {
  superAdminExtendTrialAction,
  superAdminTogglePausaAction,
} from "@/app/super-admin/actions";
import type {
  SemaforoCor,
  SuperAdminDashboardData,
} from "@/lib/super-admin/metrics";

type TabId = "visao" | "lojas" | "crescimento" | "infra";

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBr(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const SEMAFORO_BADGE: Record<
  SemaforoCor,
  { tone: "emerald" | "amber" | "rose"; label: string }
> = {
  verde: { tone: "emerald", label: "Saudável" },
  amarelo: { tone: "amber", label: "Atenção" },
  vermelho: { tone: "rose", label: "Crítico" },
};

export function SuperAdminDashboard({
  data,
  actorEmail,
}: {
  data: SuperAdminDashboardData;
  actorEmail: string | null;
}) {
  const [tab, setTab] = useState<TabId>("visao");
  const [busca, setBusca] = useState("");
  const [filtroSemaforo, setFiltroSemaforo] = useState<"todos" | SemaforoCor>(
    "todos"
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lojasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.lojas.filter((l) => {
      if (filtroSemaforo !== "todos" && l.semaforo !== filtroSemaforo) {
        return false;
      }
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.slug.toLowerCase().includes(q) ||
        l.cidade.toLowerCase().includes(q)
      );
    });
  }, [data.lojas, busca, filtroSemaforo]);

  const handleTogglePausa = (lojaId: string, nextPausada: boolean) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await superAdminTogglePausaAction({
        lojaId,
        pausada: nextPausada,
      });
      setFeedback(
        res.error ?? (nextPausada ? "Loja pausada." : "Loja reativada.")
      );
    });
  };

  const handleExtendTrial = (lojaId: string, dias: number) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await superAdminExtendTrialAction({ lojaId, dias });
      setFeedback(res.error ?? `Trial estendido em +${dias} dias.`);
    });
  };

  const funilMax = Math.max(1, data.funil14d.cadastradas);

  return (
    <div className="min-h-dvh bg-[var(--zelo-bg)] text-[var(--zelo-ink)] pb-12">
      {/* Header do Fundador */}
      <header className="sticky top-0 z-30 bg-[var(--zelo-bg)]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/painel"
              className="min-h-[40px] min-w-[40px] -ml-1 inline-flex items-center justify-center rounded-full hover:bg-[var(--zelo-soft)]"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <h1 className="text-sm font-bold tracking-tight truncate">
                  Torre de Controle • Zelo
                </h1>
              </div>
              {actorEmail && (
                <p className="text-[11px] font-mono-num text-[var(--zelo-muted)] truncate">
                  {actorEmail}
                </p>
              )}
            </div>
          </div>

          <a
            href="/super-admin/export"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV / IA</span>
          </a>
        </div>

        {/* Navegação por abas */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "visao", label: "Visão Geral", icon: Activity },
              { id: "lojas", label: `Lojas (${data.lojas.length})`, icon: Store },
              { id: "crescimento", label: "Radar & Cidades", icon: TrendingUp },
              { id: "infra", label: "Infra & Logs", icon: Server },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                    : "bg-[var(--zelo-soft)] text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-5">
        {feedback && (
          <SurfaceCard tone="emerald" padding="sm" className="text-xs font-medium">
            {feedback}
          </SurfaceCard>
        )}

        {tab === "visao" && (
          <>
            {/* KPIs principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <KpiCard
                label="MRR Líquido"
                value={formatBRL(data.kpis.mrrLiquidoCentavos)}
                sublabel={`Bruto: ${formatBRL(data.kpis.mrrBrutoCentavos)}`}
                tone="emerald"
              />
              <KpiCard
                label="Lojas Ativas"
                value={data.kpis.lojasAtivas}
                sublabel={`${data.kpis.lojasTrial} em trial`}
              />
              <KpiCard
                label="Conversão Trial"
                value={`${data.kpis.conversaoTrialPct}%`}
                sublabel={`Churn: ${data.kpis.churnPct}%`}
              />
              <KpiCard
                label="Atrasadas"
                value={data.kpis.lojasAtrasadas}
                sublabel={`Total: ${data.kpis.totalLojas} lojas`}
                tone={data.kpis.lojasAtrasadas > 0 ? "rose" : "default"}
              />
            </div>

            {/* Semáforo de Lojas */}
            <SurfaceCard tone="card" padding="md" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Semáforo das Lojas</h2>
                <button
                  type="button"
                  onClick={() => setTab("lojas")}
                  className="text-xs font-semibold text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                >
                  Ver todas
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroSemaforo("verde");
                    setTab("lojas");
                  }}
                  className="rounded-xl bg-emerald-500/10 p-3 text-left"
                >
                  <span className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Saudáveis
                  </span>
                  <span className="mt-1 block font-mono-num text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {data.semaforoResumo.verde}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroSemaforo("amarelo");
                    setTab("lojas");
                  }}
                  className="rounded-xl bg-amber-500/10 p-3 text-left"
                >
                  <span className="block text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Atenção
                  </span>
                  <span className="mt-1 block font-mono-num text-xl font-bold text-amber-600 dark:text-amber-400">
                    {data.semaforoResumo.amarelo}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroSemaforo("vermelho");
                    setTab("lojas");
                  }}
                  className="rounded-xl bg-rose-500/10 p-3 text-left"
                >
                  <span className="block text-[11px] font-medium text-rose-700 dark:text-rose-300">
                    Críticas
                  </span>
                  <span className="mt-1 block font-mono-num text-xl font-bold text-rose-600 dark:text-rose-400">
                    {data.semaforoResumo.vermelho}
                  </span>
                </button>
              </div>
            </SurfaceCard>

            {/* Funil 14 dias */}
            <SurfaceCard tone="card" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Funil de Ativação (14 dias)</h2>
                <span className="text-[11px] font-mono-num text-[var(--zelo-muted)]">
                  Coorte recente
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "1. Cadastradas", val: data.funil14d.cadastradas },
                  { label: "2. Com Serviços", val: data.funil14d.comServicos },
                  {
                    label: "3. Com 1º Agendamento",
                    val: data.funil14d.comPrimeiroAgendamento,
                  },
                  { label: "4. Assinantes Pagos", val: data.funil14d.assinantes },
                ].map((step) => (
                  <div key={step.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{step.label}</span>
                      <span className="font-mono-num font-semibold">{step.val}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--zelo-soft)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--zelo-btn-bg)]"
                        style={{
                          width: `${Math.max(
                            step.val > 0 ? 8 : 0,
                            Math.round((step.val / funilMax) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </>
        )}

        {tab === "lojas" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl bg-[var(--zelo-card)] px-3 h-11">
                <Search className="h-4 w-4 text-[var(--zelo-subtle)] shrink-0" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, @slug ou cidade..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {(["todos", "verde", "amarelo", "vermelho"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFiltroSemaforo(f)}
                    className={`min-h-[44px] rounded-xl px-3 text-xs font-semibold capitalize ${
                      filtroSemaforo === f
                        ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                        : "bg-[var(--zelo-card)] text-[var(--zelo-muted)]"
                    }`}
                  >
                    {f === "todos" ? "Todas" : SEMAFORO_BADGE[f].label}
                  </button>
                ))}
              </div>
            </div>

            {lojasFiltradas.length === 0 ? (
              <EmptyState
                icon={<Store className="h-5 w-5" />}
                title="Nenhuma loja encontrada"
                description="Ajuste a busca ou o filtro do semáforo."
              />
            ) : (
              <div className="space-y-2.5">
                {lojasFiltradas.map((loja) => {
                  const sem = SEMAFORO_BADGE[loja.semaforo];
                  return (
                    <SurfaceCard
                      key={loja.id}
                      tone="card"
                      padding="md"
                      className="space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold truncate">
                              {loja.nome}
                            </span>
                            <StatusBadge tone={sem.tone} dot>
                              {sem.label}
                            </StatusBadge>
                          </div>
                          <p className="text-xs font-mono-num text-[var(--zelo-muted)] mt-0.5">
                            /{loja.slug} • {loja.cidade} ({loja.nicho})
                          </p>
                        </div>
                        <StatusBadge tone="neutral">
                          {loja.plano.toUpperCase()} • {loja.assinatura_status}
                        </StatusBadge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-num text-[var(--zelo-muted)]">
                        <span>{loja.semaforoMotivo}</span>
                        <span>• {loja.servicos_count} serviços</span>
                        <span>• {loja.agendamentos_30d} agend./30d</span>
                        <span>• Trial até {formatDateBr(loja.trial_ate)}</span>
                        {loja.indicacoes_confirmadas > 0 && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Gift className="h-3 w-3" />
                            {loja.indicacoes_confirmadas} ind.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleExtendTrial(loja.id, 7)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-semibold hover:opacity-80 disabled:opacity-50"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>+7d Trial</span>
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleTogglePausa(loja.id, !loja.pausada)}
                          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold disabled:opacity-50 ${
                            loja.pausada
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/12 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {loja.pausada ? (
                            <>
                              <PlayCircle className="h-3.5 w-3.5" />
                              <span>Reativar</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="h-3.5 w-3.5" />
                              <span>Pausar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </SurfaceCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "crescimento" && (
          <SurfaceCard tone="card" padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--zelo-muted)]" />
              <h2 className="text-sm font-bold">Radar de Cidades (Top 10)</h2>
            </div>
            {data.cidadesRadar.length === 0 ? (
              <EmptyState
                icon={<Globe className="h-5 w-5" />}
                title="Sem cidades registradas ainda"
              />
            ) : (
              <div className="space-y-2">
                {data.cidadesRadar.map((c, idx) => (
                  <div
                    key={c.cidade}
                    className="flex items-center justify-between rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono-num text-xs text-[var(--zelo-muted)] w-5">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-semibold truncate">
                        {c.cidade}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono-num text-xs shrink-0">
                      <span>{c.lojas} lojas</span>
                      <span className="text-[var(--zelo-muted)]">
                        {c.agendamentos30d} agend.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        )}

        {tab === "infra" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <KpiCard
                label="Agendamentos Totais"
                value={data.infra.agendamentosTotal}
                sublabel="Banco Postgres Free"
              />
              <KpiCard
                label="Dispositivos Push"
                value={data.infra.pushSubscriptions}
                sublabel="Web Push VAPID"
              />
              <KpiCard
                label="Webhooks Asaas"
                value={data.infra.webhooksRecentes.length}
                sublabel="Últimos eventos"
              />
            </div>

            <SurfaceCard tone="card" padding="md" className="space-y-3">
              <h2 className="text-sm font-bold">Webhooks Recentes (Idempotência)</h2>
              {data.infra.webhooksRecentes.length === 0 ? (
                <p className="text-xs text-[var(--zelo-muted)]">
                  Nenhum evento de webhook recebido ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.infra.webhooksRecentes.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono-num font-semibold block truncate">
                          {w.event_type}
                        </span>
                        <span className="font-mono-num text-[10px] text-[var(--zelo-muted)] block truncate">
                          {w.id}
                        </span>
                      </div>
                      <StatusBadge tone="emerald" icon={<CheckCircle2 className="h-3 w-3" />}>
                        {formatDateBr(w.processed_at)}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard tone="card" padding="md" className="space-y-3">
              <h2 className="text-sm font-bold">Log de Auditoria do Fundador</h2>
              {data.infra.auditLogsRecentes.length === 0 ? (
                <p className="text-xs text-[var(--zelo-muted)]">
                  Nenhuma ação administrativa registrada ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.infra.auditLogsRecentes.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 py-2 text-xs"
                    >
                      <span className="font-mono-num font-semibold">
                        {log.acao}
                      </span>
                      <span className="font-mono-num text-[11px] text-[var(--zelo-muted)]">
                        {formatDateBr(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>
          </div>
        )}
      </main>
    </div>
  );
}
