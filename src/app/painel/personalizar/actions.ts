"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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

  const updatePayload: Record<string, unknown> = {
    tema: input.tema,
    cor_primaria: input.cor_primaria,
    raio_borda_px: input.raio_borda_px,
    estilo_card: input.estilo_card,
    estilo_barra: input.estilo_barra,
    modo_escuro:
      input.tema === "glam" || input.tema === "urban" ? false : input.modo_escuro,
    pix_modo: input.pix_modo,
    chave_pix: input.chave_pix,
    sinal_centavos: input.sinal_centavos,
    updated_at: new Date().toISOString(),
  };

  if (input.nome !== undefined) updatePayload.nome = input.nome;
  if (input.cidade !== undefined) updatePayload.cidade = input.cidade;
  if (input.bairro !== undefined) updatePayload.bairro = input.bairro;
  if (input.endereco_texto !== undefined) updatePayload.endereco_texto = input.endereco_texto;
  if (input.cep !== undefined) updatePayload.cep = input.cep;
  if (input.latitude !== undefined) updatePayload.latitude = input.latitude;
  if (input.longitude !== undefined) updatePayload.longitude = input.longitude;

  const { data, error } = await supabase
    .from("lojas")
    .update(updatePayload)
    .eq("id", input.loja_id)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    return { error: "Apenas o proprietário pode personalizar o tema da loja." };
  }

  revalidateTag(`loja-${data.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/painel/personalizar");
  revalidatePath(`/${data.slug}`);
  revalidatePath("/explorar");
  return { ok: true, message: "Tema e PIX salvos com sucesso." };
}

export async function revalidateLojaMediaAction(lojaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data } = await supabase
    .from("lojas")
    .select("slug")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data?.slug) return { ok: false };

  revalidateTag(`loja-${data.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/painel/personalizar");
  revalidatePath(`/${data.slug}`);
  revalidatePath("/explorar");
  return { ok: true };
}

export async function savePresetBannerAction(
  lojaId: string,
  capaUrl: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const isValidBannerUrl =
    capaUrl === null ||
    capaUrl.startsWith("/banners/") ||
    capaUrl.startsWith("https://images.unsplash.com/") ||
    capaUrl.startsWith("https://pixabay.com/") ||
    capaUrl.startsWith("https://images.pexels.com/");
  if (!isValidBannerUrl) {
    return { ok: false, error: "Banner inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: loja } = await supabase
    .from("lojas")
    .select("id, slug")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!loja) return { ok: false, error: "Loja não encontrada ou sem permissão." };

  const { error } = await supabase
    .from("lojas")
    .update({ capa_url: capaUrl })
    .eq("id", lojaId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/painel/personalizar");
  revalidatePath(`/${loja.slug}`);
  revalidatePath("/explorar");
  return { ok: true };
}

const SLUG_RESERVADOS = new Set([
  "api",
  "auth",
  "convite",
  "entrar",
  "explorar",
  "onboarding",
  "painel",
  "privacidade",
  "super-admin",
  "termos",
]);

export async function atualizarSlugLojaAction(
  lojaId: string,
  novoSlugRaw: string
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const clean = novoSlugRaw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (clean.length < 3 || clean.length > 40) {
    return { ok: false, error: "O link deve ter entre 3 e 40 caracteres." };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(clean)) {
    return { ok: false, error: "Use apenas letras minúsculas, números e hífen." };
  }
  if (SLUG_RESERVADOS.has(clean)) {
    return { ok: false, error: "Esse identificador é reservado pelo sistema." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: loja } = await supabase
    .from("lojas")
    .select("id, slug")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!loja) return { ok: false, error: "Loja não encontrada ou sem permissão." };
  if (loja.slug === clean) return { ok: true, slug: clean };

  const { data: existente } = await supabase
    .from("lojas")
    .select("id")
    .eq("slug", clean)
    .neq("id", lojaId)
    .maybeSingle();

  if (existente) {
    return { ok: false, error: "Este link já está em uso por outro espaço." };
  }

  const { error } = await supabase
    .from("lojas")
    .update({ slug: clean })
    .eq("id", lojaId)
    .eq("owner_id", user.id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o link agora." };
  }

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag(`loja-${clean}`);
  revalidateTag("vitrine-explorar");
  revalidatePath(`/${loja.slug}`);
  revalidatePath(`/${clean}`);
  revalidatePath("/painel");
  revalidatePath("/painel/personalizar");
  revalidatePath("/explorar");

  return { ok: true, slug: clean };
}

export async function atualizarDescricaoLinksLojaAction(
  lojaId: string,
  payload: {
    descricao_publica: string;
    links_publicos: Array<{ tipo: string; label: string; url: string }>;
  }
): Promise<{
  ok: boolean;
  descricao_publica?: string;
  links_publicos?: Array<{
    tipo: "instagram" | "whatsapp" | "tiktok" | "youtube" | "facebook" | "site" | "outro";
    label: string;
    url: string;
  }>;
  error?: string;
}> {
  const {
    lojaDescricaoLinksSchema,
    normalizePublicLinkUrl,
    LINK_PUBLICO_DEFAULT_LABEL,
  } = await import("@/lib/schemas/loja-links");

  const parsed = lojaDescricaoLinksSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const normalizedLinks: Array<{
    tipo: "instagram" | "whatsapp" | "tiktok" | "youtube" | "facebook" | "site" | "outro";
    label: string;
    url: string;
  }> = [];

  for (const item of parsed.data.links_publicos) {
    const safeUrl = normalizePublicLinkUrl(item.tipo, item.url);
    if (!safeUrl) {
      return {
        ok: false,
        error: `Link inválido em ${LINK_PUBLICO_DEFAULT_LABEL[item.tipo]}. Use https://, @usuario ou telefone.`,
      };
    }
    normalizedLinks.push({
      tipo: item.tipo,
      label: item.label.trim() || LINK_PUBLICO_DEFAULT_LABEL[item.tipo],
      url: safeUrl,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: loja } = await supabase
    .from("lojas")
    .select("id, slug")
    .eq("id", lojaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!loja) return { ok: false, error: "Loja não encontrada ou sem permissão." };

  const { error } = await supabase
    .from("lojas")
    .update({
      descricao_publica: parsed.data.descricao_publica,
      links_publicos: normalizedLinks,
    })
    .eq("id", lojaId)
    .eq("owner_id", user.id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar descrição e links agora." };
  }

  revalidateTag(`loja-${loja.slug}`);
  revalidatePath(`/${loja.slug}`);
  revalidatePath("/painel/personalizar");

  return {
    ok: true,
    descricao_publica: parsed.data.descricao_publica,
    links_publicos: normalizedLinks,
  };
}
