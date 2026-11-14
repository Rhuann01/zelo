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
    chave_pix: input.chave_pix,
    sinal_centavos: input.sinal_centavos,
    updated_at: new Date().toISOString(),
  };

  if (input.cidade !== undefined) updatePayload.cidade = input.cidade;
  if (input.bairro !== undefined) updatePayload.bairro = input.bairro;
  if (input.endereco_texto !== undefined) updatePayload.endereco_texto = input.endereco_texto;
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
