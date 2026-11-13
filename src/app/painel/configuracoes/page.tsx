import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { ConfiguracoesForm } from "@/components/configuracoes-form";

export default async function ConfiguracoesPage() {
  const ctx = await getPainelContext("/painel/configuracoes");

  return (
    <PainelShell lojas={ctx.lojas} lojaAtual={ctx.lojaAtual} isOwner={ctx.isOwner}>
      <ConfiguracoesForm ctx={ctx} />
    </PainelShell>
  );
}
