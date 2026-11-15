import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { AssinaturaPanel } from "@/components/assinatura-panel";

export default async function AssinaturaPage() {
  const ctx = await getPainelContext("/painel/assinatura");
  const supabase = await createClient();

  const { data: lojaBilling } = await supabase
    .from("lojas")
    .select("plano, assinatura_status, trial_ate, codigo_indicacao, indicado_por_loja_id")
    .eq("id", ctx.lojaAtual.id)
    .single();

  return (
    <AssinaturaPanel
      lojaId={ctx.lojaAtual.id}
      lojaNome={ctx.lojaAtual.nome}
      planoAtual={(lojaBilling?.plano ?? "trial") as "trial" | "solo" | "estudio"}
      assinaturaStatus={
        (lojaBilling?.assinatura_status ?? "trial") as
          | "trial"
          | "ativa"
          | "atrasada"
          | "cancelada"
      }
      trialAte={lojaBilling?.trial_ate ?? new Date().toISOString()}
      codigoIndicacao={lojaBilling?.codigo_indicacao ?? ""}
      jaIndicado={Boolean(lojaBilling?.indicado_por_loja_id)}
      isOwner={ctx.isOwner}
    />
  );
}
