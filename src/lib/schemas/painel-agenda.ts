import { z } from "zod";

export const encaixeManualSchema = z
  .object({
    loja_id: z.string().uuid(),
    profissional_id: z.string().uuid(),
    servicos_ids: z.array(z.string().uuid()).min(1, "Selecione pelo menos 1 serviço").max(10),
    inicio_iso: z.string().datetime({ offset: true, message: "Horário inválido" }),
    cliente_nome: z.string().trim().min(2, "Informe o nome do cliente").max(80),
    cliente_whatsapp: z.string().trim().max(20).optional().default(""),
    observacoes: z.string().trim().max(240).optional().default(""),
  })
  .strict();

export const atualizarStatusAgendamentoSchema = z
  .object({
    agendamento_id: z.string().uuid(),
    loja_id: z.string().uuid(),
    status: z.enum(["confirmado", "concluido", "no_show", "cancelado"]),
  })
  .strict();

export const reagendarPainelSchema = z
  .object({
    agendamento_id: z.string().uuid(),
    loja_id: z.string().uuid(),
    novo_inicio_iso: z.string().datetime({ offset: true, message: "Horário inválido" }),
    tipo: z.enum(["adiamento", "reagendamento"]).default("adiamento"),
    motivo: z.string().trim().max(180).optional().default(""),
  })
  .strict();

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(5),
    }),
  })
  .strict();
