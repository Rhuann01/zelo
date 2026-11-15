import { createClient } from "@/lib/supabase/server";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { CustomizadorLoja } from "@/components/customizador-loja";
import type { LinkPublico } from "@/lib/schemas/loja-links";

export default async function PersonalizarPage() {
  const ctx = await getPainelContext("/painel/personalizar");
  const supabase = await createClient();

  const { data: loc } = await supabase
    .from("lojas")
    .select("cep, endereco_texto, latitude, longitude, descricao_publica, links_publicos")
    .eq("id", ctx.lojaAtual.id)
    .maybeSingle();

  return (
    <CustomizadorLoja
      loja={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      initialLocalizacao={{
        cep: loc?.cep ?? "",
        endereco_texto: loc?.endereco_texto ?? "",
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
      }}
      initialSobre={{
        descricao_publica: loc?.descricao_publica ?? "",
        links_publicos: Array.isArray(loc?.links_publicos)
          ? (loc.links_publicos as LinkPublico[])
          : [],
      }}
    />
  );
}
