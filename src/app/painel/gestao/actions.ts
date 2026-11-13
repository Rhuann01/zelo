"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  conviteProfissionalSchema,
  diaEspecialSchema,
  horariosLojaSchema,
  servicoSchema,
} from "@/lib/schemas/painel";

export interface ActionResult {
  error?: string;
  ok?: boolean;
  message?: string;
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
    });
    if (error) {
      return { error: "Não foi possível criar o serviço (verifique suas permissões)." };
    }
  }

  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
  return { ok: true };
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
  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
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

  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
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

  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
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

  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
  return { ok: true };
}

export async function convidarProfissionalAction(raw: unknown): Promise<ActionResult> {
  const parsed = conviteProfissionalSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados do convite inválidos." };
  }

  const supabase = await createClient();
  const input = parsed.data;

  const [{ data: loja }, { count }] = await Promise.all([
    supabase.from("lojas").select("plano").eq("id", input.loja_id).single(),
    supabase
      .from("profissionais")
      .select("id", { count: "exact", head: true })
      .eq("loja_id", input.loja_id)
      .eq("ativo", true),
  ]);

  if (!loja) return { error: "Loja não encontrada." };

  const ativos = count ?? 0;
  if (loja.plano === "solo" && ativos >= 1) {
    return { error: "No Plano Solo apenas 1 profissional pode ficar ativo. Faça upgrade para Estúdio (até 5)." };
  }
  if (ativos >= 5) {
    return { error: "Limite de 5 profissionais ativos atingido no Plano Estúdio." };
  }

  const { error } = await supabase.from("profissionais").insert({
    loja_id: input.loja_id,
    nome: input.nome,
    email_convite: input.email_convite,
    cargo: input.cargo,
    comissao_percentual: input.comissao_percentual,
    eh_dono: false,
    ativo: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este profissional já está vinculado a esta loja." };
    }
    return { error: "Sem permissão ou erro ao convidar profissional." };
  }

  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
  return { ok: true };
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

  const { error } = await supabase.rpc("desligar_profissional", {
    p_profissional_id: parsed.data.profissionalId,
    p_transferir_para_id: parsed.data.transferirParaId,
  });

  if (error) {
    return { error: error.message || "Falha ao desligar profissional." };
  }

  revalidatePath("/painel/gestao");
  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
  return { ok: true };
}
