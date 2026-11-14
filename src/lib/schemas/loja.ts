import { z } from "zod";

export const NICHO_OPTIONS = ["barbearia", "manicure", "salao", "estetica", "outro"] as const;
export const TEMA_OPTIONS = [
  "urban",
  "glam",
  "brutal",
  "slate",
  "liquid_glass",
  "material_you",
] as const;
export const ESTILO_CARD_OPTIONS = ["preenchido", "vidro_borrado"] as const;
export const ESTILO_BARRA_OPTIONS = ["abas", "dock_flutuante"] as const;
export const PIX_MODO_OPTIONS = ["loja", "profissional"] as const;

export const servicoPresetSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome do serviço muito curto").max(80),
    duracao_min: z.number().int().min(5).max(480),
    preco_centavos: z.number().int().min(0).max(10_000_000),
    imagem_url: z.string().trim().max(500).nullable().optional().default(null),
    exibir_imagem: z.boolean().optional().default(false),
  })
  .strict();

export const createLojaSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do espaço").max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, "Slug inválido (use apenas letras minúsculas, números e hífen)"),
    nicho: z.enum(NICHO_OPTIONS),
    cidade: z.string().trim().min(2, "Informe a cidade").max(80),
    bairro: z.string().trim().min(2, "Informe o bairro").max(80),
    endereco_texto: z.string().trim().max(160).default(""),
    cep: z.string().trim().max(9).default(""),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    whatsapp_loja: z.string().trim().min(10, "Informe o WhatsApp com DDD").max(20),
    chave_pix: z.string().trim().max(120).optional().default(""),
    pix_modo: z.enum(PIX_MODO_OPTIONS).optional().default("loja"),
    tema: z.enum(TEMA_OPTIONS).default("urban"),
    estilo_card: z.enum(ESTILO_CARD_OPTIONS).optional().default("preenchido"),
    estilo_barra: z.enum(ESTILO_BARRA_OPTIONS).optional().default("abas"),
    modo_escuro: z.boolean().optional().default(false),
    logo_url: z.string().trim().max(500).nullable().optional().default(null),
    capa_url: z.string().trim().max(500).nullable().optional().default(null),
    servicos: z.array(servicoPresetSchema).min(1, "Selecione pelo menos 1 serviço").max(20),
  })
  .strict();

export type CreateLojaInput = z.infer<typeof createLojaSchema>;

export interface PresetServico {
  nome: string;
  duracao_min: number;
  preco_centavos: number;
}

export const PRESETS_POR_NICHO: Record<(typeof NICHO_OPTIONS)[number], PresetServico[]> = {
  barbearia: [
    { nome: "Corte Degradê na Navalha", duracao_min: 35, preco_centavos: 4500 },
    { nome: "Barba Completa + Toalha Quente", duracao_min: 30, preco_centavos: 3500 },
    { nome: "Combo Corte + Barba", duracao_min: 60, preco_centavos: 7500 },
  ],
  manicure: [
    { nome: "Manicure Tradicional + Cutilagem", duracao_min: 45, preco_centavos: 4000 },
    { nome: "Esmaltação em Gel", duracao_min: 60, preco_centavos: 7500 },
    { nome: "Alongamento em Fibra de Vidro", duracao_min: 120, preco_centavos: 16000 },
  ],
  salao: [
    { nome: "Corte Feminino + Finalização", duracao_min: 50, preco_centavos: 8000 },
    { nome: "Escova Modelada", duracao_min: 45, preco_centavos: 6000 },
    { nome: "Hidratação Profunda", duracao_min: 40, preco_centavos: 7000 },
  ],
  estetica: [
    { nome: "Design de Sobrancelhas", duracao_min: 30, preco_centavos: 4500 },
    { nome: "Extensão de Cílios Volume Brasileiro", duracao_min: 120, preco_centavos: 15000 },
    { nome: "Limpeza de Pele Profunda", duracao_min: 75, preco_centavos: 13000 },
  ],
  outro: [
    { nome: "Atendimento Padrão", duracao_min: 45, preco_centavos: 6000 },
    { nome: "Atendimento Completo", duracao_min: 60, preco_centavos: 9000 },
  ],
};

export function slugifyNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
