"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Gift,
  Globe,
  LayoutGrid,
  Lock,
  PauseCircle,
  PlayCircle,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Store,
  Terminal,
  TrendingUp,
} from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/ui";
import {
  superAdminExtendTrialAction,
  superAdminTogglePausaAction,
} from "@/app/super-admin/actions";
import type {
  SemaforoCor,
  SuperAdminDashboardData,
} from "@/lib/super-admin/metrics";

type TabId = "visao" | "lojas" | "crescimento" | "infra";

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutGrid;
}> = [
  { id: "visao", label: "Torre de Controle", shortLabel: "Geral", icon: LayoutGrid },
  { id: "lojas", label: "Lojas & Assinaturas", shortLabel: "Lojas", icon: Store },
  { id: "crescimento", label: "Crescimento & Radar", shortLabel: "Radar", icon: TrendingUp },
  { id: "infra", label: "Infra & Logs", shortLabel: "Infra", icon: Terminal },
];

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

function getInitials(email: string | null) {
  if (!email) return "FA";
  const local = email.split("@")[0] ?? "FA";
  return local.slice(0, 2).toUpperCase();
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
  const [copiedAi, setCopiedAi] = useState(false);
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

  const lojasAtencao = useMemo(() => {
    return data.lojas
      .filter((l) => l.semaforo === "vermelho" || l.semaforo === "amarelo")
      .slice(0, 4);
  }, [data.lojas]);

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

  const handleCopyForAi = async () => {
    const topCidades = data.cidadesRadar
      .slice(0, 5)
      .map((c) => `${c.cidade}: ${c.lojas} lojas (${c.agendamentos30d} agend./30d)`)
      .join("; ");

    const prompt = [
      "Resumo Zelo Control Tower:",
      `- MRR Líquido: ${formatBRL(data.kpis.mrrLiquidoCentavos)} | Bruto: ${formatBRL(data.kpis.mrrBrutoCentavos)}`,
      `- Lojas: ${data.kpis.totalLojas} total (${data.kpis.lojasAtivas} ativas, ${data.kpis.lojasTrial} trial, ${data.kpis.lojasAtrasadas} atrasadas)`,
      `- Conversão Trial: ${data.kpis.conversaoTrialPct}% | Churn: ${data.kpis.churnPct}%`,
      `- Semáforo: ${data.semaforoResumo.verde} saudáveis, ${data.semaforoResumo.amarelo} atenção, ${data.semaforoResumo.vermelho} críticas`,
      `- Funil 14d: ${data.funil14d.cadastradas} cadastros -> ${data.funil14d.comServicos} c/ serviços -> ${data.funil14d.comPrimeiroAgendamento} c/ 1º agend. -> ${data.funil14d.assinantes} pagos`,
      `- Infra: ${data.infra.agendamentosTotal} agendamentos totais | ${data.infra.pushSubscriptions} push ativos`,
      topCidades ? `- Top Cidades: ${topCidades}` : null,
      "Analise gargalos de ativação, risco de churn e ações prioritárias para a semana.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedAi(true);
      setFeedback("Resumo copiado para colar na IA.");
      setTimeout(() => setCopiedAi(false), 2500);
    } catch {
      setFeedback("Não foi possível acessar a área de transferência.");
    }
  };

  const funilMax = Math.max(1, data.funil14d.cadastradas);
  const cidadeMax = Math.max(
    1,
    data.cidadesRadar[0]?.agendamentos30d ?? data.cidadesRadar[0]?.lojas ?? 1
  );

  return (
    <div className="min-h-dvh bg-[#FAF9F6] text-[#1C1B1B] dark:bg-[#0D0E12] dark:text-[#F4F3F0] pb-32 md:pb-12">
      {/* Desktop Floating Pill Left Rail (Estilo Finexy) */}
      <aside
        aria-label="Navegação do Super Admin"
        className="hidden md:flex fixed left-4 top-4 bottom-4 w-16 z-50 flex-col items-center justify-between py-5 rounded-full bg-white dark:bg-[#17181C] shadow-[0_6px_28px_rgba(0,0,0,0.06)] dark:shadow-[0_6px_28px_rgba(0,0,0,0.35)] select-none"
      >
        <div className="flex flex-col items-center gap-5 w-full">
          <Link
            href="/painel"
            title="Voltar ao Painel"
            className="relative w-10 h-10 rounded-full bg-[#111216] dark:bg-white text-white dark:text-[#111216] flex items-center justify-center font-black text-sm shadow-sm transition-transform hover:scale-105"
          >
            <span>Z</span>
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF5A1F] ring-2 ring-white dark:ring-[#17181C]" />
          </Link>

          <div className="w-8 h-px bg-black/8 dark:bg-white/10" />

          <nav className="flex flex-col items-center gap-2.5 w-full px-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    active
                      ? "bg-[#111216] text-white dark:bg-white dark:text-[#111216] shadow-md scale-105"
                      : "text-[#605E58] dark:text-[#9CA3AF] hover:text-[#1C1B1B] dark:hover:text-white hover:bg-[#F2F0EC] dark:hover:bg-white/8"
                  }`}
                >
                  <Icon className="h-[19px] w-[19px]" />
                  {id === "lojas" && data.kpis.totalLojas > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] px-1 py-0.5 bg-[#FF5A1F] text-white text-[9px] font-bold rounded-full font-mono-num leading-none text-center">
                      {data.kpis.totalLojas}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2.5 w-full px-2">
          <a
            href="/super-admin/export"
            title="Exportar CSV"
            aria-label="Exportar CSV"
            className="w-10 h-10 rounded-2xl text-[#605E58] dark:text-[#9CA3AF] hover:text-[#1C1B1B] dark:hover:text-white hover:bg-[#F2F0EC] dark:hover:bg-white/8 flex items-center justify-center transition-all"
          >
            <Download className="h-[18px] w-[18px]" />
          </a>
          <Link
            href="/painel"
            title="Voltar ao Painel"
            aria-label="Voltar ao Painel"
            className="w-10 h-10 rounded-2xl text-[#605E58] dark:text-[#9CA3AF] hover:text-[#1C1B1B] dark:hover:text-white hover:bg-[#F2F0EC] dark:hover:bg-white/8 flex items-center justify-center transition-all"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </aside>

      {/* Desktop Top Status Header */}
      <header className="hidden md:flex fixed top-0 left-24 right-0 h-16 z-40 bg-[#FAF9F6]/85 dark:bg-[#0D0E12]/85 backdrop-blur-xl px-6 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#17181C] rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.04)] text-xs">
            <Lock className="h-3.5 w-3.5 text-[#605E58] dark:text-[#9CA3AF]" />
            <span className="font-mono-num font-semibold">MFA 2FA Ativo</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#17181C] rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.04)] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono-num text-[#605E58] dark:text-[#9CA3AF]">
              Agend.:
            </span>
            <span className="font-mono-num font-semibold">
              {data.infra.agendamentosTotal}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#17181C] rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.04)] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
            <span className="font-mono-num text-[#605E58] dark:text-[#9CA3AF]">
              Push:
            </span>
            <span className="font-mono-num font-semibold">
              {data.infra.pushSubscriptions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyForAi}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7844] px-4 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            {copiedAi ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{copiedAi ? "Copiado!" : "Copiar p/ IA (Prompt)"}</span>
          </button>
          <a
            href="/super-admin/export"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white dark:bg-[#17181C] px-4 text-xs font-semibold shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:opacity-90 transition-opacity"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </a>
          <div
            title={actorEmail ?? "Fundador"}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#111216] dark:bg-white text-white dark:text-[#111216] pl-1.5 pr-3.5 text-xs font-semibold"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5A1F] text-[11px] font-bold text-white">
              {getInitials(actorEmail)}
            </span>
            <span className="hidden lg:inline max-w-[160px] truncate font-mono-num">
              {actorEmail ?? "Fundador"}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Header (Stitch Control Tower Mobile) */}
      <header className="md:hidden sticky top-0 z-30 bg-[#FAF9F6]/90 dark:bg-[#0D0E12]/90 backdrop-blur-xl px-4 pt-3 pb-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/painel"
              aria-label="Voltar ao Painel"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111216] dark:bg-white text-white dark:text-[#111216] text-xs font-black"
            >
              <span>Z</span>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#FF5A1F] ring-2 ring-[#FAF9F6] dark:ring-[#0D0E12]" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight">Zelo</span>
                <span className="rounded-full bg-[#111216] dark:bg-white/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                  Control Tower
                </span>
              </div>
              <p className="text-[11px] font-mono-num text-[#605E58] dark:text-[#9CA3AF] truncate">
                {actorEmail ?? "Fundador"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              2FA ATIVO
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111216] dark:bg-white text-[11px] font-bold text-white dark:text-[#111216]">
              {getInitials(actorEmail)}
            </span>
          </div>
        </div>

        {/* Mobile Status Chips + Quick Actions */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white dark:bg-[#17181C] px-3 py-1 text-[11px] font-mono-num shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            MFA Ativo
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white dark:bg-[#17181C] px-3 py-1 text-[11px] font-mono-num shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <Store className="h-3 w-3 text-[#FF5A1F]" />
            {data.kpis.totalLojas} lojas
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white dark:bg-[#17181C] px-3 py-1 text-[11px] font-mono-num shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <Server className="h-3 w-3 text-[#605E58] dark:text-[#9CA3AF]" />
            {data.infra.agendamentosTotal} agend.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyForAi}
            className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7844] px-4 text-xs font-bold text-white shadow-sm active:scale-[0.99]"
          >
            {copiedAi ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedAi ? "Copiado para IA" : "Copiar p/ IA (Prompt)"}</span>
          </button>
          <a
            href="/super-admin/export"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-white dark:bg-[#17181C] px-4 text-xs font-semibold shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:pl-24 md:pt-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 md:pt-4 space-y-5">
          {feedback && (
            <div className="rounded-2xl bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 px-4 py-3 text-xs font-semibold flex items-center justify-between gap-2">
              <span>{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-[11px] opacity-75 hover:opacity-100"
              >
                Fechar
              </button>
            </div>
          )}

          {tab === "visao" && (
            <div className="space-y-4">
              {/* Row 1: Hero Orange MRR Card + Lojas Ativas + Churn/Atrasadas */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Hero Card (Finexy Orange) */}
                <div className="md:col-span-6 rounded-3xl bg-gradient-to-br from-[#FF5A1F] to-[#FF7844] p-5 text-white shadow-[0_10px_30px_rgba(255,90,31,0.22)] flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                      MRR Líquido Consolidado
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-mono-num font-semibold">
                      Bruto: {formatBRL(data.kpis.mrrBrutoCentavos)}
                    </span>
                  </div>
                  <div className="font-mono-num text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {formatBRL(data.kpis.mrrLiquidoCentavos)}
                    <span className="text-sm font-medium text-white/80 ml-1">
                      /mês
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/15 text-xs">
                    <span className="font-mono-num">
                      Conversão Trial: <strong>{data.kpis.conversaoTrialPct}%</strong>
                    </span>
                    <span className="font-mono-num">
                      Churn: <strong>{data.kpis.churnPct}%</strong>
                    </span>
                  </div>
                </div>

                {/* Lojas Ativas */}
                <div className="md:col-span-3 rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#605E58] dark:text-[#9CA3AF]">
                      Lojas Ativas
                    </span>
                    <Store className="h-4 w-4 text-[#FF5A1F]" />
                  </div>
                  <div className="font-mono-num text-3xl font-extrabold">
                    {data.kpis.lojasAtivas}
                  </div>
                  <div className="text-xs text-[#605E58] dark:text-[#9CA3AF] font-mono-num">
                    {data.kpis.lojasTrial} em trial • {data.kpis.totalLojas} total
                  </div>
                </div>

                {/* Atrasadas / Risco */}
                <div className="md:col-span-3 rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#605E58] dark:text-[#9CA3AF]">
                      Atrasadas
                    </span>
                    <AlertTriangle
                      className={`h-4 w-4 ${
                        data.kpis.lojasAtrasadas > 0
                          ? "text-rose-500"
                          : "text-emerald-500"
                      }`}
                    />
                  </div>
                  <div
                    className={`font-mono-num text-3xl font-extrabold ${
                      data.kpis.lojasAtrasadas > 0 ? "text-rose-500" : ""
                    }`}
                  >
                    {data.kpis.lojasAtrasadas}
                  </div>
                  <div className="text-xs text-[#605E58] dark:text-[#9CA3AF] font-mono-num">
                    {data.semaforoResumo.vermelho} críticas •{" "}
                    {data.semaforoResumo.amarelo} atenção
                  </div>
                </div>
              </div>

              {/* Row 2: Semáforo + Funil 14d */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <section className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold">Semáforo das Lojas</h2>
                    <button
                      type="button"
                      onClick={() => setTab("lojas")}
                      className="text-xs font-semibold text-[#FF5A1F] hover:underline"
                    >
                      Ver todas
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroSemaforo("verde");
                        setTab("lojas");
                      }}
                      className="rounded-2xl bg-emerald-500/10 p-3.5 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Saudáveis
                      </span>
                      <span className="mt-1.5 block font-mono-num text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {data.semaforoResumo.verde}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroSemaforo("amarelo");
                        setTab("lojas");
                      }}
                      className="rounded-2xl bg-amber-500/10 p-3.5 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="block text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        Atenção
                      </span>
                      <span className="mt-1.5 block font-mono-num text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                        {data.semaforoResumo.amarelo}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroSemaforo("vermelho");
                        setTab("lojas");
                      }}
                      className="rounded-2xl bg-rose-500/10 p-3.5 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="block text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                        Críticas
                      </span>
                      <span className="mt-1.5 block font-mono-num text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                        {data.semaforoResumo.vermelho}
                      </span>
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">
                      Funil de Ativação (14 dias)
                    </h2>
                    <span className="text-[11px] font-mono-num text-[#605E58] dark:text-[#9CA3AF]">
                      Coorte recente
                    </span>
                  </div>
                  <div className="space-y-3">
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
                          <span className="font-mono-num font-bold">
                            {step.val}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#F2F0EC] dark:bg-white/8 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#111216] dark:bg-[#FF5A1F]"
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
                </section>
              </div>

              {/* Row 3: Atenção Imediata + Radar Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <section className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h2 className="text-sm font-bold">Atenção Imediata</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroSemaforo("vermelho");
                        setTab("lojas");
                      }}
                      className="text-xs font-semibold text-[#FF5A1F] hover:underline"
                    >
                      Ver lojas
                    </button>
                  </div>
                  {lojasAtencao.length === 0 ? (
                    <p className="text-xs text-[#605E58] dark:text-[#9CA3AF] py-3">
                      Nenhuma loja crítica ou em atenção no momento.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lojasAtencao.map((loja) => {
                        const sem = SEMAFORO_BADGE[loja.semaforo];
                        return (
                          <div
                            key={loja.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF9F6] dark:bg-white/5 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold truncate">
                                  {loja.nome}
                                </span>
                                <StatusBadge tone={sem.tone} dot>
                                  {sem.label}
                                </StatusBadge>
                              </div>
                              <p className="text-[11px] font-mono-num text-[#605E58] dark:text-[#9CA3AF] truncate mt-0.5">
                                /{loja.slug} • {loja.semaforoMotivo}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleExtendTrial(loja.id, 7)}
                              className="shrink-0 min-h-[36px] rounded-xl bg-white dark:bg-[#17181C] px-2.5 text-[11px] font-semibold shadow-sm hover:opacity-80 disabled:opacity-50"
                            >
                              +7d
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#FF5A1F]" />
                      <h2 className="text-sm font-bold">Radar de Cidades</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("crescimento")}
                      className="text-xs font-semibold text-[#FF5A1F] hover:underline"
                    >
                      Ver ranking
                    </button>
                  </div>
                  {data.cidadesRadar.length === 0 ? (
                    <p className="text-xs text-[#605E58] dark:text-[#9CA3AF] py-3">
                      Sem cidades registradas ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.cidadesRadar.slice(0, 4).map((c, idx) => (
                        <div
                          key={c.cidade}
                          className="flex items-center justify-between rounded-2xl bg-[#FAF9F6] dark:bg-white/5 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono-num text-[#605E58] dark:text-[#9CA3AF] w-5">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold truncate">
                              {c.cidade}
                            </span>
                          </div>
                          <span className="font-mono-num text-[#605E58] dark:text-[#9CA3AF] shrink-0">
                            {c.lojas} lojas • {c.agendamentos30d} agend.
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {tab === "lojas" && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 flex items-center gap-2.5 rounded-2xl bg-white dark:bg-[#17181C] px-3.5 h-11 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <Search className="h-4 w-4 text-[#605E58] dark:text-[#9CA3AF] shrink-0" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome, @slug ou cidade..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {(["todos", "verde", "amarelo", "vermelho"] as const).map(
                    (f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFiltroSemaforo(f)}
                        className={`min-h-[44px] rounded-2xl px-3.5 text-xs font-semibold capitalize shrink-0 transition-colors ${
                          filtroSemaforo === f
                            ? "bg-[#111216] text-white dark:bg-white dark:text-[#111216]"
                            : "bg-white dark:bg-[#17181C] text-[#605E58] dark:text-[#9CA3AF] shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        {f === "todos" ? "Todas" : SEMAFORO_BADGE[f].label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {lojasFiltradas.length === 0 ? (
                <EmptyState
                  icon={<Store className="h-5 w-5" />}
                  title="Nenhuma loja encontrada"
                  description="Ajuste a busca ou o filtro do semáforo."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lojasFiltradas.map((loja) => {
                    const sem = SEMAFORO_BADGE[loja.semaforo];
                    return (
                      <article
                        key={loja.id}
                        className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3"
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
                            <p className="text-xs font-mono-num text-[#605E58] dark:text-[#9CA3AF] mt-0.5">
                              /{loja.slug} • {loja.cidade} ({loja.nicho})
                            </p>
                          </div>
                          <StatusBadge tone="neutral">
                            {loja.plano.toUpperCase()} • {loja.assinatura_status}
                          </StatusBadge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-num text-[#605E58] dark:text-[#9CA3AF]">
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
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-[#FAF9F6] dark:bg-white/8 px-3.5 text-xs font-semibold hover:opacity-80 disabled:opacity-50"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>+7d Trial</span>
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleTogglePausa(loja.id, !loja.pausada)
                            }
                            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3.5 text-xs font-semibold disabled:opacity-50 ${
                              loja.pausada
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
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
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "crescimento" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <section className="md:col-span-5 rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">
                    Funil de Ativação (14 dias)
                  </h2>
                  <span className="text-[11px] font-mono-num text-[#605E58] dark:text-[#9CA3AF]">
                    Coorte recente
                  </span>
                </div>
                <div className="space-y-3">
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
                        <span className="font-mono-num font-bold">
                          {step.val}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F2F0EC] dark:bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#FF5A1F]"
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
              </section>

              <section className="md:col-span-7 rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#FF5A1F]" />
                  <h2 className="text-sm font-bold">
                    Radar de Cidades (Top 10)
                  </h2>
                </div>
                {data.cidadesRadar.length === 0 ? (
                  <EmptyState
                    icon={<Globe className="h-5 w-5" />}
                    title="Sem cidades registradas ainda"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {data.cidadesRadar.map((c, idx) => {
                      const metric = c.agendamentos30d || c.lojas;
                      const pct = Math.max(
                        10,
                        Math.round((metric / cidadeMax) * 100)
                      );
                      return (
                        <div
                          key={c.cidade}
                          className="rounded-2xl bg-[#FAF9F6] dark:bg-white/5 px-3.5 py-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono-num text-xs text-[#605E58] dark:text-[#9CA3AF] w-5">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-semibold truncate">
                                {c.cidade}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 font-mono-num text-xs shrink-0">
                              <span className="font-semibold">
                                {c.lojas} lojas
                              </span>
                              <span className="text-[#605E58] dark:text-[#9CA3AF]">
                                {c.agendamentos30d} agend.
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#111216] dark:bg-[#FF5A1F]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "infra" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-3xl bg-white dark:bg-[#17181C] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#605E58] dark:text-[#9CA3AF]">
                    Agendamentos Totais
                  </span>
                  <div className="font-mono-num text-2xl font-extrabold">
                    {data.infra.agendamentosTotal}
                  </div>
                  <span className="text-[11px] text-[#605E58] dark:text-[#9CA3AF]">
                    Banco Postgres Free
                  </span>
                </div>
                <div className="rounded-3xl bg-white dark:bg-[#17181C] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#605E58] dark:text-[#9CA3AF]">
                    Dispositivos Push
                  </span>
                  <div className="font-mono-num text-2xl font-extrabold">
                    {data.infra.pushSubscriptions}
                  </div>
                  <span className="text-[11px] text-[#605E58] dark:text-[#9CA3AF]">
                    Web Push VAPID
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-3xl bg-white dark:bg-[#17181C] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#605E58] dark:text-[#9CA3AF]">
                    Webhooks Asaas
                  </span>
                  <div className="font-mono-num text-2xl font-extrabold">
                    {data.infra.webhooksRecentes.length}
                  </div>
                  <span className="text-[11px] text-[#605E58] dark:text-[#9CA3AF]">
                    Últimos eventos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <section className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3">
                  <h2 className="text-sm font-bold">
                    Webhooks Recentes (Idempotência)
                  </h2>
                  {data.infra.webhooksRecentes.length === 0 ? (
                    <p className="text-xs text-[#605E58] dark:text-[#9CA3AF]">
                      Nenhum evento de webhook recebido ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.infra.webhooksRecentes.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between gap-2 rounded-2xl bg-[#FAF9F6] dark:bg-white/5 px-3.5 py-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono-num font-semibold block truncate">
                              {w.event_type}
                            </span>
                            <span className="font-mono-num text-[10px] text-[#605E58] dark:text-[#9CA3AF] block truncate">
                              {w.id}
                            </span>
                          </div>
                          <StatusBadge
                            tone="emerald"
                            icon={<CheckCircle2 className="h-3 w-3" />}
                          >
                            {formatDateBr(w.processed_at)}
                          </StatusBadge>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl bg-white dark:bg-[#17181C] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3">
                  <h2 className="text-sm font-bold">
                    Log de Auditoria do Fundador
                  </h2>
                  {data.infra.auditLogsRecentes.length === 0 ? (
                    <p className="text-xs text-[#605E58] dark:text-[#9CA3AF]">
                      Nenhuma ação administrativa registrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.infra.auditLogsRecentes.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between gap-2 rounded-2xl bg-[#FAF9F6] dark:bg-white/5 px-3.5 py-2.5 text-xs"
                        >
                          <span className="font-mono-num font-semibold">
                            {log.acao}
                          </span>
                          <span className="font-mono-num text-[11px] text-[#605E58] dark:text-[#9CA3AF]">
                            {formatDateBr(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile iPhone Floating Pill Dock (substitui dock plana do Stitch) */}
      <div className="md:hidden pointer-events-none fixed inset-x-0 bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] z-40 flex justify-center px-4">
        <nav
          aria-label="Navegação do Super Admin"
          className="pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5 backdrop-blur-xl"
          style={{
            backgroundColor: "#111216",
            boxShadow:
              "0 14px 36px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {NAV_ITEMS.map(({ id, shortLabel, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-label={shortLabel}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[44px] items-center justify-center gap-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  active ? "px-4" : "w-11 px-0"
                }`}
                style={
                  active
                    ? {
                        backgroundColor: "#FFFFFF",
                        color: "#111216",
                      }
                    : {
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        color: "rgba(255, 255, 255, 0.72)",
                      }
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {active && <span>{shortLabel}</span>}
                {!active && id === "lojas" && data.kpis.totalLojas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] rounded-full bg-[#FF5A1F] px-1 py-0.5 text-[9px] font-bold leading-none text-white font-mono-num">
                    {data.kpis.totalLojas}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
