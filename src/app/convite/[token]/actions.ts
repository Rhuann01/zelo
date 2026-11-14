"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tokenConviteSchema } from "@/lib/schemas/painel";

export interface AceitarConviteResult {
  ok?: boolean;
  error?: string;
  lojaNome?: string;
  lojaSlug?: string;
}

export async function aceitarConviteAction(rawToken: string): Promise<AceitarConviteResult> {
  const parsed = tokenConviteSchema.safeParse({ token: rawToken });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Link de convite inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa entrar com sua conta Google antes de aceitar." };
  }

  const { data, error } = await supabase.rpc("aceitar_convite_equipe", {
    p_token: parsed.data.token,
  });

  if (error) {
    return { error: error.message || "Não foi possível aceitar o convite." };
  }

  const res = (data ?? {}) as { loja_nome?: string; loja_slug?: string };
  if (res.loja_slug) {
    revalidateTag(`loja-${res.loja_slug}`);
    revalidatePath(`/${res.loja_slug}`);
  }
  revalidatePath("/painel");
  revalidatePath("/painel/gestao");

  return {
    ok: true,
    lojaNome: res.loja_nome,
    lojaSlug: res.loja_slug,
  };
}
