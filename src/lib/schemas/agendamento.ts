import { z } from "zod";

export function isValidBrazilPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99 || ddd % 10 === 0) return false;

  const subscriber = digits.slice(2);
  if (digits.length === 11 && subscriber[0] !== "9") return false;

  // Bloqueia sequências repetidas ou inválidas (ex: 11999999999, 4444444444)
  if (/^(\d)\1+$/.test(digits) || /^(\d)\1+$/.test(subscriber)) return false;
  if ("01234567890".includes(subscriber) || "98765432109".includes(subscriber)) {
    return false;
  }

  return true;
}

export function formatBrazilPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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
    whatsapp_cliente: z
      .string({ required_error: "Informe seu WhatsApp com DDD para confirmar." })
      .trim()
      .max(20)
      .refine(isValidBrazilPhone, "Informe um WhatsApp válido com DDD (ex: (11) 99999-9999)."),
    beneficiario_nome: z.string().trim().max(80).optional(),
    beneficiario_whatsapp: z.string().trim().max(20).optional(),
    observacoes: z.string().trim().max(240).optional(),
    turnstile_token: z.string().max(2048).optional(),
  })
  .strict();

export const cancelarOuRemarcarSchema = z
  .object({
    agendamento_id: z.string().uuid("Agendamento inválido"),
    acao: z.enum(["cancelar", "remarcar"]),
    novo_inicio_iso: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
