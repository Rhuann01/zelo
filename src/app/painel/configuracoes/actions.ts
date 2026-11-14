"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { perfilConfigSchema } from "@/lib/schemas/painel";
import {
  hashSecurityPassword,
  verifySecurityPassword,
} from "@/lib/security/pin-hash";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  parseSuperAdminAllowlist,
  parseSuperAdminEmailAllowlist,
} from "@/lib/super-admin/guard";

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

  if (
    input.loja_id !== undefined &&
    (input.pausada !== undefined || input.nome_loja !== undefined)
  ) {
    const lojaUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.pausada !== undefined) lojaUpdate.pausada = input.pausada;
    if (input.nome_loja !== undefined) lojaUpdate.nome = input.nome_loja;

    const { data: lojaAtualizada, error: lojaErr } = await supabase
      .from("lojas")
      .update(lojaUpdate)
      .eq("id", input.loja_id)
      .eq("owner_id", user.id)
      .select("id, slug")
      .maybeSingle();

    if (lojaErr || !lojaAtualizada) {
      return { error: "Apenas o proprietário pode editar as configurações da loja." };
    }

    revalidateTag(`loja-${lojaAtualizada.slug}`);
    revalidateTag("vitrine-explorar");
    revalidatePath(`/${lojaAtualizada.slug}`);
    revalidatePath("/explorar");
  }

  if (input.minha_chave_pix !== undefined && input.loja_id) {
    const { data: lojaCfg } = await supabase
      .from("lojas")
      .select("pix_modo")
      .eq("id", input.loja_id)
      .maybeSingle();

    if (lojaCfg?.pix_modo === "profissional") {
      await supabase
        .from("profissionais")
        .update({ chave_pix: input.minha_chave_pix || null })
        .eq("loja_id", input.loja_id)
        .eq("user_id", user.id);
    }
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

const definirSenhaSegurancaSchema = z
  .object({
    senha_atual: z.string().max(128).optional(),
    nova_senha: z
      .string()
      .min(6, "A senha de segurança deve ter no mínimo 6 caracteres.")
      .max(128, "Senha muito longa."),
  })
  .strict();

export async function definirSenhaSegurancaAction(raw: unknown) {
  const parsed = definirSenhaSegurancaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const rl = checkRateLimit(`seguranca:pin:${user.id}`, 10, 15 * 60_000);
  if (!rl.allowed) {
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("seguranca_pin_hash")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.seguranca_pin_hash) {
    if (!parsed.data.senha_atual) {
      return { error: "Informe sua senha de segurança atual para alterá-la." };
    }
    if (!verifySecurityPassword(parsed.data.senha_atual, perfil.seguranca_pin_hash)) {
      return { error: "Senha de segurança atual incorreta." };
    }
  }

  const hash = hashSecurityPassword(parsed.data.nova_senha);
  const { error: updateErr } = await supabase
    .from("perfis")
    .update({
      seguranca_pin_hash: hash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateErr) {
    return { error: "Não foi possível salvar a senha de segurança." };
  }

  revalidatePath("/painel/configuracoes");
  return {
    ok: true,
    message: perfil?.seguranca_pin_hash
      ? "Senha de segurança atualizada."
      : "Senha de segurança ativada na conta.",
  };
}

const excluirLojaSchema = z
  .object({
    loja_id: z.string().uuid("Loja inválida."),
    confirm_slug: z.string().min(1, "Digite o identificador (slug) da loja."),
    senha_seguranca: z.string().min(1, "Informe sua senha de segurança."),
  })
  .strict();

export async function excluirLojaAction(raw: unknown) {
  const parsed = excluirLojaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const rl = checkRateLimit(`loja:excluir:${user.id}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    return { error: "Muitas tentativas de exclusão. Aguarde 15 minutos." };
  }

  const [{ data: loja }, { data: perfil }] = await Promise.all([
    supabase
      .from("lojas")
      .select("id, slug, owner_id")
      .eq("id", parsed.data.loja_id)
      .maybeSingle(),
    supabase
      .from("perfis")
      .select("seguranca_pin_hash")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!loja) return { error: "Loja não encontrada." };
  if (loja.owner_id !== user.id) {
    return { error: "Apenas o proprietário pode apagar a loja." };
  }
  if (!perfil?.seguranca_pin_hash) {
    return {
      error: "Defina uma senha de segurança acima antes de apagar qualquer loja.",
    };
  }
  if (parsed.data.confirm_slug.trim() !== loja.slug) {
    return { error: `Digite exatamente "${loja.slug}" para confirmar.` };
  }
  if (!verifySecurityPassword(parsed.data.senha_seguranca, perfil.seguranca_pin_hash)) {
    return { error: "Senha de segurança incorreta." };
  }

  const { error: rpcErr } = await supabase.rpc("excluir_loja_segura", {
    p_loja_id: loja.id,
  });

  if (rpcErr) {
    return { error: rpcErr.message || "Não foi possível apagar a loja." };
  }

  const cookieStore = await cookies();
  if (cookieStore.get("zelo_loja_id")?.value === loja.id) {
    cookieStore.delete("zelo_loja_id");
  }

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath(`/${loja.slug}`);
  revalidatePath("/explorar");
  revalidatePath("/painel");
  revalidatePath("/painel/configuracoes");

  return { ok: true, message: "Loja apagada permanentemente." };
}

export async function checkIsSuperAdminAction(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const allowUids = parseSuperAdminAllowlist();
  const allowEmails = parseSuperAdminEmailAllowlist();
  return (
    allowUids.has(user.id) ||
    (!!user.email && allowEmails.has(user.email.toLowerCase()))
  );
}
