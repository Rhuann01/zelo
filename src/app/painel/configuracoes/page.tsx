import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import {
  parseSuperAdminAllowlist,
  parseSuperAdminEmailAllowlist,
} from "@/lib/super-admin/guard";
import { ConfiguracoesForm } from "@/components/configuracoes-form";

export default async function ConfiguracoesPage() {
  const ctx = await getPainelContext("/painel/configuracoes");
  const supabase = await createClient();

  const [
    { data: prof },
    { data: perfilSeg },
    {
      data: { user },
    },
  ] = await Promise.all([
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
    supabase.auth.getUser(),
  ]);

  const temSenhaSeguranca = Boolean(perfilSeg?.seguranca_pin_hash);
  const uidAllowlist = parseSuperAdminAllowlist();
  const emailAllowlist = parseSuperAdminEmailAllowlist();
  const userEmail = user?.email?.trim().toLowerCase() ?? "";
  const isSuperAdmin =
    Boolean(user) &&
    (uidAllowlist.has(user!.id) ||
      (Boolean(userEmail) &&
        Boolean(user?.email_confirmed_at) &&
        emailAllowlist.has(userEmail)));

  return (
    <ConfiguracoesForm
      ctx={ctx}
      initialMinhaChavePix={prof?.chave_pix ?? ""}
      canEditProfPix={Boolean(prof)}
      initialTemSenhaSeguranca={temSenhaSeguranca}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
