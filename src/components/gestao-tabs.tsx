"use client";

import { useState, useTransition } from "react";
import {
  CalendarPlus,
  Clock,
  ImagePlus,
  Loader2,
  Plus,
  Scissors,
  Search,
  Star,
  Store,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Utensils,
  X,
} from "lucide-react";
import {
  convidarProfissionalAction,
  createBloqueioAction,
  deleteServicoAction,
  desligarProfissionalAction,
  saveHorariosAction,
  saveServicoAction,
  toggleDonoAtendeAction,
  toggleServicoImagemAction,
  updateServicoImagemAction,
} from "@/app/painel/gestao/actions";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP, STORE_MEDIA_COMPRESS_CONFIG } from "@/lib/image/compress-webp";
import { StockPhotoSearch } from "@/components/ui/stock-photo-search";
import { showToast } from "@/components/zelo-toast";

export interface ServicoRow {
  id: string;
  nome: string;
  descricao: string;
  duracao_min: number;
  preco_centavos: number;
  ativo: boolean;
  imagem_url: string | null;
  exibir_imagem: boolean;
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
  { key: "seg", label: "Seg", full: "Segunda" },
  { key: "ter", label: "Ter", full: "Terça" },
  { key: "qua", label: "Qua", full: "Quarta" },
  { key: "qui", label: "Qui", full: "Quinta" },
  { key: "sex", label: "Sex", full: "Sexta" },
  { key: "sab", label: "Sáb", full: "Sábado" },
  { key: "dom", label: "Dom", full: "Domingo" },
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
  const [srvImagemUrl, setSrvImagemUrl] = useState<string | null>(null);
  const [srvExibirImagem, setSrvExibirImagem] = useState(false);
  const [uploadingSrvId, setUploadingSrvId] = useState<string | null>(null);
  const [stockModalTarget, setStockModalTarget] = useState<"new" | string | null>(null);

  const [convNome, setConvNome] = useState("");
  const [convEmail, setConvEmail] = useState("");
  const [convCargo, setConvCargo] = useState("Barbeiro");
  const [convComissao, setConvComissao] = useState("50");

  const donoProf = profissionais.find((p) => p.eh_dono);
  const ativosCount = profissionais.filter((p) => p.ativo).length;
  const outrosAtivos = profissionais.filter((p) => !p.eh_dono && p.ativo);

