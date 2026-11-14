import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  getClientIpFromHeaders,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";

const DEV_EMAIL = "leon.dev@zelo.local";
const DEV_PASSWORD = "ZeloLocalDevPassword123!";

/**
 * Rota exclusiva de desenvolvimento local para testar /onboarding e /painel
 * no navegador sem depender de Client ID/Secret do Google OAuth.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = getClientIpFromHeaders(request.headers);
  const rl = checkRateLimit(`dev-login:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const existing = usersPage?.users.find((u) => u.email === DEV_EMAIL);

    if (!existing) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: "Leon Silva (Dev)",
        },
      });
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
    }

    const supabase = await createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });

    if (signErr) {
      return NextResponse.json({ error: signErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no login dev" },
      { status: 500 }
    );
  }
}
