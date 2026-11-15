import "server-only";

export const PLANOS_ZELO = {
  solo: {
    id: "solo" as const,
    nome: "Plano Solo",
    precoCentavos: 2900,
    precoLabel: "R$ 29/mês",
    descricao: "1 profissional, agenda ilimitada e vitrine Zelo",
  },
  estudio: {
    id: "estudio" as const,
    nome: "Plano Estúdio",
    precoCentavos: 5900,
    precoLabel: "R$ 59/mês",
    descricao: "Equipe completa, comissões, bloqueios e push PWA",
  },
} as const;

export type PlanoPagoId = keyof typeof PLANOS_ZELO;

interface CreateAsaasCheckoutParams {
  lojaId: string;
  lojaNome: string;
  ownerNome: string;
  ownerEmail: string;
  cpfCnpj: string;
  plano: PlanoPagoId;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
}

export async function createAsaasSubscriptionCheckout(
  params: CreateAsaasCheckoutParams
): Promise<{
  ok: boolean;
  customerId?: string;
  subscriptionId?: string;
  paymentLink?: string | null;
  error?: string;
}> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "ASAAS_API_KEY não configurada neste ambiente. Configure no .env.local para gerar cobranças no Sandbox/Produção.",
    };
  }

  const baseUrl =
    process.env.ASAAS_ENV === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "ZeloApp/1.0",
    access_token: apiKey,
  };

  const cpfClean = params.cpfCnpj.replace(/\D/g, "");
  const customerRes = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: params.ownerNome || params.lojaNome,
      email: params.ownerEmail,
      cpfCnpj: cpfClean,
      externalReference: params.lojaId,
    }),
  });

  const customerJson = (await customerRes.json().catch(() => ({}))) as {
    id?: string;
    errors?: Array<{ description?: string }>;
  };

  if (!customerRes.ok || !customerJson.id) {
    return {
      ok: false,
      error:
        customerJson.errors?.[0]?.description ??
        "Não foi possível cadastrar o cliente no Asaas.",
    };
  }

  const planoConfig = PLANOS_ZELO[params.plano];
  const nextDue = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const subRes = await fetch(`${baseUrl}/subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: customerJson.id,
      billingType: params.billingType,
      value: planoConfig.precoCentavos / 100,
      nextDueDate: nextDue,
      cycle: "MONTHLY",
      description: `Zelo ${planoConfig.nome} — ${params.lojaNome}`,
      externalReference: params.lojaId,
    }),
  });

  const subJson = (await subRes.json().catch(() => ({}))) as {
    id?: string;
    errors?: Array<{ description?: string }>;
  };

  if (!subRes.ok || !subJson.id) {
    return {
      ok: false,
      error:
        subJson.errors?.[0]?.description ??
        "Não foi possível criar a assinatura no Asaas.",
    };
  }

  // Busca a 1ª fatura gerada para retornar o link de pagamento imediato
  const paymentsRes = await fetch(
    `${baseUrl}/subscriptions/${subJson.id}/payments?limit=1`,
    { headers }
  );
  const paymentsJson = (await paymentsRes.json().catch(() => ({}))) as {
    data?: Array<{ invoiceUrl?: string }>;
  };

  return {
    ok: true,
    customerId: customerJson.id,
    subscriptionId: subJson.id,
    paymentLink: paymentsJson.data?.[0]?.invoiceUrl ?? null,
  };
}
