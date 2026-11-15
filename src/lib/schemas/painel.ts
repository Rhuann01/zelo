import { z } from "zod";
import {
  ESTILO_BARRA_OPTIONS,
  ESTILO_CARD_OPTIONS,
  safeImageUrlSchema,
  TEMA_OPTIONS,
} from "@/lib/schemas/loja";

export const servicoSchema = z
  .object({
    id: z.string().uuid().optional(),
    loja_id: z.string().uuid(),
    nome: z.string().trim().min(2, "Nome muito curto").max(80),
    descricao: z.string().trim().max(240).default(""),
    duracao_min: z.number().int().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
    preco_centavos: z.number().int().min(0).max(10_000_000),
    ativo: z.boolean().default(true),
    imagem_url: safeImageUrlSchema.nullable().optional(),
    exibir_imagem: z.boolean().default(false),
  })
  .strict();

const diaHorarioSchema = z
  .object({
    ativo: z.boolean(),
    abre: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
    fecha: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  })
  .strict();

export const horariosLojaSchema = z
  .object({
    loja_id: z.string().uuid(),
    seg: diaHorarioSchema,
    ter: diaHorarioSchema,
    qua: diaHorarioSchema,
    qui: diaHorarioSchema,
    sex: diaHorarioSchema,
    sab: diaHorarioSchema,
    dom: diaHorarioSchema,
    almoco_ativo: z.boolean().default(false),
    almoco_inicio: z.string().regex(/^\d{2}:\d{2}$/).default("12:30"),
    almoco_fim: z.string().regex(/^\d{2}:\d{2}$/).default("13:30"),
  })
  .strict();

export const diaEspecialSchema = z
  .object({
    loja_id: z.string().uuid(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora início inválida"),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/, "Hora fim inválida"),
    tipo: z.enum(["dia_especial", "folga", "feriado"]),
    motivo: z.string().trim().max(120).default(""),
  })
  .strict();

export const conviteProfissionalSchema = z
  .object({
    loja_id: z.string().uuid(),
    cargo: z.string().trim().min(2, "Informe o cargo (mín. 2 letras)").max(40, "Cargo muito longo").default("Barbeiro"),
    comissao_percentual: z
      .number()
      .int("Comissão deve ser um número inteiro")
      .min(0, "Comissão mínima é 0%")
      .max(100, "Comissão máxima é 100%")
      .default(50),
  })
  .strict();

export const revogarConviteSchema = z
  .object({
    loja_id: z.string().uuid(),
    convite_id: z.string().uuid(),
  })
  .strict();

export const tokenConviteSchema = z
  .object({
    token: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{32,128}$/, "Link de convite inválido ou corrompido."),
  })
  .strict();

export const sairEquipeSchema = z
  .object({
    loja_id: z.string().uuid(),
  })
  .strict();

export const customizacaoLojaSchema = z
  .object({
    loja_id: z.string().uuid(),
    nome: z.string().trim().min(2, "Informe o nome da loja").max(80).optional(),
    tema: z.enum(TEMA_OPTIONS),
    cor_primaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hexadecimal inválida"),
    raio_borda_px: z.number().int().min(2).max(24),
    estilo_card: z.enum(ESTILO_CARD_OPTIONS).default("preenchido"),
    estilo_barra: z.enum(ESTILO_BARRA_OPTIONS).default("abas"),
    modo_escuro: z.boolean().default(false),
    pix_modo: z.enum(["loja", "profissional"]).default("loja"),
    chave_pix: z.string().trim().max(120).nullable().default(null),
    sinal_centavos: z.number().int().min(0).max(5_000_000).default(0),
    cidade: z.string().trim().min(2).max(80).optional(),
    bairro: z.string().trim().min(2).max(80).optional(),
    endereco_texto: z.string().trim().max(160).optional(),
    cep: z.string().trim().max(9).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .strict();

export const perfilConfigSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome").max(80),
    whatsapp: z.string().trim().max(20).default(""),
    notificacoes_push: z.boolean(),
    notificacoes_novo_agendamento: z.boolean().optional(),
    notificacoes_email: z.boolean(),
    loja_id: z.string().uuid().optional(),
    nome_loja: z.string().trim().min(2, "Informe o nome da loja").max(80).optional(),
    pausada: z.boolean().optional(),
    minha_chave_pix: z.string().trim().max(120).nullable().optional(),
  })
  .strict();
