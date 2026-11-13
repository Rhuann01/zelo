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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "horarios" | "equipe" | "servicos")}
      className="space-y-4"
    >
      <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl bg-card p-1">
        <TabsTrigger value="horarios" className="h-10 gap-1.5 rounded-xl text-xs font-semibold">
          <Clock className="h-3.5 w-3.5" />
          Horários
        </TabsTrigger>
        <TabsTrigger value="equipe" className="h-10 gap-1.5 rounded-xl text-xs font-semibold">
          <Users className="h-3.5 w-3.5" />
          Equipe ({profissionais.filter((p) => p.ativo).length})
        </TabsTrigger>
        <TabsTrigger value="servicos" className="h-10 gap-1.5 rounded-xl text-xs font-semibold">
          <Scissors className="h-3.5 w-3.5" />
          Serviços ({servicos.length})
        </TabsTrigger>
      </TabsList>

      {!isOwner && (
        <div className="rounded-xl bg-[#F59E0B]/15 px-3.5 py-2.5 text-xs font-medium text-[#D97706]">
          Você está logado como Equipe. Apenas o proprietário pode editar serviços, equipe e horários da loja.
        </div>
      )}

      {feedback && (
        <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-semibold">
          {feedback}
        </div>
      )}

      <TabsContent value="horarios" className="mt-0 space-y-4">
        <Card className="py-4">
          <CardContent className="space-y-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Grade Semanal</h2>
              {isOwner && (
                <Button
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
                  className="h-11 rounded-xl px-4 text-xs font-semibold"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar Grade
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {DIAS_KEYS.map(({ key, label }) => {
                const dia = semana[key];
                return (
                  <div
                    key={key}
                    className="flex min-h-[52px] items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
                  >
                    <label className="flex min-h-[36px] shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold">
                      <Switch
                        disabled={!isOwner}
                        checked={dia.ativo}
                        onCheckedChange={(checked) =>
                          setSemana((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], ativo: checked },
                          }))
                        }
                      />
                      <span className="w-7">{label}</span>
                    </label>
                    {dia.ativo ? (
                      <div className="flex shrink-0 items-center gap-1.5 font-mono-num text-xs">
                        <Input
                          type="time"
                          disabled={!isOwner}
                          value={dia.abre}
                          onChange={(e) =>
                            setSemana((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], abre: e.target.value },
                            }))
                          }
                          className="h-9 w-[92px] shrink-0 rounded-lg border-0 bg-card px-2 text-center text-xs [&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:opacity-60"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          disabled={!isOwner}
                          value={dia.fecha}
                          onChange={(e) =>
                            setSemana((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], fecha: e.target.value },
                            }))
                          }
                          className="h-9 w-[92px] shrink-0 rounded-lg border-0 bg-card px-2 text-center text-xs [&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:opacity-60"
                        />
                      </div>
                    ) : (
                      <span className="px-2 text-xs font-medium text-muted-foreground">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2">
              <label className="flex min-h-[36px] shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold">
                <Switch
                  disabled={!isOwner}
                  checked={almocoAtivo}
                  onCheckedChange={setAlmocoAtivo}
                />
                <Utensils className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Almoço</span>
              </label>
              {almocoAtivo && (
                <div className="flex shrink-0 items-center gap-1.5 font-mono-num text-xs">
                  <Input
                    type="time"
                    disabled={!isOwner}
                    value={almocoInicio}
                    onChange={(e) => setAlmocoInicio(e.target.value)}
                    className="h-9 w-[92px] shrink-0 rounded-lg border-0 bg-card px-2 text-center text-xs [&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:opacity-60"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    disabled={!isOwner}
                    value={almocoFim}
                    onChange={(e) => setAlmocoFim(e.target.value)}
                    className="h-9 w-[92px] shrink-0 rounded-lg border-0 bg-card px-2 text-center text-xs [&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:opacity-60"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="bg-[#F59E0B]/10 py-4">
            <CardContent className="space-y-3 px-4">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-[#D97706]" />
                <h2 className="text-sm font-bold">Abrir Dia Especial ou Bloqueio</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={espTipo}
                  onChange={(e) => setEspTipo(e.target.value as "dia_especial" | "folga" | "feriado")}
                  className="h-11 rounded-xl bg-card px-3 text-xs font-medium outline-none"
                >
                  <option value="dia_especial">Dia Especial Aberto</option>
                  <option value="folga">Folga / Bloqueio</option>
                  <option value="feriado">Feriado (Fechado)</option>
                </select>
                <Input
                  type="date"
                  value={espData}
                  onChange={(e) => setEspData(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-card px-3 font-mono-num text-xs"
                />
                <Input
                  type="time"
                  value={espInicio}
                  onChange={(e) => setEspInicio(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-card px-3 font-mono-num text-xs"
                />
                <Input
                  type="time"
                  value={espFim}
                  onChange={(e) => setEspFim(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-card px-3 font-mono-num text-xs"
                />
              </div>
              <Input
                type="text"
                value={espMotivo}
                onChange={(e) => setEspMotivo(e.target.value)}
                placeholder="Motivo (ex: Domingo pré-feriado)"
                className="h-11 rounded-xl border-0 bg-card px-3 text-xs"
              />
              <Button
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
                className="h-11 w-full rounded-xl text-xs font-semibold"
              >
                Registrar na Agenda
              </Button>

              {bloqueios.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {bloqueios.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-xs"
                    >
                      <span className="font-medium">
                        {b.motivo || b.tipo} ({b.tipo})
                      </span>
                      <span className="font-mono-num text-[11px] text-muted-foreground">
                        {new Date(b.inicio).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="equipe" className="mt-0 space-y-4">
        {donoProf && (
          <Card className="py-4">
            <CardContent className="px-4">
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <UserCheck className="h-4 w-4 text-[#10B981]" />
                    Também atendo clientes
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exibe ou oculta você na lista de profissionais da loja sem perder seu histórico.
                  </p>
                </div>
                <Switch
                  disabled={!isOwner || isPending}
                  checked={donoProf.ativo}
                  onCheckedChange={() =>
                    runAction(() => toggleDonoAtendeAction(lojaId, donoProf.id, !donoProf.ativo))
                  }
                  aria-label="Alternar atendimento do proprietário"
                />
              </label>
            </CardContent>
          </Card>
        )}

        <Card className="py-4">
          <CardContent className="space-y-2.5 px-4">
            <h2 className="text-sm font-bold">Membros da Loja</h2>
            {profissionais.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {p.nome} {p.eh_dono ? "(Dono)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.cargo} • {p.comissao_percentual}% • {p.ativo ? "Ativo" : "Inativo"}
                  </p>
                </div>
                {isOwner && !p.eh_dono && p.ativo && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        const destino = outrosAtivos.find((o) => o.id !== p.id)?.id ?? donoProf?.id ?? null;
                        const res = await desligarProfissionalAction(p.id, destino);
                        return res.ok ? { message: "Profissional desligado com segurança." } : res;
                      })
                    }
                    className="h-11 rounded-xl bg-red-500/10 px-3 text-xs font-semibold text-red-600 hover:bg-red-500/15 hover:text-red-600"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Desligar
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="py-4">
            <CardContent className="space-y-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <UserPlus className="h-4 w-4 text-[#F59E0B]" />
                  Convidar Profissional
                </div>
                <Badge variant="secondary" className="font-mono-num text-[11px]">
                  Plano {plano.toUpperCase()}
                </Badge>
              </div>
              <Input
                type="text"
                value={convNome}
                onChange={(e) => setConvNome(e.target.value)}
                placeholder="Nome (ex: Matheus)"
                className="h-11 rounded-xl border-0 bg-secondary px-3 text-sm"
              />
              <Input
                type="email"
                value={convEmail}
                onChange={(e) => setConvEmail(e.target.value)}
                placeholder="E-mail Google do profissional"
                className="h-11 rounded-xl border-0 bg-secondary px-3 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  value={convCargo}
                  onChange={(e) => setConvCargo(e.target.value)}
                  placeholder="Cargo"
                  className="h-11 rounded-xl border-0 bg-secondary px-3 text-sm"
                />
                <Input
                  type="number"
                  value={convComissao}
                  onChange={(e) => setConvComissao(e.target.value)}
                  placeholder="Comissão %"
                  className="h-11 rounded-xl border-0 bg-secondary px-3 font-mono-num text-sm"
                />
              </div>
              <Button
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
                className="h-11 w-full rounded-xl text-xs font-semibold"
              >
                Adicionar à Equipe
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="servicos" className="mt-0 space-y-4">
        {isOwner && (
          <Card className="py-4">
            <CardContent className="space-y-3 px-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Plus className="h-4 w-4 text-[#F59E0B]" />
                Novo Serviço
              </div>
              <Input
                type="text"
                value={srvNome}
                onChange={(e) => setSrvNome(e.target.value)}
                placeholder="Nome (ex: Corte Navalhado)"
                className="h-11 rounded-xl border-0 bg-secondary px-3 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={srvDuracao}
                  onChange={(e) => setSrvDuracao(e.target.value)}
                  placeholder="Duração (min)"
                  className="h-11 rounded-xl border-0 bg-secondary px-3 font-mono-num text-sm"
                />
                <Input
                  type="text"
                  value={srvPreco}
                  onChange={(e) => setSrvPreco(e.target.value)}
                  placeholder="Preço (ex: 45,00)"
                  className="h-11 rounded-xl border-0 bg-secondary px-3 font-mono-num text-sm"
                />
              </div>
              <Button
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
                className="h-11 w-full rounded-xl text-xs font-semibold"
              >
                Salvar Serviço
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {servicos.map((s) => (
            <Card key={s.id} className="py-3">
              <CardContent className="flex items-center justify-between gap-2 px-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.nome}</p>
                  <p className="font-mono-num text-xs text-muted-foreground">
                    {s.duracao_min} min • R$ {(s.preco_centavos / 100).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                {isOwner && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={isPending}
                    onClick={() => runAction(() => deleteServicoAction(s.id, lojaId))}
                    className="h-11 w-11 rounded-xl text-red-600"
                    aria-label={`Excluir ${s.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
