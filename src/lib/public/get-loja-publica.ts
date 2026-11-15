import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { LinkPublico } from "@/lib/schemas/loja-links";

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
  descricao_publica: string;
  links_publicos: LinkPublico[];
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
          "id, slug, nome, nicho, cidade, bairro, endereco_texto, maps_url, latitude, longitude, whatsapp_loja, sinal_centavos, tema, cor_primaria, raio_borda_px, estilo_card, estilo_barra, modo_escuro, logo_url, capa_url, horarios_loja, pausada, descricao_publica, links_publicos"
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

export interface VitrinePaginadaParams {
  cursor?: string | null;
  limit?: number;
  cidade?: string | null;
  nicho?: string | null;
  q?: string | null;
}

export interface VitrinePaginadaResult {
  items: VitrineLojaCard[];
  nextCursor: string | null;
  hasMore: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeVitrineCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, "utf8").toString("base64url");
}

export function decodeVitrineCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("|");
    if (sep <= 0) return null;
    const createdAt = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    if (!UUID_REGEX.test(id)) return null;
    const parsedTime = Date.parse(createdAt);
    if (Number.isNaN(parsedTime)) return null;
    return { createdAt: new Date(parsedTime).toISOString(), id };
  } catch {
    return null;
  }
}

export async function getVitrinePaginada(
  params: VitrinePaginadaParams = {}
): Promise<VitrinePaginadaResult> {
  const safeLimit = Math.min(Math.max(Number(params.limit) || 24, 1), 60);
  const supabase = createPublicClient();

  let query = supabase
    .from("lojas")
    .select(
      "id, slug, nome, nicho, cidade, bairro, tema, cor_primaria, raio_borda_px, logo_url, capa_url, sinal_centavos, created_at, servicos(preco_centavos, ativo)"
    )
    .eq("pausada", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  if (params.cidade && params.cidade.trim() && params.cidade !== "todas") {
    query = query.eq("cidade", params.cidade.trim());
  }

  if (params.nicho && params.nicho.trim() && params.nicho !== "todos") {
    query = query.eq("nicho", params.nicho.trim());
  }

  if (params.q && params.q.trim()) {
    const cleanQ = params.q.trim().replace(/[%_,()]/g, " ");
    if (cleanQ) {
      query = query.or(`nome.ilike.%${cleanQ}%,bairro.ilike.%${cleanQ}%,cidade.ilike.%${cleanQ}%`);
    }
  }

  if (params.cursor) {
    const decoded = decodeVitrineCursor(params.cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
      );
    }
  }

  const { data: lojas } = await query;
  if (!lojas || lojas.length === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const hasMore = lojas.length > safeLimit;
  const pageRows = hasMore ? lojas.slice(0, safeLimit) : lojas;
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow?.created_at && lastRow?.id
      ? encodeVitrineCursor(String(lastRow.created_at), String(lastRow.id))
      : null;

  const items: VitrineLojaCard[] = pageRows.map((row) => {
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

  return { items, nextCursor, hasMore };
}

export async function getVitrineLojas(): Promise<VitrineLojaCard[]> {
  const { items } = await getVitrinePaginada({ limit: 24 });
  return items;
}
