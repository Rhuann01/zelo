"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  Flag,
  Pencil,
  QrCode,
  Scissors,
  Store,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { atualizarMetaSemanalAction } from "@/app/painel/financeiro/actions";
import { sanitizeCsvCell } from "@/lib/security/sanitize-next";

export interface FinanceiroAgendamentoItem {
  id: string;
  inicio: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado" | "no_show";
  total_centavos: number;
  sinal_centavos: number;
  profissional_id: string;
  profissional_nome: string;
  profissional_comissao_pct: number;
  profissional_user_id: string | null;
  cliente_nome: string;
  servicos_label: string;
}

export interface FinanceiroProfissionalItem {
  id: string;
  nome: string;
  comissao_pct: number;
  meta_semanal_centavos: number;
  eh_dono: boolean;
  user_id: string | null;
}

type Periodo = "hoje" | "semana" | "mes";

function formatMoney(centavos: number) {
  const reais = (centavos / 100).toFixed(2).replace(".", ",");
  const [intPart, decPart] = reais.split(",");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedInt},${decPart}`;
}

function formatBRL(centavos: number) {
  return `R$ ${formatMoney(centavos)}`;
}

function getSaoPauloYmd(date: Date) {
  const sp = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const y = sp.getUTCFullYear();
  const m = String(sp.getUTCMonth() + 1).padStart(2, "0");
  const d = String(sp.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function FinanceiroDashboard({
  lojaId,
  lojaNome,
  chavePixLoja,
  isOwner,
  currentUserId,
  profissionais,
  agendamentos,
}: {
  lojaId: string;
  lojaNome: string;
  chavePixLoja: string | null;
  isOwner: boolean;
  currentUserId: string;
  profissionais: FinanceiroProfissionalItem[];
  agendamentos: FinanceiroAgendamentoItem[];
}) {
  const [view, setView] = useState<"bolso" | "caixa">("bolso");
  const [periodo, setPeriodo] = useState<Periodo>("hoje");

  const todayYmd = useMemo(() => getSaoPauloYmd(new Date()), []);

  const periodItems = useMemo(() => {
    const now = Date.now();
    const weekAgoMs = now - 7 * 86_400_000;
    const monthAgoMs = now - 30 * 86_400_000;

    return agendamentos.filter((ag) => {
      if (ag.status === "cancelado" || ag.status === "no_show") return false;
      const agDate = new Date(ag.inicio);
      if (periodo === "hoje") {
        return getSaoPauloYmd(agDate) === todayYmd;
      }
      if (periodo === "semana") {
        return agDate.getTime() >= weekAgoMs;
      }
      return agDate.getTime() >= monthAgoMs;
    });
  }, [agendamentos, periodo, todayYmd]);

  const myProf = useMemo(
    () =>
      profissionais.find((p) => p.user_id === currentUserId) ??
      (isOwner ? profissionais.find((p) => p.eh_dono) ?? profissionais[0] : undefined),
    [profissionais, currentUserId, isOwner]
  );

  // Meu Bolso: atendimentos do profissional logado (ou do dono se também atende)
  const myItems = useMemo(() => {
    if (!myProf) return [];
    return periodItems.filter((ag) => ag.profissional_id === myProf.id);
  }, [periodItems, myProf]);

  const myConcluidos = useMemo(
    () => myItems.filter((ag) => ag.status === "concluido"),
    [myItems]
  );

  const myPrevistos = useMemo(
    () => myItems.filter((ag) => ag.status === "confirmado" || ag.status === "pendente"),
    [myItems]
  );

  const myLiquidoCentavos = useMemo(
    () =>
      myConcluidos.reduce(
        (acc, ag) =>
          acc + Math.round((ag.total_centavos * ag.profissional_comissao_pct) / 100),
        0
      ),
    [myConcluidos]
  );

  const myPrevistoCentavos = useMemo(
    () =>
      myPrevistos.reduce(
        (acc, ag) =>
          acc + Math.round((ag.total_centavos * ag.profissional_comissao_pct) / 100),
        0
      ),
    [myPrevistos]
  );

  const myTicketMedioCentavos =
    myConcluidos.length > 0
      ? Math.round(
          myConcluidos.reduce((acc, ag) => acc + ag.total_centavos, 0) /
            myConcluidos.length
        )
      : 0;

  // Meta Semanal (últimos 7 dias concluídos)
  const [metaSemanalCentavos, setMetaSemanalCentavos] = useState(
    myProf?.meta_semanal_centavos ?? 150_000
  );
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(
    String(((myProf?.meta_semanal_centavos ?? 150_000) / 100).toFixed(2)).replace(".", ",")
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    const val = myProf?.meta_semanal_centavos ?? 150_000;
    setMetaSemanalCentavos(val);
    setMetaInput((val / 100).toFixed(2).replace(".", ","));
  }, [myProf?.meta_semanal_centavos]);

  async function handleSaveMeta() {
    setMetaError(null);
    const normalized = metaInput.replace(/\./g, "").replace(",", ".").trim();
    const reais = Number(normalized);
    if (!Number.isFinite(reais) || reais < 0 || reais > 1_000_000) {
      setMetaError("Informe um valor válido em reais.");
      return;
    }
    const metaCentavos = Math.round(reais * 100);
    setSavingMeta(true);
    const res = await atualizarMetaSemanalAction({ lojaId, metaCentavos });
    setSavingMeta(false);
    if (!res.ok) {
      setMetaError(res.error ?? "Erro ao salvar meta.");
      return;
    }
    setMetaSemanalCentavos(metaCentavos);
    setEditingMeta(false);
  }

  const semanaLiquidoCentavos = useMemo(() => {
    const weekAgoMs = Date.now() - 7 * 86_400_000;
    return agendamentos
      .filter(
        (ag) =>
          ag.status === "concluido" &&
          (!myProf || ag.profissional_id === myProf.id) &&
          new Date(ag.inicio).getTime() >= weekAgoMs
      )
      .reduce(
        (acc, ag) =>
          acc + Math.round((ag.total_centavos * ag.profissional_comissao_pct) / 100),
        0
      );
  }, [agendamentos, myProf]);

  const metaPct =
    metaSemanalCentavos > 0
      ? Math.min(100, Math.round((semanaLiquidoCentavos / metaSemanalCentavos) * 100))
      : 100;
  const metaFaltaCentavos = Math.max(0, metaSemanalCentavos - semanaLiquidoCentavos);

  // Caixa da Casa (Dono)
  const houseConcluidos = useMemo(
    () => periodItems.filter((ag) => ag.status === "concluido"),
    [periodItems]
  );
  const houseBrutoCentavos = useMemo(
    () => houseConcluidos.reduce((acc, ag) => acc + ag.total_centavos, 0),
    [houseConcluidos]
  );
  const housePrevistoCentavos = useMemo(
    () =>
      periodItems
        .filter((ag) => ag.status === "confirmado" || ag.status === "pendente")
        .reduce((acc, ag) => acc + ag.total_centavos, 0),
    [periodItems]
  );

  const fechamentoEquipe = useMemo(() => {
    const map = new Map<
      string,
      { nome: string; pct: number; repasse: number; bruto: number; qtd: number }
    >();
    for (const p of profissionais) {
      map.set(p.id, {
        nome: p.nome,
        pct: p.comissao_pct,
        repasse: 0,
        bruto: 0,
        qtd: 0,
      });
    }
    for (const ag of houseConcluidos) {
      const current = map.get(ag.profissional_id) ?? {
        nome: ag.profissional_nome,
        pct: ag.profissional_comissao_pct,
        repasse: 0,
        bruto: 0,
        qtd: 0,
      };
      current.bruto += ag.total_centavos;
      current.repasse += Math.round((ag.total_centavos * current.pct) / 100);
      current.qtd += 1;
      map.set(ag.profissional_id, current);
    }
    return Array.from(map.values()).filter((x) => x.qtd > 0 || profissionais.length <= 4);
  }, [profissionais, houseConcluidos]);

  const totalRepasseEquipe = useMemo(
    () => fechamentoEquipe.reduce((acc, item) => acc + item.repasse, 0),
    [fechamentoEquipe]
  );
  const retencaoCasaCentavos = Math.max(0, houseBrutoCentavos - totalRepasseEquipe);

  function handleExportCsv() {
    const rows = [
      ["Data/Hora", "Cliente", "Profissional", "Serviços", "Status", "Total (R$)", "Repasse (%)"],
      ...(view === "caixa" && isOwner ? periodItems : myItems).map((ag) => [
        new Date(ag.inicio).toLocaleString("pt-BR"),
        ag.cliente_nome,
        ag.profissional_nome,
        ag.servicos_label,
        ag.status,
        (ag.total_centavos / 100).toFixed(2).replace(".", ","),
        String(ag.profissional_comissao_pct),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => sanitizeCsvCell(c)).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zelo-ganhos-${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodoLabel =
    periodo === "hoje" ? "Hoje" : periodo === "semana" ? "Últimos 7 dias" : "Últimos 30 dias";

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Segmented Control: Meu Bolso vs Caixa da Casa */}
      <div className="flex items-center justify-between gap-2">
        {isOwner ? (
          <div className="flex flex-1 items-center gap-1 rounded-2xl bg-[var(--zelo-soft)] p-1">
            <button
              type="button"
              onClick={() => setView("bolso")}
              className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                view === "bolso"
                  ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
                  : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Meu Bolso</span>
            </button>
            <button
              type="button"
              onClick={() => setView("caixa")}
              className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                view === "caixa"
                  ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
                  : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Caixa da Casa</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#10B981]" />
            <h1 className="text-lg font-bold">Meu Bolso</h1>
          </div>
        )}
      </div>

      {/* Period Filter Pills */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--zelo-muted)]">
          {lojaNome} • {periodoLabel}
        </span>
        <div className="inline-flex rounded-xl bg-[var(--zelo-soft)] p-1">
          {(
            [
              { id: "hoje", label: "Hoje" },
              { id: "semana", label: "7 dias" },
              { id: "mes", label: "30 dias" },
            ] as const
          ).map((p) => {
            const active = periodo === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs"
                    : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div key={`${view}-${periodo}`} className="zelo-panel-enter flex flex-col gap-4">
      {view === "bolso" ? (
        <>
          {/* Hero Dark Card: Ganhos Líquidos */}
          <section
            style={{ backgroundColor: "#121214", color: "#FFFFFF" }}
            className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
          >
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />

            <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-[13px] font-medium text-neutral-300">
                  Ganhos Líquidos ({periodoLabel})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 font-mono-num text-[11px] font-semibold text-amber-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{myProf ? `${myProf.comissao_pct}%` : "100%"}</span>
              </span>
            </div>

            <div className="relative z-10 mt-1 mb-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-neutral-400">R$</span>
                <span className="font-mono-num text-4xl font-extrabold tracking-tight text-white">
                  {formatMoney(myLiquidoCentavos)}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                {myPrevistoCentavos > 0
                  ? `+ ${formatBRL(myPrevistoCentavos)} previstos em atendimentos agendados`
                  : "Conclua atendimentos na Agenda para somar seus ganhos"}
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-3.5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Atendimentos
                </span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-mono-num text-lg font-bold text-white">
                    {myConcluidos.length}
                  </span>
                  <span className="text-xs text-neutral-400">finalizados</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Ticket Médio
                </span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-mono-num text-xs font-medium text-amber-400">
                    R$
                  </span>
                  <span className="font-mono-num text-lg font-bold text-white">
                    {formatMoney(myTicketMedioCentavos)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Extrato de Serviços */}
          <section className="flex flex-col gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[15px] font-bold text-[var(--zelo-ink)]">
                Extrato de Serviços
              </h2>
              <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
                {myConcluidos.length}{" "}
                {myConcluidos.length === 1 ? "concluído" : "concluídos"}
              </span>
            </div>

            {myConcluidos.length === 0 ? (
              <div className="rounded-xl bg-[var(--zelo-soft)] p-5 text-center text-xs text-[var(--zelo-muted)]">
                Nenhum atendimento finalizado neste período.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myConcluidos.map((ag) => {
                  const hora = new Date(ag.inicio).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={ag.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--zelo-soft)] p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs">
                          <Scissors className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--zelo-ink)]">
                            {ag.servicos_label}
                          </p>
                          <p className="truncate text-xs text-[var(--zelo-muted)]">
                            {ag.cliente_nome} • {hora}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono-num text-sm font-bold text-[var(--zelo-ink)]">
                          {formatBRL(ag.total_centavos)}
                        </p>
                        <span className="mt-0.5 inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          Repasse {ag.profissional_comissao_pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Card Meta Pessoal Semanal */}
          <section className="flex flex-col gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Flag className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
                <span className="text-sm font-bold text-[var(--zelo-ink)] truncate">
                  Meta Pessoal Semanal
                </span>
              </div>
              {!editingMeta && (
                <button
                  type="button"
                  onClick={() => {
                    setMetaError(null);
                    setEditingMeta(true);
                  }}
                  className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--zelo-ink)] transition hover:opacity-80"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Editar</span>
                </button>
              )}
            </div>

            {editingMeta ? (
              <div className="flex flex-col gap-2 rounded-xl bg-[var(--zelo-soft)] p-3">
                <label className="text-xs font-semibold text-[var(--zelo-muted)]">
                  Definir meta semanal (R$)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={metaInput}
                    onChange={(e) => setMetaInput(e.target.value)}
                    placeholder="1500,00"
                    className="min-h-[44px] flex-1 rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] px-3 text-sm font-mono-num font-semibold text-[var(--zelo-ink)] outline-none focus:border-[var(--zelo-ink)]"
                  />
                  <button
                    type="button"
                    disabled={savingMeta}
                    onClick={handleSaveMeta}
                    aria-label="Salvar meta"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={savingMeta}
                    onClick={() => {
                      setEditingMeta(false);
                      setMetaError(null);
                    }}
                    aria-label="Cancelar"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--zelo-card)] px-3 text-xs font-semibold text-[var(--zelo-muted)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {metaError && (
                  <p className="text-xs font-medium text-rose-500">{metaError}</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-mono-num font-bold text-[var(--zelo-ink)] whitespace-nowrap">
                    {formatBRL(semanaLiquidoCentavos)}
                  </span>
                  <span className="font-mono-num text-[var(--zelo-muted)] whitespace-nowrap">
                    Meta: {formatBRL(metaSemanalCentavos)}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--zelo-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--zelo-btn-bg)] transition-all duration-500"
                    style={{ width: `${metaPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[var(--zelo-muted)] whitespace-nowrap">
                    {metaPct}% atingido
                  </span>
                  <span className="font-semibold text-[var(--zelo-ink)] whitespace-nowrap">
                    {metaFaltaCentavos === 0 ? (
                      "Meta batida!"
                    ) : (
                      <>
                        Faltam{" "}
                        <strong className="font-mono-num">
                          {formatBRL(metaFaltaCentavos)}
                        </strong>
                      </>
                    )}
                  </span>
                </div>
              </>
            )}
          </section>
        </>
      ) : (
        /* VIEW: CAIXA DA CASA (Dono) */
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
              <span className="text-xs font-medium text-[var(--zelo-muted)]">
                Faturamento Bruto
              </span>
              <div className="mt-2">
                <span className="text-[11px] text-[var(--zelo-muted)]">R$</span>
                <p className="font-mono-num text-xl font-bold leading-tight text-[var(--zelo-ink)]">
                  {formatMoney(houseBrutoCentavos)}
                </p>
                <span className="mt-0.5 block font-mono-num text-[11px] font-medium text-amber-600">
                  {houseConcluidos.length}{" "}
                  {houseConcluidos.length === 1 ? "atendimento" : "atendimentos"}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
              <span className="text-xs font-medium text-[var(--zelo-muted)]">
                A Receber (Agenda)
              </span>
              <div className="mt-2">
                <span className="text-[11px] text-[var(--zelo-muted)]">R$</span>
                <p className="font-mono-num text-xl font-bold leading-tight text-[#10B981]">
                  {formatMoney(housePrevistoCentavos)}
                </p>
                <span className="mt-0.5 block text-[11px] text-[var(--zelo-muted)]">
                  Horários confirmados
                </span>
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-2.5 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--zelo-soft)] pb-2">
              <span className="text-[15px] font-bold text-[var(--zelo-ink)]">
                Fechamento Equipe
              </span>
              <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
                {periodoLabel}
              </span>
            </div>

            {fechamentoEquipe.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--zelo-muted)]">
                Nenhum atendimento concluído neste período.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {fechamentoEquipe.map((item) => (
                  <div
                    key={item.nome}
                    className="flex items-center justify-between rounded-xl bg-[var(--zelo-soft)] px-3 py-2.5"
                  >
                    <span className="text-xs font-semibold text-[var(--zelo-ink)]">
                      {item.nome} ({item.pct}%)
                    </span>
                    <span className="font-mono-num text-xs font-bold text-[var(--zelo-ink)]">
                      {formatBRL(item.repasse)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between rounded-xl bg-[var(--zelo-soft)] px-3.5 py-3">
              <span className="text-xs font-bold text-[var(--zelo-ink)]">
                Retenção da Loja
              </span>
              <span className="font-mono-num text-sm font-extrabold text-[var(--zelo-ink)]">
                {formatBRL(retencaoCasaCentavos)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[var(--zelo-muted)]">
              <span>Quer ajustar a % de comissão de cada profissional?</span>
              <Link
                href="/painel/gestao"
                className="shrink-0 font-semibold text-[var(--zelo-ink)] underline"
              >
                Ir para Gestão
              </Link>
            </div>
          </section>

          {/* Card PIX Geral da Loja */}
          <section className="flex flex-col gap-2 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <QrCode className="h-4 w-4 shrink-0 text-[#10B981]" />
                <span className="text-sm font-bold text-[var(--zelo-ink)] truncate">
                  PIX Geral da Loja (Patrão)
                </span>
              </div>
              <Link
                href="/painel/personalizar"
                className="shrink-0 text-xs font-semibold text-[var(--zelo-ink)] underline"
              >
                {chavePixLoja ? "Alterar" : "Configurar"}
              </Link>
            </div>
            {chavePixLoja ? (
              <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
                Chave salva:{" "}
                <strong className="font-mono-num text-[var(--zelo-ink)] break-all">
                  {chavePixLoja}
                </strong>
                . Os sinais caem direto nesta conta e o{" "}
                <strong>Fechamento Equipe</strong> acima mostra exatamente quanto
                repassar a cada profissional.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
                Nenhuma chave PIX configurada ainda. Cadastre em{" "}
                <strong>Personalizar</strong> para receber sinais direto na sua
                conta.
              </p>
            )}
          </section>
        </>
      )}
      </div>

      {/* Secondary Action: Export CSV */}
      <button
        type="button"
        onClick={handleExportCsv}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-soft)] px-4 text-sm font-semibold text-[var(--zelo-ink)] shadow-xs transition-colors hover:bg-[var(--zelo-border)]"
      >
        <Download className="h-4 w-4" />
        <span>Exportar Relatório (.CSV)</span>
      </button>
    </div>
  );
}
