import { getPainelContext } from "@/lib/painel/get-painel-context";
import { createClient } from "@/lib/supabase/server";
import type { AgendaAgendamentoItem, AgendaBloqueioItem } from "@/lib/booking/agenda-timeline";
import type { HorariosLojaConfig } from "@/lib/booking/disponibilidade";
import { PainelShell } from "@/components/painel-shell";
import { PainelAgendaStitch } from "@/components/painel-agenda-stitch";
import { WebPushOptIn } from "@/components/web-push-optin";

export default async function PainelPage() {
  const ctx = await getPainelContext("/painel");
  const supabase = await createClient();

  const inicioJanela = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const fimJanela = new Date(Date.now() + 30 * 86_400_000).toISOString();

  const [{ data: lojaConfig }, { data: profissionais }, { data: servicos }, { data: bloqueios }] =
    await Promise.all([
      supabase.from("lojas").select("horarios_loja").eq("id", ctx.lojaAtual.id).maybeSingle(),
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
      supabase
        .from("bloqueios_agenda")
        .select("id, profissional_id, inicio, fim, tipo, motivo")
        .eq("loja_id", ctx.lojaAtual.id)
        .gte("fim", inicioJanela)
        .lte("inicio", fimJanela),
    ]);

  const meuProfissional = (profissionais ?? []).find((p) => p.user_id === ctx.userId);

  let agQuery = supabase
    .from("agendamentos")
    .select(
      "id, profissional_id, origem, cliente_nome, cliente_whatsapp, beneficiario_nome, beneficiario_whatsapp, inicio, fim, status, total_centavos, sinal_centavos, cliente:perfis(nome, whatsapp), profissional:profissionais(nome), agendamento_servicos(nome_snapshot)"
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
    const servs = Array.isArray(row.agendamento_servicos) ? row.agendamento_servicos : [];
    const servicosResumo =
      servs
        .map((s: { nome_snapshot?: string }) => s.nome_snapshot)
        .filter(Boolean)
        .join(" + ") || "Atendimento";

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
      servicos_resumo: servicosResumo,
      inicio: row.inicio as string,
      fim: row.fim as string,
      status: row.status as AgendaAgendamentoItem["status"],
      total_centavos: Number(row.total_centavos ?? 0),
      sinal_centavos: Number(row.sinal_centavos ?? 0),
      origem: row.origem as "online" | "manual",
    };
  });

  const bloqueiosLista: AgendaBloqueioItem[] = (bloqueios ?? []).map((b) => ({
    id: b.id as string,
    profissional_id: (b.profissional_id as string | null) ?? null,
    inicio: b.inicio as string,
    fim: b.fim as string,
    tipo: b.tipo as string,
    motivo: (b.motivo as string) ?? "",
  }));

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
        {/* Agenda do Dia (Stitch) */}
        <PainelAgendaStitch
          lojaId={ctx.lojaAtual.id}
          isOwner={ctx.isOwner}
          horariosLoja={(lojaConfig?.horarios_loja ?? {}) as HorariosLojaConfig}
          agendamentos={agendamentos}
          bloqueios={bloqueiosLista}
          profissionais={profissionaisVisiveis}
          servicos={(servicos ?? []).map((s) => ({
            id: s.id,
            nome: s.nome,
            duracao_min: s.duracao_min,
            preco_centavos: s.preco_centavos,
          }))}
        />

        <WebPushOptIn />
      </div>
    </PainelShell>
  );
}
