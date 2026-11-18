import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import {
  FinanceiroDashboard,
  type FinanceiroAgendamentoItem,
  type FinanceiroProfissionalItem,
} from "@/components/financeiro-dashboard";

export default async function FinanceiroPage() {
  const ctx = await getPainelContext("/painel/financeiro");
  const supabase = await createClient();
  const admin = createAdminClient();

  const sinceIso = new Date(Date.now() - 31 * 86_400_000).toISOString();

  const [{ data: profsData }, { data: agsData }] = await Promise.all([
    admin
      .from("profissionais")
      .select("id, nome, comissao_percentual, meta_semanal_centavos, eh_dono, user_id")
      .eq("loja_id", ctx.lojaAtual.id)
      .order("eh_dono", { ascending: false }),
    supabase
      .from("agendamentos")
      .select(
        "id, inicio, status, total_centavos, sinal_centavos, profissional_id, cliente_nome, beneficiario_nome, cliente:perfis(nome), agendamento_servicos(nome_snapshot, servico:servicos(nome))"
      )
      .eq("loja_id", ctx.lojaAtual.id)
      .gte("inicio", sinceIso)
      .order("inicio", { ascending: false })
      .limit(200),
  ]);

  const profissionais: FinanceiroProfissionalItem[] = (profsData ?? []).map((p) => ({
    id: String(p.id),
    nome: String(p.nome),
    comissao_pct: Number(p.comissao_percentual ?? 100),
    meta_semanal_centavos: Number(p.meta_semanal_centavos ?? 150_000),
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
        const nome = item.nome_snapshot || s?.nome;
        return nome ? String(nome) : null;
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
        (row.beneficiario_nome as string | null) ||
        (row.cliente_nome as string | null) ||
        (clienteRaw?.nome ? String(clienteRaw.nome) : "Cliente"),
      servicos_label:
        servicosNomes.length > 0 ? servicosNomes.join(" + ") : "Atendimento",
    };
  });

  return (
    <FinanceiroDashboard
      lojaId={ctx.lojaAtual.id}
      lojaNome={ctx.lojaAtual.nome}
      chavePixLoja={ctx.lojaAtual.chave_pix}
      isOwner={ctx.isOwner}
      currentUserId={ctx.userId}
      profissionais={profissionais}
      agendamentos={agendamentos}
    />
  );
}
