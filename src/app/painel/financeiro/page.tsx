import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import {
  FinanceiroDashboard,
  type FinanceiroAgendamentoItem,
  type FinanceiroProfissionalItem,
} from "@/components/financeiro-dashboard";

export default async function FinanceiroPage() {
  const ctx = await getPainelContext("/painel/financeiro");
  const supabase = await createClient();

  const sinceIso = new Date(Date.now() - 31 * 86_400_000).toISOString();

  const [{ data: profsData }, { data: agsData }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, comissao_pct, eh_dono, user_id")
      .eq("loja_id", ctx.lojaAtual.id)
      .eq("ativo", true)
      .order("eh_dono", { ascending: false }),
    supabase
      .from("agendamentos")
      .select(
        "id, inicio, status, total_centavos, sinal_centavos, profissional_id, cliente_nome_avulso, cliente:perfis(nome), agendamento_servicos(servico:servicos(nome))"
      )
      .eq("loja_id", ctx.lojaAtual.id)
      .gte("inicio", sinceIso)
      .order("inicio", { ascending: false })
      .limit(200),
  ]);

  const profissionais: FinanceiroProfissionalItem[] = (profsData ?? []).map((p) => ({
    id: String(p.id),
    nome: String(p.nome),
    comissao_pct: Number(p.comissao_pct ?? 100),
    eh_dono: Boolean(p.eh_dono),
    user_id: (p.user_id as string | null) ?? null,
  }));

  const profMap = new Map(profissionais.map((p) => [p.id, p]));

  const agendamentos: FinanceiroAgendamentoItem[] = (agsData ?? []).map((row) => {
    const prof = profMap.get(String(row.profissional_id));
    const clienteRaw = Array.isArray(row.cliente) ? row.cliente[0] : row.cliente;
    const servsRaw = Array.isArray(row.agendamento_servicos)
      ? row.agendamento_servicos
      : [];
    const servicosNomes = servsRaw
      .map((item) => {
        const s = Array.isArray(item.servico) ? item.servico[0] : item.servico;
        return s?.nome ? String(s.nome) : null;
      })
      .filter(Boolean) as string[];

    return {
      id: String(row.id),
      inicio: String(row.inicio),
      status: row.status as FinanceiroAgendamentoItem["status"],
      total_centavos: Number(row.total_centavos ?? 0),
      sinal_centavos: Number(row.sinal_centavos ?? 0),
      profissional_id: String(row.profissional_id),
      profissional_nome: prof?.nome ?? "Profissional",
      profissional_comissao_pct: prof?.comissao_pct ?? 100,
      profissional_user_id: prof?.user_id ?? null,
      cliente_nome:
        (row.cliente_nome_avulso as string | null) ||
        (clienteRaw?.nome ? String(clienteRaw.nome) : "Cliente"),
      servicos_label:
        servicosNomes.length > 0 ? servicosNomes.join(" + ") : "Atendimento",
    };
  });

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      <FinanceiroDashboard
        lojaNome={ctx.lojaAtual.nome}
        isOwner={ctx.isOwner}
        currentUserId={ctx.userId}
        profissionais={profissionais}
        agendamentos={agendamentos}
      />
    </PainelShell>
  );
}
