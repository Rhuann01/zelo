"use server";

import crypto from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  conviteProfissionalSchema,
  diaEspecialSchema,
  horariosLojaSchema,
  revogarConviteSchema,
  sairEquipeSchema,
  servicoSchema,
} from "@/lib/schemas/painel";

export interface ActionResult {
  error?: string;
  ok?: boolean;
  message?: string;
  token?: string;
  conviteId?: string;
  expiresAt?: string;
}

async function revalidateLojaCache(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lojaId?: string | null
) {
  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");

  if (!lojaId) return;
  const { data } = await supabase
    .from("lojas")
    .select("slug")
    .eq("id", lojaId)
    .maybeSingle();
  if (data?.slug) {
    revalidateTag(`loja-${data.slug}`);
    revalidatePath(`/${data.slug}`);
  }
}

export async function saveServicoAction(raw: unknown): Promise<ActionResult> {
  const parsed = servicoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados de serviço inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const input = parsed.data;

  if (input.id) {
    const { data, error } = await supabase
      .from("servicos")
      .update({
        nome: input.nome,
        descricao: input.descricao,
        duracao_min: input.duracao_min,
        preco_centavos: input.preco_centavos,
        ativo: input.ativo,
        ...(input.imagem_url !== undefined ? { imagem_url: input.imagem_url } : {}),
        exibir_imagem: input.exibir_imagem,
      })
      .eq("id", input.id)
      .eq("loja_id", input.loja_id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "Sem permissão ou serviço não encontrado." };
    }
  } else {
    const { error } = await supabase.from("servicos").insert({
      loja_id: input.loja_id,
      nome: input.nome,
      descricao: input.descricao,
      duracao_min: input.duracao_min,
      preco_centavos: input.preco_centavos,
      ativo: input.ativo,
      imagem_url: input.imagem_url ?? null,
      exibir_imagem: input.exibir_imagem,
    });
    if (error) {
      return { error: "Não foi possível criar o serviço (verifique suas permissões)." };
    }
  }

  await revalidateLojaCache(supabase, parsed.data.loja_id);
  return { ok: true };
}

