import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVitrinePaginada } from "@/lib/public/get-loja-publica";
import {
  checkRateLimit,
  getClientIpFromHeaders,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";

const querySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(60).default(24),
    cidade: z.string().max(80).optional(),
    nicho: z.string().max(40).optional(),
    q: z.string().max(100).optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const rl = checkRateLimit(`vitrine:get:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    cursor: sp.get("cursor") || undefined,
    limit: sp.get("limit") || undefined,
    cidade: sp.get("cidade") || undefined,
    nicho: sp.get("nicho") || undefined,
    q: sp.get("q") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Parâmetros inválidos." },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }

  const result = await getVitrinePaginada(parsed.data);

  return NextResponse.json(
    { ok: true, ...result },
    {
      status: 200,
      headers: {
        ...rateLimitHeaders(rl),
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
