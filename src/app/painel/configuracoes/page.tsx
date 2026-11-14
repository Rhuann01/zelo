import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { ConfiguracoesForm } from "@/components/configuracoes-form";

export default async function ConfiguracoesPage() {
  const ctx = await getPainelContext("/painel/configuracoes");
  const supabase = await createClient();

  const [{ data: prof }, { data: perfilSeg }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, chave_pix")
      .eq("loja_id", ctx.lojaAtual.id)
      .eq("user_id", ctx.userId)
      .maybeSingle(),
    supabase
      .from("perfis")
      .select("seguranca_pin_hash")
      .eq("id", ctx.userId)
      .maybeSingle(),
  ]);

  const temSenhaSeguranca = Boolean(perfilSeg?.seguranca_pin_hash);

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      <ConfiguracoesForm
        ctx={ctx}
        initialMinhaChavePix={prof?.chave_pix ?? ""}
        canEditProfPix={Boolean(prof)}
        initialTemSenhaSeguranca={temSenhaSeguranca}
      />
    </PainelShell>
  );
}