export async function updateServicoImagemAction(
  servicoId: string,
  lojaId: string,
  imagemUrl: string | null,
  exibirImagem?: boolean
): Promise<ActionResult> {
  const parsed = z
    .object({
      servicoId: z.string().uuid(),
      lojaId: z.string().uuid(),
      imagemUrl: z.string().url().nullable(),
      exibirImagem: z.boolean().optional(),
    })
    .safeParse({ servicoId, lojaId, imagemUrl, exibirImagem });
  if (!parsed.success) {
    return { error: "Dados de imagem inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const updatePayload: { imagem_url: string | null; exibir_imagem?: boolean } = {
    imagem_url: parsed.data.imagemUrl,
  };
  if (parsed.data.exibirImagem !== undefined) {
    updatePayload.exibir_imagem = parsed.data.exibirImagem;
  }

  const { data, error } = await supabase
    .from("servicos")
    .update(updatePayload)
    .eq("id", parsed.data.servicoId)
    .eq("loja_id", parsed.data.lojaId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Não foi possível atualizar a foto do serviço." };
  }

  await revalidateLojaCache(supabase, parsed.data.lojaId);
  return { ok: true };
}

export async function toggleServicoImagemAction(
  servicoId: string,
  lojaId: string,
  exibirImagem: boolean
): Promise<ActionResult> {
  const parsed = z
    .object({
      servicoId: z.string().uuid(),
      lojaId: z.string().uuid(),
      exibirImagem: z.boolean(),
    })
    .safeParse({ servicoId, lojaId, exibirImagem });
  if (!parsed.success) {
    return { error: "Identificador inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("servicos")
    .update({ exibir_imagem: parsed.data.exibirImagem })
    .eq("id", parsed.data.servicoId)
    .eq("loja_id", parsed.data.lojaId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Não foi possível alterar a exibição da foto." };
  }

  await revalidateLojaCache(supabase, parsed.data.lojaId);
  return {
    ok: true,
    message: parsed.data.exibirImagem
      ? "Foto ativada na página da loja."
      : "Foto ocultada na página da loja.",
  };
}

export async function deleteServicoAction(servicoId: string, lojaId: string): Promise<ActionResult> {
  const ids = z
    .object({ servicoId: z.string().uuid(), lojaId: z.string().uuid() })
    .safeParse({ servicoId, lojaId });
  if (!ids.success) {
    return { error: "Identificador inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("servicos")
    .delete()
    .eq("id", ids.data.servicoId)
    .eq("loja_id", ids.data.lojaId);

  if (error) {
    return { error: "Não foi possível excluir o serviço." };
  }
  await revalidateLojaCache(supabase, ids.data.lojaId);
  return { ok: true };
}

export async function saveHorariosAction(raw: unknown): Promise<ActionResult> {
  const parsed = horariosLojaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Horários inválidos." };
  }

  const supabase = await createClient();
  const { loja_id, ...horarios } = parsed.data;

  const { data, error } = await supabase
    .from("lojas")
    .update({ horarios_loja: horarios, updated_at: new Date().toISOString() })
    .eq("id", loja_id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Apenas o proprietário pode alterar os horários da loja." };
  }

  await revalidateLojaCache(supabase, loja_id);
  return { ok: true, message: "Grade semanal salva." };
}

export async function createBloqueioAction(raw: unknown): Promise<ActionResult> {
  const parsed = diaEspecialSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados de bloqueio/dia especial inválidos." };
  }

  const { loja_id, data, hora_inicio, hora_fim, tipo, motivo } = parsed.data;
  const inicioIso = `${data}T${hora_inicio}:00-03:00`;
  const fimIso = `${data}T${hora_fim}:00-03:00`;

  if (new Date(fimIso) <= new Date(inicioIso)) {
    return { error: "O horário final deve ser maior que o inicial." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bloqueios_agenda").insert({
    loja_id,
    profissional_id: null,
    inicio: inicioIso,
    fim: fimIso,
    tipo,
    motivo,
  });

  if (error) {
    return { error: "Não foi possível registrar o dia especial/bloqueio." };
  }

  await revalidateLojaCache(supabase, parsed.data.loja_id);
  return { ok: true };
}

export async function toggleDonoAtendeAction(
  lojaId: string,
  profissionalId: string,
  ativo: boolean
): Promise<ActionResult> {
  const parsed = z
    .object({ lojaId: z.string().uuid(), profissionalId: z.string().uuid(), ativo: z.boolean() })
    .safeParse({ lojaId, profissionalId, ativo });
  if (!parsed.success) {
    return { error: "Parâmetros inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("profissionais")
    .update({ ativo: parsed.data.ativo, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.profissionalId)
    .eq("loja_id", parsed.data.lojaId)
    .eq("eh_dono", true)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Não foi possível atualizar a chave de atendimento do proprietário." };
  }

  await revalidateLojaCache(supabase, parsed.data.lojaId);
  return { ok: true };
}

export async function gerarConviteEquipeAction(raw: unknown): Promise<ActionResult> {
  const parsed = conviteProfissionalSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados do convite inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const rl = checkRateLimit(`convite:gerar:${user.id}`, 20, 60 * 60_000);
  if (!rl.allowed) {
    return { error: "Limite de convites por hora atingido. Aguarde um pouco." };
  }

  const input = parsed.data;

  const [{ data: loja }, { count }] = await Promise.all([
    supabase
      .from("lojas")
      .select("plano, owner_id")
      .eq("id", input.loja_id)
      .maybeSingle(),
    supabase
      .from("profissionais")
      .select("id", { count: "exact", head: true })
      .eq("loja_id", input.loja_id)
      .eq("ativo", true),
  ]);

  if (!loja) return { error: "Loja não encontrada." };
  if (loja.owner_id !== user.id) {
    return { error: "Apenas o proprietário pode gerar links de convite." };
  }

  const ativos = count ?? 0;
  if (loja.plano === "solo" && ativos >= 1) {
    return {
      error:
        "No Plano Solo apenas 1 profissional pode ficar ativo. Faça upgrade para Estúdio (até 5).",
    };
  }
  if (ativos >= 5) {
    return { error: "Limite de 5 profissionais ativos atingido no Plano Estúdio." };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");

  const { data: convite, error } = await supabase
    .from("convites_equipe")
    .insert({
      loja_id: input.loja_id,
      criado_por: user.id,
      token_hash: tokenHash,
      cargo: input.cargo,
      comissao_percentual: input.comissao_percentual,
    })
    .select("id, expires_at")
    .single();

  if (error || !convite) {
    return { error: "Não foi possível gerar o link de convite agora." };
  }

  revalidatePath("/painel/gestao");
  return {
    ok: true,
    token,
    conviteId: convite.id,
    expiresAt: convite.expires_at,
  };
}

export async function revogarConviteEquipeAction(raw: unknown): Promise<ActionResult> {
  const parsed = revogarConviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Identificador de convite inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("convites_equipe")
    .update({ status: "revogado" })
    .eq("id", parsed.data.convite_id)
    .eq("loja_id", parsed.data.loja_id)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Não foi possível revogar este convite." };
  }

  revalidatePath("/painel/gestao");
  return { ok: true, message: "Link de convite revogado com segurança." };
}

export async function sairDaEquipeAction(raw: unknown): Promise<ActionResult> {
  const parsed = sairEquipeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Loja inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.rpc("sair_da_equipe", {
    p_loja_id: parsed.data.loja_id,
  });

  if (error) {
    return { error: error.message || "Não foi possível sair da equipe." };
  }

  await revalidateLojaCache(supabase, parsed.data.loja_id);
  revalidatePath("/painel");
  return { ok: true, message: "Você saiu da equipe desta loja." };
}

export async function desligarProfissionalAction(
  profissionalId: string,
  transferirParaId: string | null
): Promise<ActionResult> {
  const parsed = z
    .object({
      profissionalId: z.string().uuid(),
      transferirParaId: z.string().uuid().nullable(),
    })
    .safeParse({ profissionalId, transferirParaId });
  if (!parsed.success) {
    return { error: "Identificador de profissional inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profInfo } = await supabase
    .from("profissionais")
    .select("loja_id")
    .eq("id", parsed.data.profissionalId)
    .maybeSingle();

  const { error } = await supabase.rpc("desligar_profissional", {
    p_profissional_id: parsed.data.profissionalId,
    p_transferir_para_id: parsed.data.transferirParaId,
  });

  if (error) {
    return { error: error.message || "Falha ao desligar profissional." };
  }

  await revalidateLojaCache(supabase, profInfo?.loja_id);
  return { ok: true };
}
