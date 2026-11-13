import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { CustomizadorLoja } from "@/components/customizador-loja";

export default async function PersonalizarPage() {
  const ctx = await getPainelContext("/painel/personalizar");

  return (
    <PainelShell lojas={ctx.lojas} lojaAtual={ctx.lojaAtual} isOwner={ctx.isOwner}>
      <CustomizadorLoja loja={ctx.lojaAtual} isOwner={ctx.isOwner} />
    </PainelShell>
  );
}
