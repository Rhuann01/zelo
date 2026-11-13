"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { perfilConfigSchema } from "@/lib/schemas/painel";

export async function saveConfiguracoesAction(raw: unknown) {
  const parsed = perfilConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada." };

  const input = parsed.data;
  const { error: perfilErr } = await supabase
    .from("perfis")
    .update({
      nome: input.nome,
      whatsapp: input.whatsapp || null,
      notificacoes_push: input.notificacoes_push,
      notificacoes_email: input.notificacoes_email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (perfilErr) {
    return { error: "Não foi possível salvar seu perfil." };
  }

  if (input.loja_id !== undefined && input.pausada !== undefined) {
    const { data: lojaAtualizada, error: lojaErr } = await supabase
      .from("lojas")
      .update({ pausada: input.pausada, updated_at: new Date().toISOString() })
      .eq("id", input.loja_id)
      .eq("owner_id", user.id)
      .select("id, slug")
      .maybeSingle();

    if (lojaErr || !lojaAtualizada) {
      return { error: "Apenas o proprietário pode pausar ou reativar a loja." };
    }

    revalidateTag(`loja-${lojaAtualizada.slug}`);
    revalidateTag("vitrine-explorar");
    revalidatePath(`/${lojaAtualizada.slug}`);
    revalidatePath("/explorar");
  }

  revalidatePath("/painel/configuracoes");
  revalidatePath("/painel");
  return { ok: true, message: "Configurações salvas." };
}

export async function signOutConfigAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
