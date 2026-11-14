"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Gift,
  Globe,
  LayoutGrid,
  Lock,
  MessageCircle,
  Moon,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Scissors,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Sun,
  Terminal,
  TrendingUp,
  Zap,
} from "lucide-react";
import { EmptyState } from "@/components/ui";
import {
  superAdminExtendTrialAction,
  superAdminSetPlanoAction,
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
  { id: "visao", label: "Overview", shortLabel: "Geral", icon: LayoutGrid },
  { id: "lojas", label: "Lojas", shortLabel: "Lojas", icon: Store },
  { id: "crescimento", label: "Crescimento", shortLabel: "Radar", icon: TrendingUp },
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

function getInitials(name: string | null, email: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "FA";
  return base.slice(0, 2).toUpperCase();
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
  actorName,
  actorAvatarUrl,
}: {
  data: SuperAdminDashboardData;
  actorEmail: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
}) {
  const [tab, setTab] = useState<TabId>("visao");
  const [darkMode, setDarkMode] = useState(false);
  const [periodo, setPeriodo] = useState<"hoje" | "7d" | "30d" | "mes">("30d");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSemaforo, setFiltroSemaforo] = useState<"todos" | SemaforoCor>(
    "todos"
  );
  const [filtroNicho, setFiltroNicho] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedAi, setCopiedAi] = useState(false);
  const [isPending, startTransition] = useTransition();

  const nichosDisponiveis = useMemo(
    () => Array.from(new Set(data.lojas.map((l) => l.nicho))).sort(),
    [data.lojas]
  );

  const selectTab = (nextTab: TabId) => {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const lojasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.lojas.filter((l) => {
      if (filtroSemaforo !== "todos" && l.semaforo !== filtroSemaforo) {
        return false;
      }
      if (filtroNicho !== "todos" && l.nicho !== filtroNicho) {
        return false;
      }
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.slug.toLowerCase().includes(q) ||
        l.cidade.toLowerCase().includes(q)
      );
    });
  }, [data.lojas, busca, filtroSemaforo, filtroNicho]);

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

  const handleSetPlano = (
    lojaId: string,
    plano: "trial" | "solo" | "estudio",
    assinaturaStatus: "trial" | "ativa" | "atrasada" | "cancelada"
  ) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await superAdminSetPlanoAction({
        lojaId,
        plano,
        assinaturaStatus,
      });
      setFeedback(
        res.error ??
          `Plano atualizado para ${plano.toUpperCase()} (${assinaturaStatus}).`
      );
    });
  };

  const whatsappHref = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 10) return null;
    const normalized = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${normalized}`;
  };

  const handleCopyForAi = async () => {
    const topCidades = data.cidadesRadar
      .slice(0, 5)
      .map(
        (c) => `${c.cidade}: ${c.lojas} lojas (${c.agendamentos30d} agend./30d)`
      )
      .join("; ");

    const prompt = [
      "Resumo Zelo Control Tower:",
      `- MRR Bruto: ${formatBRL(data.kpis.mrrBrutoCentavos)} | MRR Líquido: ${formatBRL(data.kpis.mrrLiquidoCentavos)}`,
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

  // Tokens visuais Finexy (Light por padrão como no Stitch, com toggle p/ Dark)
  const bgPage = darkMode ? "bg-[#0D0E12] text-[#F4F3F0]" : "bg-[#F6F5F1] text-[#1C1B1B]";
  const bgCard = darkMode
    ? "bg-[#17181C] shadow-[0_2px_20px_rgba(0,0,0,0.35)]"
    : "bg-white shadow-[0_2px_20px_rgba(17,18,22,0.04)]";
  const bgSub = darkMode ? "bg-white/[0.05]" : "bg-[#F7F6F3]";
  const textMuted = darkMode ? "text-[#9CA3AF]" : "text-[#6B6963]";
  const pillActive = darkMode ? "bg-white text-[#111216]" : "bg-[#111216] text-white";
  const trackBg = darkMode ? "bg-white/10" : "bg-black/5";
  const barFill = darkMode ? "bg-[#FF5A1F]" : "bg-[#111216]";
  const dividerBorder = darkMode ? "border-white/10" : "border-black/5";
  const badgeEmerald = darkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-800";
  const badgeAmber = darkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-900";
  const badgeRose = darkMode ? "bg-rose-500/15 text-rose-300" : "bg-rose-100 text-rose-800";
  const textEmerald = darkMode ? "text-emerald-400" : "text-emerald-700";
  const textRose = darkMode ? "text-rose-400" : "text-rose-700";
  const semaforoPill = (tone: "emerald" | "amber" | "rose") =>
    tone === "emerald"
      ? badgeEmerald
      : tone === "amber"
        ? badgeAmber
        : badgeRose;
  const semaforoDot = (tone: "emerald" | "amber" | "rose") =>
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-rose-500";

  const renderAvatar = (sizeClass = "h-8 w-8") =>
    actorAvatarUrl ? (
      <img
        src={actorAvatarUrl}
        alt={actorName ?? actorEmail ?? "Fundador"}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    ) : (
      <span
        className={`${sizeClass} flex items-center justify-center rounded-full bg-[#111216] text-white text-[11px] font-bold shrink-0`}
      >
        {getInitials(actorName, actorEmail)}
      </span>
    );

  const renderSemaforoTable = (limit = 6) => {
    const pageSize = limit;
    const totalFiltered = lojasFiltradas.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIdx = (currentPage - 1) * pageSize;
    const rows = lojasFiltradas.slice(startIdx, startIdx + pageSize);

    const toggleSelect = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    };

    const toggleSelectAll = () => {
      const visibleIds = rows.map((r) => r.id);
      const allSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => selectedIds.includes(id));
      if (allSelected) {
        setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      } else {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      }
    };

    const NichoIcon = (nicho: string) => {
      if (nicho === "barbearia") return <Scissors className="h-4 w-4" />;
      if (nicho === "estetica" || nicho === "salao") {
        return <Sparkles className="h-4 w-4" />;
      }
      return <Store className="h-4 w-4" />;
    };

    return (
      <section className={`rounded-3xl ${bgCard} p-5 space-y-4`}>
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Semáforo de Saúde das Lojas
            </h2>
            <p className={`text-xs ${textMuted}`}>
              Monitoramento proativo contra churn e taxa de engajamento semanal
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex items-center gap-1 rounded-full ${bgSub} p-1 overflow-x-auto no-scrollbar`}
              >
                {(
                  [
                    { id: "todos", label: `Todas (${data.lojas.length})` },
                    {
                      id: "verde",
                      label: `Saudáveis (${data.semaforoResumo.verde})`,
                    },
                    {
                      id: "amarelo",
                      label: `Atenção (${data.semaforoResumo.amarelo})`,
                    },
                    {
                      id: "vermelho",
                      label: `Críticas (${data.semaforoResumo.vermelho})`,
                    },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFiltroSemaforo(f.id);
                      setPage(1);
                    }}
                    className={`min-h-[32px] rounded-full px-3 text-xs font-semibold transition-all shrink-0 ${
                      filtroSemaforo === f.id
                        ? darkMode
                          ? "bg-white text-[#111216] shadow-sm"
                          : "bg-white text-[#111216] shadow-sm"
                        : `${textMuted} hover:opacity-85`
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full ${bgSub} px-3.5 text-xs font-semibold hover:opacity-85`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filtros</span>
              </button>
            </div>

            <div
              className={`flex items-center gap-2 rounded-full ${bgSub} px-3.5 h-9 min-w-[220px]`}
            >
              <Search className={`h-3.5 w-3.5 ${textMuted} shrink-0`} />
              <input
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar loja ou slug..."
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className={`text-[11px] font-semibold ${textMuted} mr-1`}>
              Nicho:
            </span>
            <button
              type="button"
              onClick={() => {
                setFiltroNicho("todos");
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                filtroNicho === "todos"
                  ? pillActive
                  : `${bgSub} ${textMuted}`
              }`}
            >
              Todos
            </button>
            {nichosDisponiveis.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setFiltroNicho(n);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${
                  filtroNicho === n
                    ? pillActive
                    : `${bgSub} ${textMuted}`
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={<Store className="h-5 w-5" />}
            title="Nenhuma loja encontrada"
            description="Ajuste a busca ou o filtro do semáforo."
          />
        ) : (
          <>
            {/* Desktop Table (Idêntica à Foto 4 do Stitch Finexy) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[10px] font-bold uppercase tracking-wider ${textMuted} border-b ${dividerBorder}`}
                  >
                    <th className="py-3 px-2.5 w-8">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todas"
                        checked={
                          rows.length > 0 &&
                          rows.every((r) => selectedIds.includes(r.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded accent-[#111216] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2.5">Código/ID</th>
                    <th className="py-3 px-2.5">Estabelecimento &amp; Nicho</th>
                    <th className="py-3 px-2.5">Polo / Bairro</th>
                    <th className="py-3 px-2.5">Plano &amp; Volume</th>
                    <th className="py-3 px-2.5">Status Operacional</th>
                    <th className="py-3 px-2.5">Trial / Sync</th>
                    <th className="py-3 px-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-white/8" : "divide-black/5"} text-xs`}>
                  {rows.map((loja, i) => {
                    const sem = SEMAFORO_BADGE[loja.semaforo];
                    const codeId = `LZ_${String(startIdx + i + 1).padStart(5, "0")}`;
                    const rowTint =
                      loja.semaforo === "vermelho"
                        ? darkMode
                          ? "bg-rose-500/[0.06]"
                          : "bg-rose-50/75"
                        : loja.semaforo === "amarelo"
                          ? darkMode
                            ? "bg-amber-500/[0.06]"
                            : "bg-amber-50/65"
                          : "";
                    const iconTint =
                      loja.semaforo === "vermelho"
                        ? "${badgeRose}"
                        : loja.semaforo === "amarelo"
                          ? "${badgeAmber}"
                          : "bg-[#FF5A1F]/10 text-[#FF5A1F]";
                    const isChecked = selectedIds.includes(loja.id);

                    return (
                      <tr
                        key={loja.id}
                        className={`${rowTint} ${darkMode ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"} transition-colors`}
                      >
                        <td className="py-3.5 px-2.5">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${loja.nome}`}
                            checked={isChecked}
                            onChange={() => toggleSelect(loja.id)}
                            className="h-4 w-4 rounded accent-[#111216] cursor-pointer"
                          />
                        </td>
                        <td className={`py-3.5 px-2.5 font-mono-num text-[11px] ${textMuted}`}>
                          {codeId}
                        </td>
                        <td className="py-3.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTint}`}
                            >
                              {NichoIcon(loja.nicho)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{loja.nome}</p>
                              <p className={`text-[11px] font-mono-num ${textMuted}`}>
                                /{loja.slug} • {loja.nicho}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2.5">
                          <span className="font-semibold">{loja.cidade}</span>
                          {loja.bairro ? (
                            <span className={`font-normal ${textMuted}`}>
                              {" "}
                              / {loja.bairro}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-2.5 font-mono-num">
                          <span
                            className={`font-bold ${
                              loja.semaforo === "vermelho"
                                ? "${textRose}"
                                : ""
                            }`}
                          >
                            {loja.plano.toUpperCase()} • {loja.assinatura_status}
                          </span>
                          <span className={`block text-[11px] ${textMuted}`}>
                            {loja.servicos_count} serv. • {loja.agendamentos_30d} agend./30d
                          </span>
                        </td>
                        <td className="py-3.5 px-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${semaforoPill(sem.tone)}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${semaforoDot(sem.tone)}`}
                            />
                            <span>
                              {sem.label} ({loja.semaforoMotivo})
                            </span>
                          </span>
                        </td>
                        <td className={`py-3.5 px-2.5 font-mono-num text-[11px] ${textMuted}`}>
                          {formatDateBr(loja.trial_ate)}
                          {loja.indicacoes_confirmadas > 0 && (
                            <span className={`mt-0.5 flex items-center gap-1 ${textEmerald}`}>
                              <Gift className="h-3 w-3" />
                              {loja.indicacoes_confirmadas} ind.
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2.5 text-right relative">
                          <button
                            type="button"
                            aria-label={`Ações para ${loja.nome}`}
                            onClick={() =>
                              setOpenMenuId((prev) =>
                                prev === loja.id ? null : loja.id
                              )
                            }
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${bgSub} hover:opacity-80`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === loja.id && (
                            <div
                              className={`absolute right-2.5 top-12 z-30 w-48 rounded-2xl ${bgCard} p-1.5 shadow-xl border ${dividerBorder} text-left space-y-1`}
                            >
                              <a
                                href={`/${loja.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpenMenuId(null)}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Abrir vitrine</span>
                              </a>
                              {whatsappHref(loja.whatsapp_loja) && (
                                <a
                                  href={whatsappHref(loja.whatsapp_loja)!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setOpenMenuId(null)}
                                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-600 ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>WhatsApp do lojista</span>
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  handleSetPlano(loja.id, "solo", "ativa");
                                  setOpenMenuId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                              >
                                <CreditCard className="h-3.5 w-3.5 text-[#FF5A1F]" />
                                <span>Ativar Solo (R$ 29)</span>
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  handleSetPlano(loja.id, "estudio", "ativa");
                                  setOpenMenuId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                              >
                                <CreditCard className="h-3.5 w-3.5 text-[#FF5A1F]" />
                                <span>Ativar Estúdio (R$ 59)</span>
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  handleExtendTrial(loja.id, 7);
                                  setOpenMenuId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>Estender +7d Trial</span>
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  handleTogglePausa(loja.id, !loja.pausada);
                                  setOpenMenuId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                                  loja.pausada
                                    ? "text-emerald-600 hover:bg-emerald-500/10"
                                    : "text-rose-600 hover:bg-rose-500/10"
                                }`}
                              >
                                {loja.pausada ? (
                                  <>
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    <span>Reativar loja</span>
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="h-3.5 w-3.5" />
                                    <span>Pausar loja</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2.5">
              {rows.map((loja) => {
                const sem = SEMAFORO_BADGE[loja.semaforo];
                return (
                  <article
                    key={loja.id}
                    className={`rounded-2xl ${bgSub} p-3.5 space-y-2.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate">
                            {loja.nome}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${semaforoPill(sem.tone)}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${semaforoDot(sem.tone)}`}
                            />
                            <span>{sem.label}</span>
                          </span>
                        </div>
                        <p className={`text-xs font-mono-num ${textMuted} mt-0.5`}>
                          /{loja.slug} • {loja.cidade} ({loja.nicho})
                        </p>
                      </div>
                      <span
                        className={`rounded-full ${bgCard} px-2.5 py-0.5 text-[10px] font-bold font-mono-num`}
                      >
                        {loja.plano.toUpperCase()}
                      </span>
                    </div>

                    <div className={`flex flex-wrap items-center gap-2.5 text-[11px] font-mono-num ${textMuted}`}>
                      <span>{loja.semaforoMotivo}</span>
                      <span>• {loja.servicos_count} serv.</span>
                      <span>• {loja.agendamentos_30d} agend./30d</span>
                      <span>• Trial {formatDateBr(loja.trial_ate)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/${loja.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl ${bgCard} px-3 text-xs font-semibold`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Vitrine</span>
                      </a>
                      {whatsappHref(loja.whatsapp_loja) && (
                        <a
                          href={whatsappHref(loja.whatsapp_loja)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl ${badgeEmerald} px-3 text-xs font-semibold`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleExtendTrial(loja.id, 7)}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl ${bgCard} px-3 text-xs font-semibold disabled:opacity-50`}
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
                            ? "${badgeEmerald}"
                            : "${badgeRose}"
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
          </>
        )}

        {/* Rodapé com Paginação Real (Idêntico à Foto 4 do Stitch) */}
        <div className={`pt-2 border-t ${dividerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}>
          <span className={`font-mono-num ${textMuted}`}>
            Mostrando {totalFiltered === 0 ? 0 : startIdx + 1} a{" "}
            {Math.min(startIdx + rows.length, totalFiltered)} de{" "}
            <strong>{totalFiltered}</strong> lojas cadastradas
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`h-8 rounded-full px-3 text-xs font-semibold ${bgSub} disabled:opacity-40`}
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded-full text-xs font-bold font-mono-num transition-colors ${
                  p === currentPage
                    ? pillActive
                    : `${bgSub} ${textMuted}`
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`h-8 rounded-full px-3 text-xs font-semibold ${bgSub} disabled:opacity-40`}
            >
              Próximo
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className={`min-h-dvh ${bgPage} pb-32 md:pb-10 transition-colors`}>
      {/* Desktop Floating Pill Left Rail (Idêntico ao Stitch Finexy) */}
      <aside
        aria-label="Navegação do Super Admin"
        className={`hidden md:flex fixed left-4 top-4 bottom-4 w-16 z-50 flex-col items-center justify-between py-5 rounded-full ${bgCard} select-none`}
      >
        <div className="flex flex-col items-center gap-4 w-full">
          <Link
            href="/painel"
            title="Voltar ao Painel"
            className="relative w-10 h-10 rounded-full bg-[#FF5A1F] text-white flex items-center justify-center font-black text-sm shadow-sm transition-transform hover:scale-105"
          >
            <span>Z</span>
          </Link>

          {/* Toggle Light / Dark (igual ao Stitch Finexy) */}
          <div className={`flex flex-col items-center gap-1 p-1 rounded-full ${bgSub}`}>
            <button
              type="button"
              onClick={() => setDarkMode(false)}
              title="Tema Claro"
              aria-label="Tema Claro"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                !darkMode
                  ? "bg-white text-[#111216] shadow-sm"
                  : `${textMuted} hover:text-white`
              }`}
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(true)}
              title="Tema Escuro"
              aria-label="Tema Escuro"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                darkMode
                  ? "bg-[#111216] text-white shadow-sm"
                  : `${textMuted} hover:text-[#111216]`
              }`}
            >
              <Moon className="h-4 w-4" />
            </button>
          </div>

          <div className={`w-8 h-px ${trackBg}`} />

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
                      ? darkMode
                        ? "bg-white text-[#111216] shadow-md scale-105"
                        : "bg-[#111216] text-white shadow-md scale-105"
                      : `${textMuted} ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`
                  }`}
                >
                  <Icon className="h-[19px] w-[19px]" />
                  {id === "lojas" && data.kpis.totalLojas > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] px-1 py-0.5 ${barFill} text-white text-[9px] font-bold rounded-full font-mono-num leading-none text-center`}>
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
            download
            title="Exportar CSV"
            aria-label="Exportar CSV"
            className={`w-10 h-10 rounded-2xl ${textMuted} ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"} flex items-center justify-center transition-all`}
          >
            <Download className="h-[18px] w-[18px]" />
          </a>
          <Link
            href="/painel"
            title="Voltar ao Painel"
            aria-label="Voltar ao Painel"
            className={`w-10 h-10 rounded-2xl ${textMuted} ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"} flex items-center justify-center transition-all`}
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header
        className={`md:hidden sticky top-0 z-30 ${
          darkMode ? "bg-[#0D0E12]/90" : "bg-[#F6F5F1]/90"
        } backdrop-blur-xl px-4 pt-3 pb-2.5 space-y-2.5`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/painel"
              aria-label="Voltar ao Painel"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF5A1F] text-white text-xs font-black"
            >
              Z
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight">Zelo</span>
                <span className="rounded-full bg-[#111216] px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                  Control Tower
                </span>
              </div>
              <p className={`text-[11px] font-mono-num ${textMuted} truncate`}>
                {actorName ?? actorEmail ?? "Fundador"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              aria-label="Alternar tema"
              className={`flex h-8 w-8 items-center justify-center rounded-full ${bgCard}`}
            >
              {darkMode ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
            {renderAvatar("h-8 w-8")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyForAi}
            className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7844] px-4 text-xs font-bold text-white shadow-sm"
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
            className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full ${bgCard} px-4 text-xs font-semibold`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="md:pl-24">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-7 pt-3 md:pt-5 space-y-5">
          {/* Desktop Top Navigation Bar (Estilo Finexy) */}
          <div className="hidden md:flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight">
                  Zelo
                </span>
                <span className="rounded-full bg-[#111216] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                  Control Tower
                </span>
              </div>

              <nav className="flex items-center gap-1">
                {NAV_ITEMS.map(({ id, label }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`h-9 rounded-full px-4 text-xs font-semibold transition-all ${
                        active
                          ? darkMode
                            ? "bg-white text-[#111216]"
                            : "bg-[#111216] text-white"
                          : `${textMuted} hover:opacity-80`
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className={`inline-flex items-center gap-2 rounded-full ${bgCard} px-3.5 h-10 text-[11px] font-mono-num`}
              >
                <span className={`inline-flex items-center gap-1 ${textEmerald} font-semibold`}>
                  <Lock className="h-3 w-3" />
                  MFA / PIN
                </span>
                <span className={textMuted}>•</span>
                <span>
                  Agend.: <strong>{data.infra.agendamentosTotal}</strong>
                </span>
                <span className={textMuted}>•</span>
                <span>
                  Push: <strong>{data.infra.pushSubscriptions}</strong>
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className={`inline-flex items-center gap-2.5 rounded-full ${bgCard} pl-1.5 pr-3 h-10 hover:opacity-95 transition-opacity`}
                >
                  {renderAvatar("h-7 w-7")}
                  <div className="leading-tight text-left">
                    <p className="text-xs font-bold truncate max-w-[140px]">
                      {actorName ?? "Fundador Admin"}
                    </p>
                    <p className={`text-[10px] font-mono-num ${textMuted} truncate max-w-[160px]`}>
                      {actorEmail ?? "Super Admin"}
                    </p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 ${textMuted} shrink-0`} />
                </button>

                {profileMenuOpen && (
                  <div
                    className={`absolute right-0 top-12 z-40 w-48 rounded-2xl ${bgCard} p-1.5 shadow-xl border ${dividerBorder} text-left space-y-1`}
                  >
                    <Link
                      href="/painel"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                    >
                      <span>Painel da Loja</span>
                    </Link>
                    <Link
                      href="/explorar"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                    >
                      <span>Vitrine Pública</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Title + Action Buttons */}
          <div className="hidden md:flex items-end justify-between gap-4 pt-1">
            <div>
              <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${textEmerald}`}>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Operação em Tempo Real</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
                Torre de Controle do Fundador
              </h1>
              <p className={`text-xs ${textMuted}`}>
                Visão executiva unificada da operação Zelo Micro SaaS
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {/* Seletor de Período (Foto 2 do Stitch) */}
                <div className={`inline-flex items-center rounded-full ${bgCard} p-1`}>
                  {(
                    [
                      { id: "hoje", label: "Hoje" },
                      { id: "7d", label: "7d" },
                      { id: "30d", label: "30d" },
                      { id: "mes", label: "Mês Atual" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriodo(p.id)}
                      className={`h-8 rounded-full px-3.5 text-xs font-semibold transition-all ${
                        periodo === p.id
                          ? pillActive
                          : `${textMuted} hover:opacity-80`
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <a
                  href="/super-admin/export"
                  download
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full ${bgCard} px-4 text-xs font-semibold hover:opacity-90`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar .CSV</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyForAi}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7844] px-4 text-xs font-bold text-white shadow-sm hover:opacity-95"
                >
                  {copiedAi ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedAi ? "Copiado!" : "Copiar p/ IA (Prompt)"}</span>
                </button>
              </div>

              {/* Botão Ações Rápidas (Foto 2 do Stitch) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setQuickActionsOpen((v) => !v)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full ${pillActive} px-4 text-xs font-bold shadow-sm hover:opacity-95`}
                >
                  <Zap className="h-3.5 w-3.5 text-[#FF5A1F]" />
                  <span>Ações Rápidas</span>
                </button>
                {quickActionsOpen && (
                  <div
                    className={`absolute right-0 top-11 z-40 w-52 rounded-2xl ${bgCard} p-1.5 shadow-xl border ${dividerBorder} space-y-1 text-left`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroSemaforo("vermelho");
                        setTab("lojas");
                        setQuickActionsOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      <span>Ver Lojas Críticas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("infra");
                        setQuickActionsOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                    >
                      <Server className="h-3.5 w-3.5 text-[#FF5A1F]" />
                      <span>Ver Infra &amp; Webhooks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyForAi();
                        setQuickActionsOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${darkMode ? "hover:bg-white/8" : "hover:bg-black/5"}`}
                    >
                      <Copy className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copiar Prompt p/ IA</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {feedback && (
            <div className={`rounded-2xl ${badgeEmerald} px-4 py-3 text-xs font-semibold flex items-center justify-between gap-2`}>
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

          {tab === "visao" && (() => {
            const custoGatewayCentavos = Math.max(
              0,
              data.kpis.mrrBrutoCentavos - data.kpis.mrrLiquidoCentavos
            );
            const margemPct =
              data.kpis.mrrBrutoCentavos > 0
                ? (
                    (data.kpis.mrrLiquidoCentavos /
                      data.kpis.mrrBrutoCentavos) *
                    100
                  ).toFixed(1)
                : "0.0";
            const metaMensalCentavos = 2_000_000; // R$ 20.000
            const metaPct = (
              (data.kpis.mrrBrutoCentavos / metaMensalCentavos) *
              100
            ).toFixed(1);
            const nowMs = Date.now();
            const startOfMonthMs = new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ).getTime();
            const periodoCutoffMs =
              periodo === "hoje"
                ? nowMs - 86_400_000
                : periodo === "7d"
                  ? nowMs - 7 * 86_400_000
                  : periodo === "30d"
                    ? nowMs - 30 * 86_400_000
                    : startOfMonthMs;
            const periodoLabel =
              periodo === "hoje"
                ? "hoje"
                : periodo === "7d"
                  ? "nesta semana"
                  : periodo === "30d"
                    ? "nos últimos 30d"
                    : "neste mês";
            const novasNoPeriodo = data.lojas.filter(
              (l) => Date.parse(l.created_at) >= periodoCutoffMs
            ).length;

            // Sparkline real baseada no histórico de crescimento das lojas (6 intervalos)
            const bucketCount = 6;
            const spanMs = Math.max(86_400_000, nowMs - periodoCutoffMs);
            const stepMs = spanMs / bucketCount;
            const sparkValues = Array.from({ length: bucketCount }, (_, idx) => {
              const bucketEnd = periodoCutoffMs + (idx + 1) * stepMs;
              return data.lojas.filter(
                (l) => Date.parse(l.created_at) <= bucketEnd
              ).length;
            });
            const sparkMax = Math.max(1, ...sparkValues);
            const sparkPoints = sparkValues
              .map((v, idx) => {
                const x = Math.round((idx / (bucketCount - 1)) * 60) + 2;
                const y = Math.round(22 - (v / sparkMax) * 18);
                return `${idx === 0 ? "M" : "L"}${x} ${y}`;
              })
              .join(" ");

            const sobRadar =
              data.semaforoResumo.vermelho + data.semaforoResumo.amarelo;

            return (
            <div className="space-y-4">
              {/* Row 1: 4 KPI Cards (Idêntico ao Stitch Finexy) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. MRR Bruto Mensal */}
                <div className={`min-h-[188px] rounded-3xl ${bgCard} p-6 flex flex-col justify-between gap-4`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${textMuted}`}>
                        MRR Bruto Mensal
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full ${badgeEmerald} px-2.5 py-0.5 text-[10px] font-bold font-mono-num`}>
                        ↑ {data.kpis.conversaoTrialPct}% conv.
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono-num text-2xl sm:text-3xl font-extrabold tracking-tight">
                          {formatBRL(data.kpis.mrrBrutoCentavos)}
                        </div>
                        <p className={`text-[11px] ${textMuted} mt-0.5`}>
                          m/m fechamento
                        </p>
                      </div>
                      <svg
                        viewBox="0 0 64 26"
                        className="h-7 w-14 shrink-0 text-emerald-500"
                        fill="none"
                        role="img"
                        aria-label={`Tendência da base (${sparkValues.join(", ")})`}
                      >
                        <title>{`Lojas acumuladas no período: ${sparkValues.join(" → ")}`}</title>
                        <path
                          d={sparkPoints}
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className={`pt-2.5 border-t ${dividerBorder} flex items-center justify-between gap-2 text-[11px] font-mono-num`}>
                    <span className={textMuted}>Meta: R$ 20.000</span>
                    <span className="font-bold">{metaPct}% atingido</span>
                  </div>
                </div>

                {/* 2. Lucro Líquido Real (Hero Laranja) */}
                <div className="min-h-[188px] rounded-3xl bg-gradient-to-br from-[#FF5A1F] to-[#FF6D2F] p-6 text-white shadow-[0_10px_28px_rgba(255,90,31,0.22)] flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white/95">
                        Lucro Líquido Real
                      </span>
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold font-mono-num">
                        Margem {margemPct}%
                      </span>
                    </div>

                    <div>
                      <div className="font-mono-num text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {formatBRL(data.kpis.mrrLiquidoCentavos)}
                      </div>
                      <p className="text-[11px] text-white/85 mt-0.5">
                        Pós Gateway Asaas (R$ 1,99/tx) &amp; Infra
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/20 grid grid-cols-2 gap-2 text-[11px] font-mono-num text-white/95">
                    <span>
                      Custo Gateway: {formatBRL(custoGatewayCentavos)}
                    </span>
                    <span className="text-right">Infra: R$ 0</span>
                  </div>
                </div>

                {/* 3. Base de Lojas */}
                <div className={`min-h-[188px] rounded-3xl ${bgCard} p-6 flex flex-col justify-between gap-4`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${textMuted}`}>
                        Base de Lojas
                      </span>
                      <span className={`rounded-full ${bgSub} px-2.5 py-0.5 text-[10px] font-bold font-mono-num`}>
                        Conv. {data.kpis.conversaoTrialPct}%
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5 font-mono-num pt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold">
                        {data.kpis.lojasAtivas}
                      </span>
                      <span className={`text-xs ${textMuted}`}>ativas</span>
                      <span className={`text-xs ${textMuted}`}>/</span>
                      <span className="text-xl font-bold">
                        {data.kpis.lojasTrial}
                      </span>
                      <span className={`text-xs ${textMuted}`}>trial</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className={`h-1.5 w-full rounded-full ${trackBg} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full ${barFill}`}
                        style={{
                          width: `${Math.max(
                            data.kpis.lojasAtivas > 0 ? 12 : 6,
                            Math.round(
                              (data.kpis.lojasAtivas /
                                Math.max(1, data.kpis.totalLojas)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono-num">
                      <span className={textMuted}>
                        +{novasNoPeriodo} lojas {periodoLabel}
                      </span>
                      <span className={`font-bold ${textEmerald}`}>
                        Capacidade Alta
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Churn Mensal */}
                <div className={`min-h-[188px] rounded-3xl ${bgCard} p-6 flex flex-col justify-between gap-4`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${textMuted}`}>
                        Churn Mensal
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono-num ${
                          data.semaforoResumo.vermelho > 0
                            ? "${badgeRose}"
                            : "${badgeAmber}"
                        }`}
                      >
                        • {sobRadar} sob radar
                      </span>
                    </div>

                    <div>
                      <div className="font-mono-num text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {data.kpis.churnPct}%
                      </div>
                      <p className={`text-[11px] ${textMuted} mt-0.5`}>
                        Benchmark seguro (&lt; 2,5%)
                      </p>
                    </div>
                  </div>

                  <div className={`pt-2.5 border-t ${dividerBorder} flex items-center justify-between gap-2 text-[11px]`}>
                    <span className={textMuted}>Inadimplência</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono-num font-bold ${
                        data.kpis.lojasAtrasadas > 0
                          ? "${badgeRose}"
                          : "${badgeAmber}"
                      }`}
                    >
                      {data.kpis.lojasAtrasadas}{" "}
                      {data.kpis.lojasAtrasadas === 1
                        ? "fatura pendente"
                        : "faturas pendentes"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: 3-Column Bento (Funil + Radar + Capacidade) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {/* Funil de Ativação */}
                <section className={`rounded-3xl ${bgCard} p-5 space-y-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold">
                        Funil de Ativação (14 dias)
                      </h2>
                      <p className={`text-[11px] ${textMuted}`}>
                        Jornada de onboarding
                      </p>
                    </div>
                    <span className={`rounded-full ${bgSub} px-2.5 py-0.5 text-[10px] font-semibold ${textMuted}`}>
                      Coorte 14d
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { code: "01", label: "Cadastradas", val: data.funil14d.cadastradas },
                      { code: "02", label: "Com Serviços", val: data.funil14d.comServicos },
                      {
                        code: "03",
                        label: "Com 1º Agendamento",
                        val: data.funil14d.comPrimeiroAgendamento,
                      },
                      { code: "04", label: "Assinantes Pagos", val: data.funil14d.assinantes },
                    ].map((step) => {
                      const pct = Math.round((step.val / funilMax) * 100);
                      return (
                        <div
                          key={step.code}
                          className={`rounded-2xl ${bgSub} px-3.5 py-2.5 space-y-1.5`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">
                              <span className={`font-mono-num mr-1.5 ${textMuted}`}>
                                {step.code}
                              </span>
                              {step.label}
                            </span>
                            <span className="font-mono-num font-bold">
                              {step.val}{" "}
                              <span className={`font-normal ${textMuted}`}>
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className={`h-1.5 w-full rounded-full ${trackBg} overflow-hidden`}>
                            <div
                              className={`h-full rounded-full ${barFill}`}
                              style={{
                                width: `${Math.max(step.val > 0 ? 8 : 0, pct)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Radar Geográfico */}
                <section className={`rounded-3xl ${bgCard} p-5 space-y-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold">Radar Geográfico</h2>
                      <p className={`text-[11px] ${textMuted}`}>
                        Concentração por cidade
                      </p>
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
                    <p className={`text-xs ${textMuted} py-4`}>
                      Sem cidades registradas ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.cidadesRadar.slice(0, 4).map((c, idx) => (
                        <div
                          key={c.cidade}
                          className={`flex items-center justify-between rounded-2xl ${bgSub} px-3.5 py-3 text-xs`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold truncate">
                              #{idx + 1} {c.cidade}
                            </p>
                            <p className={`text-[11px] font-mono-num ${textMuted}`}>
                              {c.agendamentos30d} agendamentos / 30d
                            </p>
                          </div>
                          <span className={`rounded-full ${bgCard} px-2.5 py-1 font-mono-num text-[11px] font-bold shrink-0`}>
                            {c.lojas} lojas
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Capacidade & Provedores */}
                <section className={`rounded-3xl ${bgCard} p-5 space-y-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold">
                        Capacidade &amp; Provedores
                      </h2>
                      <p className={`text-[11px] ${textMuted}`}>
                        Uso real Free Tier
                      </p>
                    </div>
                    <span className={`rounded-full ${badgeEmerald} px-2.5 py-0.5 text-[10px] font-bold`}>
                      Custo Zero
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className={`rounded-2xl ${bgSub} p-3.5 space-y-1`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">Agendamentos Totais</span>
                        <span className="font-mono-num font-bold">
                          {data.infra.agendamentosTotal}
                        </span>
                      </div>
                      <p className={`text-[11px] ${textMuted}`}>
                        Postgres Supabase (limite Free 500 MB)
                      </p>
                    </div>

                    <div className={`rounded-2xl ${bgSub} p-3.5 space-y-1`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">Dispositivos Web Push</span>
                        <span className="font-mono-num font-bold">
                          {data.infra.pushSubscriptions}
                        </span>
                      </div>
                      <p className={`text-[11px] ${textMuted}`}>
                        Notificações PWA sem custo (VAPID)
                      </p>
                    </div>

                    <div className={`rounded-2xl ${bgSub} p-3.5 space-y-1`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">Webhooks Asaas</span>
                        <span className="font-mono-num font-bold">
                          {data.infra.webhooksRecentes.length}
                        </span>
                      </div>
                      <p className={`text-[11px] ${textMuted}`}>
                        Eventos recentes idempotentes
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Row 3: Full-Width Table (Semáforo das Lojas) */}
              {renderSemaforoTable(8)}

              {/* Row 4: Infra Live Footer Strip */}
              <div className={`rounded-2xl ${bgCard} px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-num`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-bold uppercase ${textMuted}`}>
                    Infra Live:
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full ${bgSub} px-2.5 py-1`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Auth Supabase (OK)
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full ${bgSub} px-2.5 py-1`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Web Push PWA ({data.infra.pushSubscriptions})
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full ${bgSub} px-2.5 py-1`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Webhooks Asaas ({data.infra.webhooksRecentes.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => selectTab("infra")}
                  className="font-semibold text-[#FF5A1F] hover:underline"
                >
                  Ver Logs Técnicos
                </button>
              </div>
            </div>
            );
          })()}

          {tab === "lojas" && renderSemaforoTable()}

          {tab === "crescimento" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <section className={`md:col-span-5 rounded-3xl ${bgCard} p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">
                    Funil de Ativação (14 dias)
                  </h2>
                  <span className={`text-[11px] font-mono-num ${textMuted}`}>
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
                      <div className={`h-2 w-full rounded-full ${trackBg} overflow-hidden`}>
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

              <section className={`md:col-span-7 rounded-3xl ${bgCard} p-5 space-y-4`}>
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
                          className={`rounded-2xl ${bgSub} px-3.5 py-3 space-y-2`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`font-mono-num text-xs ${textMuted} w-5`}>
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
                              <span className={textMuted}>
                                {c.agendamentos30d} agend.
                              </span>
                            </div>
                          </div>
                          <div className={`h-1.5 w-full rounded-full ${trackBg} overflow-hidden`}>
                            <div
                              className={`h-full rounded-full ${barFill}`}
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
                <div className={`rounded-3xl ${bgCard} p-4 space-y-1`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
                    Agendamentos Totais
                  </span>
                  <div className="font-mono-num text-2xl font-extrabold">
                    {data.infra.agendamentosTotal}
                  </div>
                  <span className={`text-[11px] ${textMuted}`}>
                    Banco Postgres Free
                  </span>
                </div>
                <div className={`rounded-3xl ${bgCard} p-4 space-y-1`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
                    Dispositivos Push
                  </span>
                  <div className="font-mono-num text-2xl font-extrabold">
                    {data.infra.pushSubscriptions}
                  </div>
                  <span className={`text-[11px] ${textMuted}`}>
                    Web Push VAPID
                  </span>
                </div>
                <div className={`col-span-2 sm:col-span-1 rounded-3xl ${bgCard} p-4 space-y-1`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
                    Webhooks Asaas
                  </span>
                  <div className="font-mono-num text-2xl font-extrabold">
                    {data.infra.webhooksRecentes.length}
                  </div>
                  <span className={`text-[11px] ${textMuted}`}>
                    Últimos eventos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <section className={`rounded-3xl ${bgCard} p-5 space-y-3`}>
                  <h2 className="text-sm font-bold">
                    Webhooks Recentes (Idempotência)
                  </h2>
                  {data.infra.webhooksRecentes.length === 0 ? (
                    <p className={`text-xs ${textMuted}`}>
                      Nenhum evento de webhook recebido ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.infra.webhooksRecentes.map((w) => (
                        <div
                          key={w.id}
                          className={`flex items-center justify-between gap-2 rounded-2xl ${bgSub} px-3.5 py-2.5 text-xs`}
                        >
                          <div className="min-w-0">
                            <span className="font-mono-num font-semibold block truncate">
                              {w.event_type}
                            </span>
                            <span className={`font-mono-num text-[10px] ${textMuted} block truncate`}>
                              {w.id}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeEmerald}`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{formatDateBr(w.processed_at)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`rounded-3xl ${bgCard} p-5 space-y-3`}>
                  <h2 className="text-sm font-bold">
                    Log de Auditoria do Fundador
                  </h2>
                  {data.infra.auditLogsRecentes.length === 0 ? (
                    <p className={`text-xs ${textMuted}`}>
                      Nenhuma ação administrativa registrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.infra.auditLogsRecentes.map((log) => (
                        <div
                          key={log.id}
                          className={`flex items-center justify-between gap-2 rounded-2xl ${bgSub} px-3.5 py-2.5 text-xs`}
                        >
                          <span className="font-mono-num font-semibold">
                            {log.acao}
                          </span>
                          <span className={`font-mono-num text-[11px] ${textMuted}`}>
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

      {/* Mobile iPhone Floating Pill Dock */}
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
