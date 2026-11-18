"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAsaasSubscriptionCheckout } from "@/lib/asaas/server";

const iniciarAssinaturaSchema = z.object({
  lojaId: z.string().uuid(),
  plano: z.enum(["solo", "estudio"]),
  billingType: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]),
  cpfCnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "Informe um CPF ou CNPJ válido"),
});

export async function iniciarAssinaturaAsaasAction(
  rawInput: z.input<typeof iniciarAssinaturaSchema>
): Promise<{ error?: string; paymentLink?: string | null }> {
  const parsed = iniciarAssinaturaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada." };
  }

  const { data: loja } = await supabase
    .from("lojas")
    .select("id, nome, owner_id")
    .eq("id", parsed.data.lojaId)
    .single();

  if (!loja || loja.owner_id !== user.id) {
    return { error: "Apenas o proprietário pode gerenciar a assinatura." };
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome")
    .eq("id", user.id)
    .single();

  const checkout = await createAsaasSubscriptionCheckout({
    lojaId: loja.id,
    lojaNome: loja.nome,
    ownerNome: perfil?.nome ?? loja.nome,
    ownerEmail: user.email ?? "lojista@zelo.app",
    cpfCnpj: parsed.data.cpfCnpj,
    plano: parsed.data.plano,
    billingType: parsed.data.billingType,
  });

  if (!checkout.ok) {
    return { error: checkout.error };
  }

  const admin = createAdminClient();
  await admin
    .from("lojas")
    .update({
      plano: parsed.data.plano,
      asaas_customer_id: checkout.customerId,
      asaas_subscription_id: checkout.subscriptionId,
    })
    .eq("id", loja.id)
    .eq("owner_id", user.id);

  revalidatePath("/painel/assinatura");
  return { paymentLink: checkout.paymentLink ?? null };
}

const aplicarIndicacaoSchema = z.object({
  lojaId: z.string().uuid(),
  codigo: z.string().trim().min(4, "Código inválido").max(32),
});

export async function aplicarCodigoIndicacaoAction(
  rawInput: z.infer<typeof aplicarIndicacaoSchema>
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = aplicarIndicacaoSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Código inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aplicar_indicacao_loja", {
    p_nova_loja_id: parsed.data.lojaId,
    p_codigo_indicacao: parsed.data.codigo,
  });

  if (error) {
    return { error: "Não foi possível aplicar o código agora." };
  }

  if (!data) {
    return { error: "Código não encontrado ou indicação já aplicada." };
  }

  revalidatePath("/painel/assinatura");
  return { ok: true };
}
