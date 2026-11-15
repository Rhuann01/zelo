import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBrDataHora, notifyUserPrioritizingPush } from "@/lib/notifications/dispatch";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET?.trim() ?? "";
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerToken = req.headers.get("x-cron-secret")?.trim() ?? "";
  const provided = bearer || headerToken;
  if (!provided) return false;

  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowMs = Date.now();
  const minIso = new Date(nowMs + 10 * 60_000).toISOString();
  const maxIso = new Date(nowMs + 75 * 60_000).toISOString();

  let lembretesEnviados = 0;
  let avisosTrialEnviados = 0;

  // 1. Lembretes de agendamentos próximos (10m–75m antes)
  const { data: proximos } = await admin
    .from("agendamentos")
    .select("id, loja_id, cliente_id, inicio, loja:lojas(nome)")
    .eq("status", "confirmado")
    .not("cliente_id", "is", null)
    .is("notificado_lembrete_em", null)
    .gte("inicio", minIso)
    .lte("inicio", maxIso)
    .limit(50);

  for (const ag of proximos ?? []) {
    if (!ag.cliente_id) continue;
    const lojaObj = Array.isArray(ag.loja) ? ag.loja[0] : ag.loja;
    const { hora } = formatBrDataHora(ag.inicio);

    await notifyUserPrioritizingPush({
      userId: ag.cliente_id,
      tipo: "lembrete",
      lojaId: ag.loja_id,
      agendamentoId: ag.id,
      title: `Lembrete de horário • ${lojaObj?.nome ?? "Zelo"}`,
      body: `Seu atendimento começa em breve, às ${hora}.`,
      url: "/explorar",
    });

    await admin
      .from("agendamentos")
      .update({ notificado_lembrete_em: new Date().toISOString() })
      .eq("id", ag.id);

    lembretesEnviados++;
  }

  // 2. Avisos de Trial perto de vencer (3 dias e 1 dia)
  const em3DiasIso = new Date(nowMs + 3 * 86_400_000).toISOString();
  const { data: lojasTrial } = await admin
    .from("lojas")
    .select("id, nome, owner_id, trial_ate, notificado_trial_3d, notificado_trial_1d")
    .eq("assinatura_status", "trial")
    .lte("trial_ate", em3DiasIso)
    .gte("trial_ate", new Date(nowMs - 86_400_000).toISOString())
    .limit(50);

  for (const loja of lojasTrial ?? []) {
    const diasRestantes = Math.ceil((Date.parse(loja.trial_ate) - nowMs) / 86_400_000);

    if (diasRestantes <= 1 && !loja.notificado_trial_1d) {
      await notifyUserPrioritizingPush({
        userId: loja.owner_id,
        tipo: "trial_expirando",
        lojaId: loja.id,
        title: `Último dia do teste grátis • ${loja.nome}`,
        body: "Seu período grátis termina em breve. Escolha o plano Solo ou Estúdio para manter sua agenda aberta.",
        url: "/painel/assinatura",
      });
      await admin.from("lojas").update({ notificado_trial_1d: true }).eq("id", loja.id);
      avisosTrialEnviados++;
    } else if (diasRestantes <= 3 && diasRestantes > 1 && !loja.notificado_trial_3d) {
      await notifyUserPrioritizingPush({
        userId: loja.owner_id,
        tipo: "trial_expirando",
        lojaId: loja.id,
        title: `Teste grátis acaba em ${diasRestantes} dias`,
        body: `Escolha um plano em Assinatura para que a ${loja.nome} continue recebendo agendamentos online.`,
        url: "/painel/assinatura",
      });
      await admin.from("lojas").update({ notificado_trial_3d: true }).eq("id", loja.id);
      avisosTrialEnviados++;
    }
  }

  return NextResponse.json({
    ok: true,
    lembretesEnviados,
    avisosTrialEnviados,
  });
}
