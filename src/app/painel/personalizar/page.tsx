import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { CustomizadorLoja } from "@/components/customizador-loja";

export default async function PersonalizarPage() {
  const ctx = await getPainelContext("/painel/personalizar");
  const supabase = await createClient();

  const { data: loc } = await supabase
    .from("lojas")
    .select("cep, endereco_texto, latitude, longitude")
    .eq("id", ctx.lojaAtual.id)
    .maybeSingle();

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      <CustomizadorLoja
        loja={ctx.lojaAtual}
        isOwner={ctx.isOwner}
        initialLocalizacao={{
          cep: loc?.cep ?? "",
          endereco_texto: loc?.endereco_texto ?? "",
          latitude: loc?.latitude ?? null,
          longitude: loc?.longitude ?? null,
        }}
      />
    </PainelShell>
  );
}
