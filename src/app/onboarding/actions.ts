"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createLojaSchema,
  safeImageUrlSchema,
  type CreateLojaInput,
} from "@/lib/schemas/loja";

export interface OnboardingResult {
  ok?: boolean;
  error?: string;
  lojaId?: string;
  servicoIds?: string[];
}

const COR_PADRAO_POR_TEMA: Record<CreateLojaInput["tema"], string> = {
  urban: "#F59E0B",
  glam: "#BE185D",
  brutal: "#A3E635",
  slate: "#2563EB",
  liquid_glass: "#007AFF",
  material_you: "#6750A4",
};

const RAIO_PADRAO_POR_TEMA: Record<CreateLojaInput["tema"], number> = {
  urban: 12,
  glam: 20,
  brutal: 4,
  slate: 8,
  liquid_glass: 20,
  material_you: 18,
};

export async function createLojaAction(rawInput: CreateLojaInput): Promise<OnboardingResult> {
  const parsed = createLojaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const { count: lojasCount } = await supabase
    .from("lojas")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((lojasCount ?? 0) >= 3) {
    return { error: "Limite máximo de 3 lojas por conta atingido." };
  }

  const input = parsed.data;
  const nowIso = new Date().toISOString();

  const { data: loja, error: lojaError } = await supabase
    .from("lojas")
    .insert({
      owner_id: user.id,
      nome: input.nome,
      slug: input.slug,
      nicho: input.nicho,
      cidade: input.cidade,
      bairro: input.bairro,
      endereco_texto: input.endereco_texto,
      cep: input.cep,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      whatsapp_loja: input.whatsapp_loja,
      chave_pix: input.chave_pix?.trim() || null,
      pix_modo: input.pix_modo,
      tema: input.tema,
      estilo_card: input.estilo_card,
      estilo_barra: input.estilo_barra,
      modo_escuro:
        input.tema === "glam" || input.tema === "urban" ? false : Boolean(input.modo_escuro),
      logo_url: input.logo_url || null,
      capa_url: input.capa_url || null,
      cor_primaria: COR_PADRAO_POR_TEMA[input.tema],
      raio_borda_px: RAIO_PADRAO_POR_TEMA[input.tema],
      termos_aceitos_em: input.aceitou_termos ? nowIso : null,
      horarios_loja: {
        seg: { ativo: true, abre: "09:00", fecha: "20:00" },
        ter: { ativo: true, abre: "09:00", fecha: "20:00" },
        qua: { ativo: true, abre: "09:00", fecha: "20:00" },
        qui: { ativo: true, abre: "09:00", fecha: "20:00" },
        sex: { ativo: true, abre: "09:00", fecha: "21:00" },
        sab: { ativo: true, abre: "08:30", fecha: "19:30" },
        dom: { ativo: false, abre: "09:00", fecha: "14:00" },
      },
    })
    .select("id")
    .single();

  if (lojaError) {
    if (lojaError.code === "23505") {
      return { error: "Esse link já está em uso. Escolha outro endereço para sua loja." };
    }
    return { error: "Não foi possível criar a loja agora. Tente novamente." };
  }

  if (input.aceitou_termos) {
    await supabase
      .from("perfis")
      .update({ termos_aceitos_em: nowIso, updated_at: nowIso })
      .eq("id", user.id);
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, avatar_url")
    .eq("id", user.id)
    .single();

  const { error: profError } = await supabase.from("profissionais").insert({
    loja_id: loja.id,
    user_id: user.id,
    nome: perfil?.nome || "Responsável",
    cargo: "Proprietário",
    eh_dono: true,
    ativo: true,
    avatar_url: perfil?.avatar_url ?? null,
    comissao_percentual: 100,
  });

  if (profError) {
    return { error: "Loja criada, mas falhou ao vincular profissional responsável." };
  }

  const servicosPayload = input.servicos.map((s, idx) => ({
    loja_id: loja.id,
    nome: s.nome,
    duracao_min: s.duracao_min,
    preco_centavos: s.preco_centavos,
    imagem_url: s.imagem_url || null,
    exibir_imagem: Boolean(s.imagem_url && s.exibir_imagem),
    ativo: true,
    ordem: idx,
  }));

  const { data: insertedServicos, error: srvError } = await supabase
    .from("servicos")
    .insert(servicosPayload)
    .select("id");
  if (srvError) {
    return { error: "Loja criada, mas falhou ao salvar os serviços iniciais." };
  }

  const cookieStore = await cookies();
  cookieStore.set("zelo_loja_id", loja.id, {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  revalidateTag("vitrine-explorar");
  revalidatePath("/explorar");
  revalidatePath("/painel", "layout");
  revalidatePath("/super-admin");
  revalidatePath(`/${input.slug}`);

  return {
    ok: true,
    lojaId: loja.id,
    servicoIds: (insertedServicos ?? []).map((s) => s.id),
  };
}

const updateOnboardingMediaSchema = z
  .object({
    lojaId: z.string().uuid(),
    logo_url: safeImageUrlSchema.nullable().optional(),
    capa_url: safeImageUrlSchema.nullable().optional(),
    servicosMedia: z
      .array(
        z.object({
          id: z.string().uuid(),
          imagem_url: safeImageUrlSchema,
        })
      )
      .max(20)
      .optional(),
  })
  .strict();

export async function updateOnboardingMediaAction(raw: unknown): Promise<{ ok?: boolean; error?: string }> {
  const parsed = updateOnboardingMediaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Dados de mídia inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { lojaId, logo_url, capa_url, servicosMedia } = parsed.data;

  const { data: loja } = await supabase
    .from("lojas")
    .select("id, slug, owner_id")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!loja) return { error: "Sem permissão para atualizar esta loja." };

  if (logo_url !== undefined || capa_url !== undefined) {
    const patch: Record<string, string | null> = {};
    if (logo_url !== undefined) patch.logo_url = logo_url;
    if (capa_url !== undefined) patch.capa_url = capa_url;
    await supabase.from("lojas").update(patch).eq("id", lojaId);
  }

  if (servicosMedia && servicosMedia.length > 0) {
    await Promise.all(
      servicosMedia.map((item) =>
        supabase
          .from("servicos")
          .update({ imagem_url: item.imagem_url, exibir_imagem: true })
          .eq("id", item.id)
          .eq("loja_id", lojaId)
      )
    );
  }

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath(`/${loja.slug}`);
  revalidatePath("/painel", "layout");
  return { ok: true };
}
