import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { GestaoTabs } from "@/components/gestao-tabs";

export default async function GestaoPage() {
  const ctx = await getPainelContext("/painel/gestao");
  const supabase = await createClient();

  const [{ data: servicos }, { data: profissionais }, { data: bloqueios }, { data: convitesPendentes }] =
    await Promise.all([
      supabase
        .from("servicos")
        .select("id, nome, descricao, duracao_min, preco_centavos, ativo, imagem_url, exibir_imagem")
        .eq("loja_id", ctx.lojaAtual.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("profissionais")
        .select("id, user_id, nome, cargo, eh_dono, ativo, avatar_url, comissao_percentual")
        .eq("loja_id", ctx.lojaAtual.id)
        .order("eh_dono", { ascending: false }),
      supabase
        .from("bloqueios_agenda")
        .select("id, inicio, fim, tipo, motivo")
        .eq("loja_id", ctx.lojaAtual.id)
        .order("inicio", { ascending: true })
        .limit(10),
      ctx.isOwner
        ? supabase
            .from("convites_equipe")
            .select("id, cargo, comissao_percentual, expires_at, created_at")
            .eq("loja_id", ctx.lojaAtual.id)
            .eq("status", "pendente")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
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
        currentUserId={ctx.userId}
        horariosIniciais={ctx.lojaAtual.horarios_loja}
        servicos={servicos ?? []}
        profissionais={profissionais ?? []}
        convitesPendentes={convitesPendentes ?? []}
        bloqueios={bloqueios ?? []}
      />
    </PainelShell>
  );
}
