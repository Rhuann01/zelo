import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export interface LojaPublica {
  id: string;
  slug: string;
  nome: string;
  nicho: "barbearia" | "manicure" | "salao" | "estetica" | "outro";
  cidade: string;
  bairro: string;
  endereco_texto: string;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp_loja: string;
  sinal_centavos: number;
  tema: "urban" | "glam" | "brutal" | "slate" | "liquid_glass" | "material_you";
  cor_primaria: string;
  raio_borda_px: number;
  estilo_card: "preenchido" | "vidro_borrado";
  estilo_barra: "abas" | "dock_flutuante";
  modo_escuro: boolean;
  logo_url: string | null;
  capa_url: string | null;
  horarios_loja: Record<string, unknown>;
  pausada: boolean;
}

export interface ServicoPublico {
  id: string;
  nome: string;
  descricao: string;
  duracao_min: number;
  preco_centavos: number;
  imagem_url: string | null;
  exibir_imagem: boolean;
}

export interface ProfissionalPublico {
  id: string;
  nome: string;
  cargo: string;
  eh_dono: boolean;
  avatar_url: string | null;
}

export interface LojaPublicaCompleta {
  loja: LojaPublica;
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
}

export interface VitrineLojaCard {
  id: string;
  slug: string;
  nome: string;
  nicho: LojaPublica["nicho"];
  cidade: string;
  bairro: string;
  tema: LojaPublica["tema"];
  cor_primaria: string;
  raio_borda_px: number;
  logo_url: string | null;
  capa_url: string | null;
  sinal_centavos: number;
  preco_inicial_centavos: number | null;
  total_servicos: number;
}

export function getAccentInk(hex: string): "#111111" | "#FFFFFF" {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#111111";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Relative luminance heuristic (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#111111" : "#FFFFFF";
}

export async function getLojaPublicaBySlug(slug: string): Promise<LojaPublicaCompleta | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  const cached = unstable_cache(
    async (): Promise<LojaPublicaCompleta | null> => {
      const supabase = createPublicClient();
      const { data: loja } = await supabase
        .from("lojas")
        .select(
          "id, slug, nome, nicho, cidade, bairro, endereco_texto, maps_url, latitude, longitude, whatsapp_loja, sinal_centavos, tema, cor_primaria, raio_borda_px, estilo_card, estilo_barra, modo_escuro, logo_url, capa_url, horarios_loja, pausada"
        )
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (!loja) return null;

      const [{ data: servicos }, { data: profissionais }] = await Promise.all([
        supabase
          .from("servicos")
          .select("id, nome, descricao, duracao_min, preco_centavos, imagem_url, exibir_imagem")
          .eq("loja_id", loja.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("preco_centavos", { ascending: true }),
        supabase
          .from("profissionais")
          .select("id, nome, cargo, eh_dono, avatar_url")
          .eq("loja_id", loja.id)
          .eq("ativo", true)
          .order("eh_dono", { ascending: false })
          .order("nome", { ascending: true }),
      ]);

      return {
        loja: loja as LojaPublica,
        servicos: (servicos ?? []) as ServicoPublico[],
        profissionais: (profissionais ?? []) as ProfissionalPublico[],
      };
    },
    ["loja-publica", cleanSlug],
    {
      tags: [`loja-${cleanSlug}`, "vitrine-explorar"],
      revalidate: 3600,
    }
  );

  return cached();
}

export async function getVitrineLojas(): Promise<VitrineLojaCard[]> {
  const supabase = createPublicClient();
  const { data: lojas } = await supabase
    .from("lojas")
    .select(
      "id, slug, nome, nicho, cidade, bairro, tema, cor_primaria, raio_borda_px, logo_url, capa_url, sinal_centavos, servicos(preco_centavos, ativo)"
    )
    .eq("pausada", false)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!lojas) return [];

  return lojas.map((row) => {
    const servicosAtivos = (
      (row.servicos as { preco_centavos: number; ativo: boolean }[] | null) ?? []
    ).filter((s) => s.ativo);

    const minPreco =
      servicosAtivos.length > 0
        ? Math.min(...servicosAtivos.map((s) => s.preco_centavos))
        : null;

    return {
      id: row.id,
      slug: row.slug,
      nome: row.nome,
      nicho: row.nicho as LojaPublica["nicho"],
      cidade: row.cidade,
      bairro: row.bairro,
      tema: row.tema as LojaPublica["tema"],
      cor_primaria: row.cor_primaria,
      raio_borda_px: row.raio_borda_px,
      logo_url: row.logo_url,
      capa_url: row.capa_url,
      sinal_centavos: row.sinal_centavos,
      preco_inicial_centavos: minPreco,
      total_servicos: servicosAtivos.length,
    };
  });
}
