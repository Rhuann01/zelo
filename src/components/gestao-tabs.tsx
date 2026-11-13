"use client";

import { useState, useTransition } from "react";
import {
  CalendarPlus,
  Clock,
  Loader2,
  Plus,
  Scissors,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Utensils,
} from "lucide-react";
import {
  convidarProfissionalAction,
  createBloqueioAction,
  deleteServicoAction,
  desligarProfissionalAction,
  saveHorariosAction,
  saveServicoAction,
  toggleDonoAtendeAction,
} from "@/app/painel/gestao/actions";

export interface ServicoRow {
  id: string;
  nome: string;
  descricao: string;
  duracao_min: number;
  preco_centavos: number;
  ativo: boolean;
}

export interface ProfissionalRow {
  id: string;
  nome: string;
  cargo: string;
  eh_dono: boolean;
  ativo: boolean;
  email_convite: string | null;
  comissao_percentual: number;
}

export interface BloqueioRow {
  id: string;
  inicio: string;
  fim: string;
  tipo: string;
  motivo: string;
}

interface DiaConfig {
  ativo: boolean;
  abre: string;
  fecha: string;
}

const DIAS_KEYS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const;

interface GestaoTabsProps {
  lojaId: string;
  plano: string;
  isOwner: boolean;
  horariosIniciais: Record<string, unknown>;
  servicos: ServicoRow[];
  profissionais: ProfissionalRow[];
  bloqueios: BloqueioRow[];
}

