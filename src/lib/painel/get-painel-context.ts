import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LojaResumo {
  id: string;
  owner_id: string;
  slug: string;
  nome: string;
  nicho: string;
  cidade: string;
  bairro: string;
  tema: "urban" | "glam" | "brutal" | "slate" | "liquid_glass" | "material_you";
  cor_primaria: string;
  raio_borda_px: number;
  estilo_card: "preenchido" | "vidro_borrado";
  estilo_barra: "abas" | "dock_flutuante";
  modo_escuro: boolean;
  pix_modo: "loja" | "profissional";
  chave_pix: string | null;
  sinal_centavos: number;
  logo_url: string | null;
  capa_url: string | null;
  horarios_loja: Record<string, unknown>;
  pausada: boolean;
  plano: "trial" | "solo" | "estudio";
  assinatura_status: string;
  trial_ate: string | null;
}

export interface PainelContext {
  userId: string;
  userEmail: string;
  perfil: {
    nome: string;
    email: string | null;
    whatsapp: string | null;
    avatar_url: string | null;
    avatar_customizado: boolean;
    notificacoes_push: boolean;
    notificacoes_novo_agendamento: boolean;
    notificacoes_email: boolean;
  };
  lojas: LojaResumo[];
  lojaAtual: LojaResumo;
  isOwner: boolean;
}

export const getPainelContext = cache(async function getPainelContext(
  nextPath = "/painel"
): Promise<PainelContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  }

  const [{ data: perfil }, { data: lojasProprias }, { data: vinculos }] = await Promise.all([
    supabase
      .from("perfis")
      .select("nome, email, whatsapp, avatar_url, avatar_customizado, notificacoes_push, notificacoes_novo_agendamento, notificacoes_email")
      .eq("id", user.id)
      .single(),
    supabase
      .from("lojas")
      .select(
        "id, owner_id, slug, nome, nicho, cidade, bairro, tema, cor_primaria, raio_borda_px, estilo_card, estilo_barra, modo_escuro, pix_modo, chave_pix, sinal_centavos, logo_url, capa_url, horarios_loja, pausada, plano, assinatura_status, trial_ate"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("profissionais")
      .select("loja_id")
      .eq("user_id", user.id)
      .eq("ativo", true),
  ]);

  const ownIds = new Set((lojasProprias ?? []).map((l) => l.id));
  const extraLojaIds = (vinculos ?? [])
    .map((v) => v.loja_id)
    .filter((id) => !ownIds.has(id));

  let lojasMembro: LojaResumo[] = [];
  if (extraLojaIds.length > 0) {
    const { data: memberStores } = await supabase
      .from("lojas")
      .select(
        "id, owner_id, slug, nome, nicho, cidade, bairro, tema, cor_primaria, raio_borda_px, estilo_card, estilo_barra, modo_escuro, pix_modo, chave_pix, sinal_centavos, logo_url, capa_url, horarios_loja, pausada, plano, assinatura_status, trial_ate"
      )
      .in("id", extraLojaIds)
      .order("created_at", { ascending: true });
    lojasMembro = (memberStores ?? []) as LojaResumo[];
  }

  const lojas = [...((lojasProprias ?? []) as LojaResumo[]), ...lojasMembro];

  if (lojas.length === 0) {
    redirect("/explorar");
  }

  const cookieStore = await cookies();
  const savedLojaId = cookieStore.get("zelo_loja_id")?.value;
  const lojaAtual = lojas.find((l) => l.id === savedLojaId) ?? lojas[0];

  return {
    userId: user.id,
    userEmail: user.email ?? "",
    perfil: {
      nome: perfil?.nome ?? user.email ?? "Usuário Zelo",
      email: perfil?.email ?? user.email ?? null,
      whatsapp: perfil?.whatsapp ?? null,
      avatar_url: perfil?.avatar_url ?? null,
      avatar_customizado: perfil?.avatar_customizado ?? false,
      notificacoes_push: perfil?.notificacoes_push ?? true,
      notificacoes_novo_agendamento: perfil?.notificacoes_novo_agendamento ?? true,
      notificacoes_email: perfil?.notificacoes_email ?? true,
    },
    lojas,
    lojaAtual,
    isOwner: lojaAtual.owner_id === user.id,
  };
});
