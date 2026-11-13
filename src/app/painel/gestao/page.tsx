import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { GestaoTabs } from "@/components/gestao-tabs";

export default async function GestaoPage() {
  const ctx = await getPainelContext("/painel/gestao");
  const supabase = await createClient();

  const [{ data: servicos }, { data: profissionais }, { data: bloqueios }] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, nome, descricao, duracao_min, preco_centavos, ativo")
      .eq("loja_id", ctx.lojaAtual.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("profissionais")
      .select("id, nome, cargo, eh_dono, ativo, email_convite, comissao_percentual")
      .eq("loja_id", ctx.lojaAtual.id)
      .order("eh_dono", { ascending: false }),
    supabase
      .from("bloqueios_agenda")
      .select("id, inicio, fim, tipo, motivo")
      .eq("loja_id", ctx.lojaAtual.id)
      .order("inicio", { ascending: true })
      .limit(10),
  ]);

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      <GestaoTabs
        lojaId={ctx.lojaAtual.id}
        plano={ctx.lojaAtual.plano}
        isOwner={ctx.isOwner}
        horariosIniciais={ctx.lojaAtual.horarios_loja}
        servicos={servicos ?? []}
        profissionais={profissionais ?? []}
        bloqueios={bloqueios ?? []}
      />
    </PainelShell>
  );
}
