import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  asaasWebhookSchema,
  processAsaasWebhookEvent,
  verifyAsaasWebhookToken,
} from "@/lib/asaas/webhook";
import {
  checkRateLimit,
  getClientIpFromHeaders,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";

const MAX_WEBHOOK_BYTES = 65_536;

export async function POST(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const rl = checkRateLimit(`webhook:asaas:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const receivedToken = request.headers.get("asaas-access-token");
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!verifyAsaasWebhookToken(receivedToken, expectedToken)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload muito grande" }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, "utf8") > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Payload muito grande" }, { status: 413 });
    }
    body = JSON.parse(rawText);
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
