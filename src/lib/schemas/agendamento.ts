import { z } from "zod";

export const horariosDisponiveisQuerySchema = z
  .object({
    loja_id: z.string().uuid("Loja inválida"),
    profissional_id: z.string().uuid("Profissional inválido"),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    duracao_total_min: z.number().int().min(5).max(480),
  })
  .strict();

export const criarAgendamentoSchema = z
  .object({
    loja_id: z.string().uuid("Loja inválida"),
    profissional_id: z.string().uuid("Profissional inválido"),
    servicos_ids: z.array(z.string().uuid()).min(1, "Selecione pelo menos 1 serviço").max(10),
    inicio_iso: z.string().datetime({ offset: true, message: "Horário inválido" }),
    whatsapp_cliente: z.string().trim().max(20).optional(),
    beneficiario_nome: z.string().trim().max(80).optional(),
    beneficiario_whatsapp: z.string().trim().max(20).optional(),
    observacoes: z.string().trim().max(240).optional(),
  })
  .strict();

export const cancelarOuRemarcarSchema = z
  .object({
    agendamento_id: z.string().uuid("Agendamento inválido"),
    acao: z.enum(["cancelar", "remarcar"]),
    novo_inicio_iso: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