export function GestaoTabs({
  lojaId,
  plano,
  isOwner,
  horariosIniciais,
  servicos,
  profissionais,
  bloqueios,
}: GestaoTabsProps) {
  const [tab, setTab] = useState<"horarios" | "equipe" | "servicos">("horarios");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [semana, setSemana] = useState<Record<string, DiaConfig>>(() => {
    const out: Record<string, DiaConfig> = {};
    for (const d of DIAS_KEYS) {
      const saved = horariosIniciais[d.key] as Partial<DiaConfig> | undefined;
      out[d.key] = {
        ativo: saved?.ativo ?? d.key !== "dom",
        abre: saved?.abre ?? "09:00",
        fecha: saved?.fecha ?? "20:00",
      };
    }
    return out;
  });
  const [almocoAtivo, setAlmocoAtivo] = useState<boolean>(
    Boolean(horariosIniciais.almoco_ativo ?? true)
  );
  const [almocoInicio, setAlmocoInicio] = useState<string>(
    (horariosIniciais.almoco_inicio as string) || "12:30"
  );
  const [almocoFim, setAlmocoFim] = useState<string>(
    (horariosIniciais.almoco_fim as string) || "13:30"
  );

  const [espData, setEspData] = useState("");
  const [espInicio, setEspInicio] = useState("09:00");
  const [espFim, setEspFim] = useState("15:00");
  const [espTipo, setEspTipo] = useState<"dia_especial" | "folga" | "feriado">("dia_especial");
  const [espMotivo, setEspMotivo] = useState("");

  const [srvNome, setSrvNome] = useState("");
  const [srvDuracao, setSrvDuracao] = useState("35");
  const [srvPreco, setSrvPreco] = useState("45,00");

  const [convNome, setConvNome] = useState("");
  const [convEmail, setConvEmail] = useState("");
  const [convCargo, setConvCargo] = useState("Barbeiro");
  const [convComissao, setConvComissao] = useState("50");

  const donoProf = profissionais.find((p) => p.eh_dono);
  const outrosAtivos = profissionais.filter((p) => !p.eh_dono && p.ativo);

  function runAction(fn: () => Promise<{ error?: string; message?: string }>) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setFeedback(res.error);
      else if (res.message) setFeedback(res.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[var(--zelo-card)] p-1">
        <button
          type="button"
          onClick={() => setTab("horarios")}
          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
            tab === "horarios"
              ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
              : "text-[var(--zelo-muted)]"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Horários
        </button>
        <button
          type="button"
          onClick={() => setTab("equipe")}
          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
            tab === "equipe"
              ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
              : "text-[var(--zelo-muted)]"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Equipe ({profissionais.filter((p) => p.ativo).length})
        </button>
        <button
          type="button"
          onClick={() => setTab("servicos")}
          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
            tab === "servicos"
              ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
              : "text-[var(--zelo-muted)]"
          }`}
        >
          <Scissors className="h-3.5 w-3.5" />
          Serviços ({servicos.length})
        </button>
      </div>

      {!isOwner && (
        <div className="rounded-xl bg-[#F59E0B]/15 px-3.5 py-2.5 text-xs font-medium text-[#D97706]">
          Você está logado como Equipe. Apenas o proprietário pode editar serviços, equipe e horários da loja.
        </div>
      )}

      {feedback && (
        <div className="rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2.5 text-xs font-semibold">
          {feedback}
        </div>
      )}

      {tab === "horarios" && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Grade Semanal</h2>
              {isOwner && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAction(() =>
                      saveHorariosAction({
                        loja_id: lojaId,
                        ...semana,
                        almoco_ativo: almocoAtivo,
                        almoco_inicio: almocoInicio,
                        almoco_fim: almocoFim,
                      })
                    )
                  }
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)]"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar Grade
                </button>
              )}
            </div>

            <div className="space-y-2">
              {DIAS_KEYS.map(({ key, label }) => {
                const dia = semana[key];
                return (
                  <div
                    key={key}
                    className="flex min-h-[52px] items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 py-2"
                  >
                    <label className="flex min-h-[36px] shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        disabled={!isOwner}
                        checked={dia.ativo}
                        onChange={(e) =>
                          setSemana((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], ativo: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 accent-[#111111]"
                      />
                      <span className="w-7">{label}</span>
                    </label>
                    {dia.ativo ? (
                      <div className="flex shrink-0 items-center gap-1.5 font-mono-num text-xs">
                        <input
                          type="time"
                          disabled={!isOwner}
                          value={dia.abre}
                          onChange={(e) =>
                            setSemana((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], abre: e.target.value },
                            }))
                          }
                          className="h-9 w-[92px] rounded-lg bg-[var(--zelo-card)] px-2 text-center text-xs outline-none"
                        />
                        <span className="text-[var(--zelo-muted)]">–</span>
                        <input
                          type="time"
                          disabled={!isOwner}
                          value={dia.fecha}
                          onChange={(e) =>
                            setSemana((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], fecha: e.target.value },
                            }))
                          }
                          className="h-9 w-[92px] rounded-lg bg-[var(--zelo-card)] px-2 text-center text-xs outline-none"
                        />
                      </div>
                    ) : (
                      <span className="px-2 text-xs text-[var(--zelo-muted)]">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 py-2">
              <label className="flex min-h-[36px] shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={almocoAtivo}
                  onChange={(e) => setAlmocoAtivo(e.target.checked)}
                  className="h-4 w-4 accent-[#111111]"
                />
                <Utensils className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Almoço</span>
              </label>
              {almocoAtivo && (
                <div className="flex shrink-0 items-center gap-1.5 font-mono-num text-xs">
                  <input
                    type="time"
                    disabled={!isOwner}
                    value={almocoInicio}
                    onChange={(e) => setAlmocoInicio(e.target.value)}
                    className="h-9 w-[92px] rounded-lg bg-[var(--zelo-card)] px-2 text-center text-xs outline-none"
                  />
                  <span className="text-[var(--zelo-muted)]">–</span>
                  <input
                    type="time"
                    disabled={!isOwner}
                    value={almocoFim}
                    onChange={(e) => setAlmocoFim(e.target.value)}
                    className="h-9 w-[92px] rounded-lg bg-[var(--zelo-card)] px-2 text-center text-xs outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {isOwner && (
            <section className="rounded-2xl bg-[#F59E0B]/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-[#D97706]" />
                <h2 className="text-sm font-bold">Abrir Dia Especial ou Bloqueio</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={espTipo}
                  onChange={(e) => setEspTipo(e.target.value as "dia_especial" | "folga" | "feriado")}
                  className="h-11 rounded-xl bg-[var(--zelo-card)] px-3 text-xs font-medium outline-none"
                >
                  <option value="dia_especial">Dia Especial Aberto</option>
                  <option value="folga">Folga / Bloqueio</option>
                  <option value="feriado">Feriado (Fechado)</option>
                </select>
                <input
                  type="date"
                  value={espData}
                  onChange={(e) => setEspData(e.target.value)}
                  className="h-11 rounded-xl bg-[var(--zelo-card)] px-3 text-xs font-mono-num outline-none"
                />
                <input
                  type="time"
                  value={espInicio}
                  onChange={(e) => setEspInicio(e.target.value)}
                  className="h-11 rounded-xl bg-[var(--zelo-card)] px-3 text-xs font-mono-num outline-none"
                />
                <input
                  type="time"
                  value={espFim}
                  onChange={(e) => setEspFim(e.target.value)}
                  className="h-11 rounded-xl bg-[var(--zelo-card)] px-3 text-xs font-mono-num outline-none"
                />
              </div>
              <input
                type="text"
                value={espMotivo}
                onChange={(e) => setEspMotivo(e.target.value)}
                placeholder="Motivo (ex: Domingo pré-feriado)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-card)] px-3 text-xs outline-none"
              />
              <button
                type="button"
                disabled={isPending || !espData}
                onClick={() =>
                  runAction(async () => {
                    const res = await createBloqueioAction({
                      loja_id: lojaId,
                      data: espData,
                      hora_inicio: espInicio,
                      hora_fim: espFim,
                      tipo: espTipo,
                      motivo: espMotivo,
                    });
                    if (res.ok) {
                      setEspMotivo("");
                      return { message: "Exceção de agenda registrada." };
                    }
                    return res;
                  })
                }
                className="h-11 w-full rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-50"
              >
                Registrar na Agenda
              </button>

              {bloqueios.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {bloqueios.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl bg-[var(--zelo-card)] px-3 py-2 text-xs"
                    >
                      <span className="font-medium">
                        {b.motivo || b.tipo} ({b.tipo})
                      </span>
                      <span className="font-mono-num text-[11px] text-[var(--zelo-muted)]">
                        {new Date(b.inicio).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {tab === "equipe" && (
        <div className="space-y-4">
          {donoProf && (
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <UserCheck className="h-4 w-4 text-[#10B981]" />
                  Também atendo clientes
                </div>
                <p className="text-xs text-[var(--zelo-muted)]">
                  Exibe ou oculta você na lista de profissionais da loja sem perder seu histórico.
                </p>
              </div>
              <button
                type="button"
                disabled={!isOwner || isPending}
                onClick={() =>
                  runAction(() => toggleDonoAtendeAction(lojaId, donoProf.id, !donoProf.ativo))
                }
                className="inline-flex min-h-[44px] shrink-0 items-center px-1"
                aria-label="Alternar atendimento do proprietário"
              >
                <span
                  className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
                    donoProf.ativo ? "bg-[#10B981]" : "bg-[var(--zelo-soft)]"
                  }`}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-white shadow-xs transition-transform ${
                      donoProf.ativo ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </section>
          )}

          <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-2.5">
            <h2 className="text-sm font-bold">Membros da Loja</h2>
            {profissionais.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {p.nome} {p.eh_dono ? "(Dono)" : ""}
                  </p>
                  <p className="text-xs text-[var(--zelo-muted)]">
                    {p.cargo} • {p.comissao_percentual}% • {p.ativo ? "Ativo" : "Inativo"}
                  </p>
                </div>
                {isOwner && !p.eh_dono && p.ativo && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        const destino = outrosAtivos.find((o) => o.id !== p.id)?.id ?? donoProf?.id ?? null;
                        const res = await desligarProfissionalAction(p.id, destino);
                        return res.ok ? { message: "Profissional desligado com segurança." } : res;
                      })
                    }
                    className="inline-flex h-11 items-center gap-1 rounded-xl bg-red-500/10 px-3 text-xs font-semibold text-red-600"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Desligar
                  </button>
                )}
              </div>
            ))}
          </section>

          {isOwner && (
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <UserPlus className="h-4 w-4 text-[#F59E0B]" />
                  Convidar Profissional
                </div>
                <span className="font-mono-num text-[11px] text-[var(--zelo-muted)]">
                  Plano {plano.toUpperCase()}
                </span>
              </div>
              <input
                type="text"
                value={convNome}
                onChange={(e) => setConvNome(e.target.value)}
                placeholder="Nome (ex: Matheus)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-sm outline-none"
              />
              <input
                type="email"
                value={convEmail}
                onChange={(e) => setConvEmail(e.target.value)}
                placeholder="E-mail Google do profissional"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-sm outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={convCargo}
                  onChange={(e) => setConvCargo(e.target.value)}
                  placeholder="Cargo"
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-sm outline-none"
                />
                <input
                  type="number"
                  value={convComissao}
                  onChange={(e) => setConvComissao(e.target.value)}
                  placeholder="Comissão %"
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-sm font-mono-num outline-none"
                />
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const res = await convidarProfissionalAction({
                      loja_id: lojaId,
                      nome: convNome,
                      email_convite: convEmail,
                      cargo: convCargo,
                      comissao_percentual: Number(convComissao) || 50,
                    });
                    if (res.ok) {
                      setConvNome("");
                      setConvEmail("");
                      return { message: "Convite salvo! Assim que entrar com Google o vínculo é automático." };
                    }
                    return res;
                  })
                }
                className="h-11 w-full rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)]"
              >
                Adicionar à Equipe
              </button>
            </section>
          )}
        </div>
      )}

      {tab === "servicos" && (
        <div className="space-y-4">
          {isOwner && (
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Plus className="h-4 w-4 text-[#F59E0B]" />
                Novo Serviço
              </div>
              <input
                type="text"
                value={srvNome}
                onChange={(e) => setSrvNome(e.target.value)}
                placeholder="Nome (ex: Corte Navalhado)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-sm outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={srvDuracao}
                  onChange={(e) => setSrvDuracao(e.target.value)}
                  placeholder="Duração (min)"
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-sm font-mono-num outline-none"
                />
                <input
                  type="text"
                  value={srvPreco}
                  onChange={(e) => setSrvPreco(e.target.value)}
                  placeholder="Preço (ex: 45,00)"
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-sm font-mono-num outline-none"
                />
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const centavos = Math.round(
                      Number(srvPreco.replace(/[^\d,.-]/g, "").replace(",", ".")) * 100
                    );
                    const res = await saveServicoAction({
                      loja_id: lojaId,
                      nome: srvNome,
                      descricao: "",
                      duracao_min: Number(srvDuracao) || 30,
                      preco_centavos: Number.isFinite(centavos) ? centavos : 0,
                      ativo: true,
                    });
                    if (res.ok) {
                      setSrvNome("");
                      return { message: "Serviço adicionado." };
                    }
                    return res;
                  })
                }
                className="h-11 w-full rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)]"
              >
                Salvar Serviço
              </button>
            </section>
          )}

          <section className="space-y-2">
            {servicos.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--zelo-card)] p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.nome}</p>
                  <p className="font-mono-num text-xs text-[var(--zelo-muted)]">
                    {s.duracao_min} min • R$ {(s.preco_centavos / 100).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => deleteServicoAction(s.id, lojaId))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-red-600"
                    aria-label={`Excluir ${s.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
