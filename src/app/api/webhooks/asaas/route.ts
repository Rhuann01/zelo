import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  asaasWebhookSchema,
  processAsaasWebhookEvent,
  verifyAsaasWebhookToken,
} from "@/lib/asaas/webhook";

export async function POST(request: Request) {
  const receivedToken = request.headers.get("asaas-access-token");
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!verifyAsaasWebhookToken(receivedToken, expectedToken)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = asaasWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload Asaas inválido" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const result = await processAsaasWebhookEvent(admin, parsed.data);

    if (result.slug) {
      revalidateTag(`loja-${result.slug}`);
      revalidateTag("vitrine-explorar");
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[Webhook Asaas]", err);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook" },
      { status: 500 }
    );
  }
}
