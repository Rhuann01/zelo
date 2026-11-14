"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createLojaSchema, type CreateLojaInput } from "@/lib/schemas/loja";

export interface OnboardingResult {
  error?: string;
}

const COR_PADRAO_POR_TEMA: Record<CreateLojaInput["tema"], string> = {
  urban: "#F59E0B",
  glam: "#BE185D",
  brutal: "#A3E635",
  slate: "#2563EB",
};

const RAIO_PADRAO_POR_TEMA: Record<CreateLojaInput["tema"], number> = {
  urban: 12,
  glam: 20,
  brutal: 4,
  slate: 8,
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

  const input = parsed.data;

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
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      whatsapp_loja: input.whatsapp_loja,
      tema: input.tema,
      cor_primaria: COR_PADRAO_POR_TEMA[input.tema],
      raio_borda_px: RAIO_PADRAO_POR_TEMA[input.tema],
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
    ativo: true,
    ordem: idx,
  }));

  const { error: srvError } = await supabase.from("servicos").insert(servicosPayload);
  if (srvError) {
    return { error: "Loja criada, mas falhou ao salvar os serviços iniciais." };
  }

  redirect("/painel");
}
