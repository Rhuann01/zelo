import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySuperAdminAccess } from "@/lib/super-admin/guard";
import {
  generateSuperAdminCsv,
  loadSuperAdminDashboardData,
} from "@/lib/super-admin/metrics";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

export async function GET() {
  const guard = await verifySuperAdminAccess();
  if (!guard.ok) {
    return NextResponse.json({ error: "Acesso negado" }, { status: guard.status });
  }

  const rl = checkRateLimit(`super-admin:export:${guard.session.userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas exportações. Aguarde um minuto." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const data = await loadSuperAdminDashboardData();
  const csv = generateSuperAdminCsv(data.lojas);

  const admin = createAdminClient();
  await admin.from("super_admin_audit_logs").insert({
    actor_uid: guard.session.userId,
    acao: "exportar_csv",
    detalhes: { total_lojas: data.lojas.length },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zelo-super-admin-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
