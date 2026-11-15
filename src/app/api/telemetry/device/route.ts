import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/security/rate-limit";

function parseUserAgent(uaRaw: string) {
  const ua = uaRaw.toLowerCase();

  let sistema = "Outro";
  if (/iphone|ipad|ipod/.test(ua)) sistema = "iOS";
  else if (/android/.test(ua)) sistema = "Android";
  else if (/windows/.test(ua)) sistema = "Windows";
  else if (/mac os x|macintosh/.test(ua)) sistema = "macOS";
  else if (/linux/.test(ua)) sistema = "Linux";

  let navegador = "Outro";
  if (/edg\//.test(ua)) navegador = "Edge";
  else if (/opr\/|opera/.test(ua)) navegador = "Opera";
  else if (/samsungbrowser/.test(ua)) navegador = "Samsung Internet";
  else if (/firefox|fxios/.test(ua)) navegador = "Firefox";
  else if (/crios|chrome/.test(ua)) navegador = "Chrome";
  else if (/safari/.test(ua)) navegador = "Safari";

  const tipo = /iphone|ipad|ipod|android|mobile/.test(ua) ? "Mobile" : "Desktop";
  const chave = `${sistema} • ${navegador} (${tipo})`;
  return { chave, sistema, navegador, tipo };
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const rl = checkRateLimit(`telemetry:device:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  if (
    !ua ||
    /bot|crawler|spider|curl|wget|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|telegrambot|applebot|bingpreview|google-inspectiontool/i.test(
      ua
    )
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const info = parseUserAgent(ua);
  try {
    const admin = createAdminClient();
    await admin.rpc("incrementar_dispositivo_acesso", {
      p_chave: info.chave,
      p_sistema: info.sistema,
      p_navegador: info.navegador,
      p_tipo: info.tipo,
    });
  } catch {
    // silencioso
  }

  return NextResponse.json({ ok: true });
}
