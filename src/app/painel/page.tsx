import Link from "next/link";
import {
  LayoutGrid,
  Palette,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/painel-shell";
import {
  PainelAgendaSX,
  type AgendaAgendamentoItem,
} from "@/components/painel-agenda-sx";
import { WebPushOptIn } from "@/components/web-push-optin";

export default async function PainelPage() {
  const ctx = await getPainelContext("/painel");
  const primeiroNome = ctx.perfil.nome.split(" ")[0] || "Gestor";
  const supabase = await createClient();

  const [{ data: profissionais }, { data: servicos }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, user_id")
      .eq("loja_id", ctx.lojaAtual.id)
      .eq("ativo", true)
      .order("eh_dono", { ascending: false }),
    supabase
      .from("servicos")
      .select("id, nome, duracao_min, preco_centavos")
      .eq("loja_id", ctx.lojaAtual.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
  ]);

  const meuProfissional = (profissionais ?? []).find((p) => p.user_id === ctx.userId);
  const inicioJanela = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const fimJanela = new Date(Date.now() + 30 * 86_400_000).toISOString();

  let agQuery = supabase
    .from("agendamentos")
    .select(
      "id, profissional_id, origem, cliente_nome, cliente_whatsapp, beneficiario_nome, beneficiario_whatsapp, inicio, fim, status, total_centavos, cliente:perfis(nome, whatsapp), profissional:profissionais(nome)"
    )
    .eq("loja_id", ctx.lojaAtual.id)
    .gte("inicio", inicioJanela)
    .lte("inicio", fimJanela)
    .order("inicio", { ascending: true });

  if (!ctx.isOwner && meuProfissional) {
    agQuery = agQuery.eq("profissional_id", meuProfissional.id);
  }

  const { data: rawAgendamentos } = await agQuery;

  const agendamentos: AgendaAgendamentoItem[] = (rawAgendamentos ?? []).map((row) => {
    const cli = Array.isArray(row.cliente) ? row.cliente[0] : row.cliente;
    const pro = Array.isArray(row.profissional) ? row.profissional[0] : row.profissional;
    return {
      id: row.id as string,
      profissional_id: row.profissional_id as string,
      profissional_nome: pro?.nome ?? "Profissional",
      cliente_nome:
        (row.beneficiario_nome as string | null) ||
        (row.cliente_nome as string | null) ||
        cli?.nome ||
        "Cliente",
      cliente_whatsapp:
        (row.beneficiario_whatsapp as string | null) ||
        (row.cliente_whatsapp as string | null) ||
        cli?.whatsapp ||
        null,
      inicio: row.inicio as string,
      fim: row.fim as string,
      status: row.status as AgendaAgendamentoItem["status"],
      total_centavos: Number(row.total_centavos ?? 0),
      origem: row.origem as "online" | "manual",
    };
  });

  const profissionaisVisiveis = ctx.isOwner
    ? (profissionais ?? []).map((p) => ({ id: p.id, nome: p.nome }))
    : meuProfissional
      ? [{ id: meuProfissional.id, nome: meuProfissional.nome }]
      : [];

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      <div className="space-y-4">
        {/* Status & Greeting Card */}
        <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  ctx.lojaAtual.pausada
                    ? "bg-[#F59E0B]/15 text-[#D97706]"
                    : "bg-[#10B981]/15 text-[#10B981]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    ctx.lojaAtual.pausada ? "bg-[#F59E0B]" : "bg-[#10B981]"
                  }`}
                />
                {ctx.lojaAtual.pausada ? "Loja Pausada" : "Loja Ativa"}
              </span>
              <h1 className="mt-2 text-xl font-bold tracking-tight">
                Olá, {primeiroNome}
              </h1>
              <p className="font-mono-num text-xs text-[var(--zelo-muted)]">
                zelo.app/{ctx.lojaAtual.slug}
              </p>
            </div>
            <span className="rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 font-mono-num text-[11px] font-bold uppercase tracking-wider text-[var(--zelo-muted)]">
              {ctx.lojaAtual.plano}
            </span>
          </div>

          {/* 3-Card Bento Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/painel/gestao"
              className="flex flex-col items-start justify-start gap-2.5 rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#D97706]">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <div className="w-full min-w-0">
                <span className="block truncate text-xs font-bold">Gestão</span>
                <span className="block truncate text-[11px] text-[var(--zelo-muted)]">
                  Equipe & Dias
                </span>
              </div>
            </Link>
            <Link
              href="/painel/personalizar"
              className="flex flex-col items-start justify-start gap-2.5 rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#10B981]/15 text-[#10B981]">
                <Palette className="h-4 w-4" />
              </div>
              <div className="w-full min-w-0">
                <span className="block truncate text-xs font-bold">Tema</span>
                <span className="block truncate text-[11px] capitalize text-[var(--zelo-muted)]">
                  {ctx.lojaAtual.tema}
                </span>
              </div>
            </Link>
            <Link
              href="/painel/configuracoes"
              className="flex flex-col items-start justify-start gap-2.5 rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs">
                <Settings className="h-4 w-4" />
              </div>
              <div className="w-full min-w-0">
                <span className="block truncate text-xs font-bold">Config</span>
                <span className="block truncate text-[11px] text-[var(--zelo-muted)]">
                  Foto & Conta
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Agenda Visual Schedule-X MIT (Etapa 5) */}
        <PainelAgendaSX
          lojaId={ctx.lojaAtual.id}
          isOwner={ctx.isOwner}
          agendamentos={agendamentos}
          profissionais={profissionaisVisiveis}
          servicos={(servicos ?? []).map((s) => ({
            id: s.id,
            nome: s.nome,
            duracao_min: s.duracao_min,
            preco_centavos: s.preco_centavos,
          }))}
        />

        <WebPushOptIn />

        {ctx.isOwner && (
          <Link
            href="/onboarding"
            className="flex min-h-[68px] items-center justify-between rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm transition hover:opacity-95 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#D97706]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Criar nova unidade / loja</p>
                <p className="text-xs text-[var(--zelo-muted)]">
                  Gerencie múltiplas unidades no mesmo login Google
                </p>
              </div>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
              <Plus className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </PainelShell>
  );
}
