"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const MetaSemanalSchema = z.object({
  lojaId: z.string().uuid(),
  metaCentavos: z.number().int().min(0).max(100_000_000),
});

export async function atualizarMetaSemanalAction(input: {
  lojaId: string;
  metaCentavos: number;
}): Promise<{ ok: boolean; error?: string; metaCentavos?: number }> {
  const parsed = MetaSemanalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Valor de meta inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_meta_semanal", {
    p_loja_id: parsed.data.lojaId,
    p_meta_centavos: parsed.data.metaCentavos,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Não foi possível salvar sua meta semanal.",
    };
  }

  revalidatePath("/painel/financeiro");
  return { ok: true, metaCentavos: parsed.data.metaCentavos };
}
