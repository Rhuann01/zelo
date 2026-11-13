"use server";

import { revalidatePath } from "next/cache";
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

  const { data, error } = await supabase
    .from("lojas")
    .update({
      tema: input.tema,
      cor_primaria: input.cor_primaria,
      raio_borda_px: input.raio_borda_px,
      chave_pix: input.chave_pix,
      sinal_centavos: input.sinal_centavos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.loja_id)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    return { error: "Apenas o proprietário pode personalizar o tema da loja." };
  }

  revalidatePath("/painel/personalizar");
  revalidatePath(`/${data.slug}`);
  return { ok: true, message: "Tema e PIX salvos com sucesso." };
}