  function runAction(fn: () => Promise<{ error?: string; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) showToast(res.error, "error");
      else if (res.message) showToast(res.message, "success");
    });
  }

  async function uploadServicoWebP(file: File, targetId: string): Promise<string> {
    const blob = await compressImageToWebP(file, STORE_MEDIA_COMPRESS_CONFIG);
    const supabase = createClient();
    const path = `${lojaId}/servicos/${targetId}.webp`;
    const { error: uploadErr } = await supabase.storage
      .from("lojas-media")
      .upload(path, blob, { contentType: "image/webp", upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supabase.storage.from("lojas-media").getPublicUrl(path);
    return `${pub.publicUrl}?t=${Date.now()}`;
  }

  async function handleNewServicoImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingSrvId("new");
    try {
      const url = await uploadServicoWebP(file, crypto.randomUUID());
      setSrvImagemUrl(url);
      setSrvExibirImagem(true);
      showToast("Foto do serviço carregada.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao enviar foto.", "error");
    } finally {
      setUploadingSrvId(null);
    }
  }

  async function handleExistingServicoImage(
    servicoId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingSrvId(servicoId);
    try {
      const url = await uploadServicoWebP(file, servicoId);
      const res = await updateServicoImagemAction(servicoId, lojaId, url, true);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Foto do serviço atualizada e ativada na loja.", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao enviar foto.", "error");
    } finally {
      setUploadingSrvId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stitch Segmented Pill Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[var(--zelo-soft)] p-1">
        <button
          type="button"
          onClick={() => setTab("horarios")}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "horarios"
              ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
              : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Horários</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("equipe")}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "equipe"
              ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
              : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
          }`}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>Equipe ({ativosCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("servicos")}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "servicos"
              ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
              : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
          }`}
        >
          <Scissors className="h-3.5 w-3.5 shrink-0" />
          <span>Serviços ({servicos.length})</span>
        </button>
      </div>

      {!isOwner && (
        <div className="rounded-xl bg-[#F59E0B]/15 px-3.5 py-2.5 text-xs font-medium text-[#D97706]">
          Você está logado como Equipe. Apenas o proprietário pode editar serviços, equipe e horários da loja.
        </div>
      )}

      {tab === "horarios" && (
        <div className="space-y-4">
          {/* Grade Semanal */}
          <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold tracking-tight">Grade Semanal</h2>
                <p className="text-[11px] text-[var(--zelo-muted)]">
                  Horário padrão de funcionamento
                </p>
              </div>
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
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)] transition active:scale-95 disabled:opacity-60"
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
                    className="flex min-h-[54px] items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 py-2 transition-colors"
                  >
                    <div className="flex shrink-0 items-center gap-2.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={dia.ativo}
                        aria-label={`Alternar ${label}`}
                        disabled={!isOwner}
                        onClick={() =>
                          setSemana((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], ativo: !prev[key].ativo },
                          }))
                        }
                        className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-60 ${
                          dia.ativo
                            ? "bg-[var(--zelo-btn-bg)]"
                            : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full shadow-sm transition-transform ${
                            dia.ativo
                              ? "translate-x-5 bg-[var(--zelo-btn-ink)]"
                              : "translate-x-0 bg-white"
                          }`}
                        />
                      </button>
                      <span
                        className={`w-8 text-xs font-bold ${
                          dia.ativo ? "text-[var(--zelo-ink)]" : "text-[var(--zelo-muted)]"
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    {dia.ativo ? (
                      <div className="flex shrink-0 items-center gap-1 font-mono-num text-xs">
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
                          className="h-9 w-[88px] rounded-lg bg-[var(--zelo-card)] px-1.5 text-center text-xs font-medium outline-none ring-1 ring-black/5 dark:ring-white/10"
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
                          className="h-9 w-[88px] rounded-lg bg-[var(--zelo-card)] px-1.5 text-center text-xs font-medium outline-none ring-1 ring-black/5 dark:ring-white/10"
                        />
                      </div>
                    ) : (
                      <span className="px-2 text-xs font-medium text-[var(--zelo-muted)]">
                        Folga
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pausa para Refeição */}
          <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#D97706]">
                  <Utensils className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold">Pausa para Refeição</h3>
                  <p className="text-[11px] text-[var(--zelo-muted)]">
                    Bloqueio diário de almoço
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={almocoAtivo}
                aria-label="Alternar pausa para refeição"
                disabled={!isOwner}
                onClick={() => setAlmocoAtivo((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-60 ${
                  almocoAtivo
                    ? "bg-[#F59E0B]"
                    : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                    almocoAtivo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {almocoAtivo && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 py-2.5">
                <span className="text-xs font-medium text-[var(--zelo-muted)]">
                  Intervalo
                </span>
                <div className="flex shrink-0 items-center gap-1 font-mono-num text-xs">
                  <input
                    type="time"
                    disabled={!isOwner}
                    value={almocoInicio}
                    onChange={(e) => setAlmocoInicio(e.target.value)}
                    className="h-9 w-[88px] rounded-lg bg-[var(--zelo-card)] px-1.5 text-center text-xs font-medium outline-none ring-1 ring-black/5 dark:ring-white/10"
                  />
                  <span className="text-[var(--zelo-muted)]">–</span>
                  <input
                    type="time"
                    disabled={!isOwner}
                    value={almocoFim}
                    onChange={(e) => setAlmocoFim(e.target.value)}
                    className="h-9 w-[88px] rounded-lg bg-[var(--zelo-card)] px-1.5 text-center text-xs font-medium outline-none ring-1 ring-black/5 dark:ring-white/10"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Abrir Dia Especial ou Bloqueio */}
          {isOwner && (
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#D97706]">
                  <CalendarPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Abrir Dia Especial ou Bloqueio</h2>
                  <p className="text-[11px] text-[var(--zelo-muted)]">
                    Exceções avulsas fora da grade semanal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={espTipo}
                  onChange={(e) =>
                    setEspTipo(e.target.value as "dia_especial" | "folga" | "feriado")
                  }
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-semibold outline-none"
                >
                  <option value="dia_especial">Dia Especial Aberto</option>
                  <option value="folga">Folga / Bloqueio</option>
                  <option value="feriado">Feriado (Fechado)</option>
                </select>
                <input
                  type="date"
                  value={espData}
                  onChange={(e) => setEspData(e.target.value)}
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-mono-num outline-none"
                />
                <input
                  type="time"
                  value={espInicio}
                  onChange={(e) => setEspInicio(e.target.value)}
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-mono-num outline-none"
                />
                <input
                  type="time"
                  value={espFim}
                  onChange={(e) => setEspFim(e.target.value)}
                  className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-mono-num outline-none"
                />
              </div>

              <input
                type="text"
                value={espMotivo}
                onChange={(e) => setEspMotivo(e.target.value)}
                placeholder="Motivo (ex: Domingo pré-feriado)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-xs outline-none"
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
                className="h-11 w-full rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)] transition active:scale-[0.99] disabled:opacity-50"
              >
                Registrar na Agenda
              </button>

              {bloqueios.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {bloqueios.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl bg-[var(--zelo-soft)] px-3 py-2.5 text-xs"
                    >
                      <span className="truncate font-medium">
                        {b.motivo || b.tipo}{" "}
                        <span className="text-[var(--zelo-muted)]">({b.tipo})</span>
                      </span>
                      <span className="shrink-0 font-mono-num text-[11px] text-[var(--zelo-muted)]">
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
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15 text-[#10B981]">
                  <Store className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-bold leading-snug">Também atendo clientes</div>
                  <p className="text-xs leading-snug text-[var(--zelo-muted)]">
                    Exibe ou oculta você na vitrine pública sem perder seu histórico.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={donoProf.ativo}
                disabled={!isOwner || isPending}
                onClick={() =>
                  runAction(() => toggleDonoAtendeAction(lojaId, donoProf.id, !donoProf.ativo))
                }
                className="inline-flex min-h-[44px] shrink-0 items-center"
                aria-label="Alternar atendimento do proprietário"
              >
                <span
                  className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                    donoProf.ativo ? "bg-[#10B981]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      donoProf.ativo ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </section>
          )}

          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold">Membros Cadastrados</h2>
              <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
                {ativosCount} ativo(s) • Plano {plano.toUpperCase()}
              </span>
            </div>

            {profissionais.map((p) => {
              const inicial = (p.nome.trim()[0] || "P").toUpperCase();
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--zelo-soft)] text-sm font-bold">
                      {inicial}
                      {p.eh_dono ? (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
                          <Star className="h-2.5 w-2.5 fill-current" />
                        </span>
                      ) : (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--zelo-card)] ${
                            p.ativo ? "bg-[#10B981]" : "bg-zinc-400"
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate text-sm font-bold">{p.nome}</p>
                        <span className="rounded-full bg-[var(--zelo-soft)] px-2 py-0.5 font-mono-num text-[10px] font-bold uppercase tracking-wider text-[var(--zelo-muted)]">
                          {p.eh_dono ? "Dono" : "Equipe"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--zelo-muted)]">
                        {p.cargo} • <span className="font-mono-num">{p.comissao_percentual}%</span> •{" "}
                        {p.ativo ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                  </div>

                  {isOwner && !p.eh_dono && p.ativo && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => {
                          const destino =
                            outrosAtivos.find((o) => o.id !== p.id)?.id ?? donoProf?.id ?? null;
                          const res = await desligarProfissionalAction(p.id, destino);
                          return res.ok ? { message: "Profissional desligado com segurança." } : res;
                        })
                      }
                      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-red-500/10 px-3 text-xs font-semibold text-red-500 transition hover:bg-red-500/15"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Desligar
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          {isOwner && (
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
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
                      return {
                        message: "Convite salvo! Assim que entrar com Google o vínculo é automático.",
                      };
                    }
                    return res;
                  })
                }
                className="h-11 w-full rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)] transition active:scale-[0.99]"
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
            <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {srvImagemUrl ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--zelo-card)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={srvImagemUrl}
                        alt="Prévia do serviço"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSrvImagemUrl(null);
                          setSrvExibirImagem(false);
                        }}
                        aria-label="Remover foto do novo serviço"
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--zelo-card)] px-3 text-xs font-semibold text-[var(--zelo-ink)] shadow-sm transition-opacity hover:opacity-90">
                    {uploadingSrvId === "new" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5 text-[#10B981]" />
                    )}
                    <span>{srvImagemUrl ? "Trocar Foto" : "Foto do Serviço (obrigatória)"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingSrvId === "new"}
                      onChange={handleNewServicoImage}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={uploadingSrvId === "new"}
                    onClick={() => setStockModalTarget("new")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[var(--zelo-card)] px-3 text-xs font-semibold text-[var(--zelo-ink)] shadow-sm transition-opacity hover:opacity-90"
                  >
                    <Search className="h-3.5 w-3.5 text-[#F59E0B]" />
                    <span>Buscar grátis</span>
                  </button>
                </div>

                {srvImagemUrl && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={srvExibirImagem}
                    onClick={() => setSrvExibirImagem((v) => !v)}
                    className="inline-flex min-h-[36px] items-center gap-2 text-xs font-medium text-[var(--zelo-ink)]"
                  >
                    <span>Exibir na loja</span>
                    <span
                      className={`relative h-5 w-9 rounded-full p-0.5 transition-colors ${
                        srvExibirImagem ? "bg-[#10B981]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                      }`}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          srvExibirImagem ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isPending || uploadingSrvId === "new"}
                onClick={() =>
                  runAction(async () => {
                    if (!srvImagemUrl) {
                      return { error: "Adicione uma foto do serviço para manter sua vitrine organizada." };
                    }
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
                      imagem_url: srvImagemUrl,
                      exibir_imagem: true,
                    });
                    if (res.ok) {
                      setSrvNome("");
                      setSrvImagemUrl(null);
                      setSrvExibirImagem(false);
                      return { message: "Serviço adicionado." };
                    }
                    return res;
                  })
                }
                className="h-11 w-full rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)] transition active:scale-[0.99]"
              >
                Salvar Serviço
              </button>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold">Catálogo de Serviços</h2>
              <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
                {servicos.length} ativo(s)
              </span>
            </div>

            {servicos.map((s) => (
              <div
                key={s.id}
                className="space-y-2.5 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {s.imagem_url && (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--zelo-soft)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.imagem_url}
                          alt={s.nome}
                          className={`h-full w-full object-cover transition-opacity ${
                            s.exibir_imagem ? "opacity-100" : "opacity-45"
                          }`}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.nome}</p>
                      <p className="font-mono-num text-xs text-[var(--zelo-muted)]">
                        {s.duracao_min} min • R$ {(s.preco_centavos / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => deleteServicoAction(s.id, lojaId))}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-red-500 transition hover:bg-red-500/10"
                      aria-label={`Excluir ${s.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isOwner && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--zelo-border)]/40 pt-2.5">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--zelo-soft)] px-2.5 text-[11px] font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]">
                        {uploadingSrvId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3.5 w-3.5 text-[#10B981]" />
                        )}
                        <span>{s.imagem_url ? "Trocar foto" : "Adicionar foto"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingSrvId === s.id || isPending}
                          onChange={(e) => handleExistingServicoImage(s.id, e)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={uploadingSrvId === s.id || isPending}
                        onClick={() => setStockModalTarget(s.id)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[var(--zelo-soft)] px-2.5 text-[11px] font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
                      >
                        <Search className="h-3.5 w-3.5 text-[#F59E0B]" />
                        <span>Buscar grátis</span>
                      </button>
                      {s.imagem_url && (
                        <button
                          type="button"
                          disabled={isPending || uploadingSrvId === s.id}
                          onClick={() =>
                            runAction(async () => {
                              const res = await updateServicoImagemAction(s.id, lojaId, null, false);
                              if (res.ok) return { message: "Foto removida do serviço." };
                              return res;
                            })
                          }
                          className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-red-500/10 px-2.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-500/15"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    {s.imagem_url && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={s.exibir_imagem}
                        aria-label={`Exibir foto do serviço ${s.nome} na loja`}
                        disabled={isPending}
                        onClick={() =>
                          runAction(() =>
                            toggleServicoImagemAction(s.id, lojaId, !s.exibir_imagem)
                          )
                        }
                        className="inline-flex min-h-[38px] items-center gap-2 text-[11px] font-semibold text-[var(--zelo-ink)] disabled:opacity-60"
                      >
                        <span className="text-[var(--zelo-muted)]">
                          {s.exibir_imagem ? "Foto visível" : "Foto oculta"}
                        </span>
                        <span
                          className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                            s.exibir_imagem ? "bg-[#10B981]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                          }`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              s.exibir_imagem ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      )}

      {stockModalTarget !== null && (
        <div
          className="zelo-fade-in fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-service-modal-title"
          onClick={() => setStockModalTarget(null)}
        >
          <div
            className="zelo-sheet-up flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--zelo-card)] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--zelo-border)]/60 px-4 py-3.5">
              <div>
                <h3 id="stock-service-modal-title" className="text-sm font-semibold text-[var(--zelo-ink)]">
                  Buscar Foto Grátis para Serviço
                </h3>
                <p className="text-[11px] text-[var(--zelo-muted)]">
                  Escolha uma foto pronta da Pexels API para usar na vitrine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockModalTarget(null)}
                aria-label="Fechar busca de fotos"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StockPhotoSearch
                tipo="servico"
                selectedUrl={
                  stockModalTarget === "new"
                    ? srvImagemUrl
                    : servicos.find((srv) => srv.id === stockModalTarget)?.imagem_url ?? null
                }
                disabled={isPending}
                onSelect={(url) => {
                  const target = stockModalTarget;
                  setStockModalTarget(null);
                  if (target === "new") {
                    setSrvImagemUrl(url);
                    setSrvExibirImagem(true);
                    showToast("Foto selecionada para o serviço!", "success");
                  } else if (target) {
                    runAction(async () => {
                      const res = await updateServicoImagemAction(target, lojaId, url, true);
                      if (res.ok) return { message: "Foto do serviço atualizada." };
                      return res;
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
