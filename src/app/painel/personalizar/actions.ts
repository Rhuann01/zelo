"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { customizacaoLojaSchema } from "@/lib/schemas/painel";

export async function saveCustomizacaoAction(raw: unknown) {
  const parsed = customizacaoLojaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Configuração inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }
  const input = parsed.data;

  const updatePayload: Record<string, unknown> = {
    tema: input.tema,
    cor_primaria: input.cor_primaria,
    raio_borda_px: input.raio_borda_px,
    estilo_card: input.estilo_card,
    estilo_barra: input.estilo_barra,
    modo_escuro:
      input.tema === "glam" || input.tema === "urban" ? false : input.modo_escuro,
    chave_pix: input.chave_pix,
    sinal_centavos: input.sinal_centavos,
    updated_at: new Date().toISOString(),
  };

  if (input.nome !== undefined) updatePayload.nome = input.nome;
  if (input.cidade !== undefined) updatePayload.cidade = input.cidade;
  if (input.bairro !== undefined) updatePayload.bairro = input.bairro;
  if (input.endereco_texto !== undefined) updatePayload.endereco_texto = input.endereco_texto;
  if (input.cep !== undefined) updatePayload.cep = input.cep;
  if (input.latitude !== undefined) updatePayload.latitude = input.latitude;
  if (input.longitude !== undefined) updatePayload.longitude = input.longitude;

  const { data, error } = await supabase
    .from("lojas")
    .update(updatePayload)
    .eq("id", input.loja_id)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    return { error: "Apenas o proprietário pode personalizar o tema da loja." };
  }

  revalidateTag(`loja-${data.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/painel/personalizar");
  revalidatePath(`/${data.slug}`);
  revalidatePath("/explorar");
  return { ok: true, message: "Tema e PIX salvos com sucesso." };
}

export async function revalidateLojaMediaAction(lojaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data } = await supabase
    .from("lojas")
    .select("slug")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data?.slug) return { ok: false };

  revalidateTag(`loja-${data.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/painel/personalizar");
  revalidatePath(`/${data.slug}`);
  revalidatePath("/explorar");
  return { ok: true };
}

export async function savePresetBannerAction(
  lojaId: string,
  capaUrl: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const isValidBannerUrl =
    capaUrl === null ||
    capaUrl.startsWith("/banners/") ||
    capaUrl.startsWith("https://images.unsplash.com/") ||
    capaUrl.startsWith("https://pixabay.com/") ||
    capaUrl.startsWith("https://images.pexels.com/");
  if (!isValidBannerUrl) {
    return { ok: false, error: "Banner inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: loja } = await supabase
    .from("lojas")
    .select("id, slug")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!loja) return { ok: false, error: "Loja não encontrada ou sem permissão." };

  const { error } = await supabase
    .from("lojas")
    .update({ capa_url: capaUrl })
    .eq("id", lojaId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/painel/personalizar");
  revalidatePath(`/${loja.slug}`);
  revalidatePath("/explorar");
  return { ok: true };
}
