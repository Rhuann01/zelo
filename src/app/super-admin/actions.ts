"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  SUPER_ADMIN_PIN_COOKIE,
  createSuperAdminPinToken,
  verifySuperAdminAccess,
  verifySuperAdminBaseIdentity,
  verifySuperAdminPinInput,
} from "@/lib/super-admin/guard";

const togglePausaSchema = z.object({
  lojaId: z.string().uuid(),
  pausada: z.boolean(),
});

const extendTrialSchema = z.object({
  lojaId: z.string().uuid(),
  dias: z.number().int().min(1).max(60),
});

export async function superAdminTogglePausaAction(
  rawInput: z.infer<typeof togglePausaSchema>
): Promise<{ error?: string }> {
  const guard = await verifySuperAdminAccess();
  if (!guard.ok) return { error: "Acesso negado ao Super Admin." };

  const parsed = togglePausaSchema.safeParse(rawInput);
  if (!parsed.success) return { error: "Parâmetros inválidos." };

  const admin = createAdminClient();
  const { data: loja, error } = await admin
    .from("lojas")
    .update({ pausada: parsed.data.pausada })
    .eq("id", parsed.data.lojaId)
    .select("slug")
    .single();

  if (error || !loja) {
    return { error: "Não foi possível atualizar a loja." };
  }

  await admin.from("super_admin_audit_logs").insert({
    actor_uid: guard.session.userId,
    acao: parsed.data.pausada ? "pausar_loja" : "reativar_loja",
    alvo_loja_id: parsed.data.lojaId,
    detalhes: { slug: loja.slug },
  });

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/super-admin");
  return {};
}

export async function superAdminExtendTrialAction(
  rawInput: z.infer<typeof extendTrialSchema>
): Promise<{ error?: string }> {
  const guard = await verifySuperAdminAccess();
  if (!guard.ok) return { error: "Acesso negado ao Super Admin." };

  const parsed = extendTrialSchema.safeParse(rawInput);
  if (!parsed.success) return { error: "Parâmetros inválidos." };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("lojas")
    .select("trial_ate, slug")
    .eq("id", parsed.data.lojaId)
    .single();

  if (!current) return { error: "Loja não encontrada." };

  const baseMs = Math.max(Date.now(), Date.parse(current.trial_ate));
  const nextTrialIso = new Date(
    baseMs + parsed.data.dias * 86_400_000
  ).toISOString();

  const { error } = await admin
    .from("lojas")
    .update({ trial_ate: nextTrialIso, pausada: false })
    .eq("id", parsed.data.lojaId);

  if (error) return { error: "Falha ao estender o trial." };

  await admin.from("super_admin_audit_logs").insert({
    actor_uid: guard.session.userId,
    acao: "estender_trial",
    alvo_loja_id: parsed.data.lojaId,
    detalhes: { dias: parsed.data.dias, novo_trial_ate: nextTrialIso },
  });

  revalidateTag(`loja-${current.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/super-admin");
  return {};
}

const pinSchema = z.object({
  pin: z.string().min(4).max(32),
});

export async function verifySuperAdminPinAction(
  rawInput: z.infer<typeof pinSchema>
): Promise<{ error?: string }> {
  const base = await verifySuperAdminBaseIdentity();
  if (!base.ok) {
    return { error: "Sessão sem permissão de Super Admin." };
  }

  const rl = checkRateLimit(
    `super-admin:pin:${base.session.userId}`,
    10,
    15 * 60_000
  );
  if (!rl.allowed) {
    return {
      error: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryAfterSec / 60)} min.`,
    };
  }

  const parsed = pinSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: "Informe um PIN válido." };
  }

  if (!verifySuperAdminPinInput(parsed.data.pin)) {
    return { error: "PIN incorreto." };
  }

  const configuredPin = process.env.SUPER_ADMIN_PIN?.trim() ?? "";
  if (configuredPin) {
    const cookieStore = await cookies();
    cookieStore.set(
      SUPER_ADMIN_PIN_COOKIE,
      createSuperAdminPinToken(base.session.userId, configuredPin),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      }
    );
  }

  revalidatePath("/super-admin");
  return {};
}

const setPlanoSchema = z.object({
  lojaId: z.string().uuid(),
  plano: z.enum(["trial", "solo", "estudio"]),
  assinaturaStatus: z.enum(["trial", "ativa", "atrasada", "cancelada"]),
});

export async function superAdminSetPlanoAction(
  rawInput: z.infer<typeof setPlanoSchema>
): Promise<{ error?: string }> {
  const guard = await verifySuperAdminAccess();
  if (!guard.ok) return { error: "Acesso negado ao Super Admin." };

  const parsed = setPlanoSchema.safeParse(rawInput);
  if (!parsed.success) return { error: "Parâmetros inválidos." };

  const admin = createAdminClient();
  const pausada =
    parsed.data.assinaturaStatus === "atrasada" ||
    parsed.data.assinaturaStatus === "cancelada";

  const { data: loja, error } = await admin
    .from("lojas")
    .update({
      plano: parsed.data.plano,
      assinatura_status: parsed.data.assinaturaStatus,
      pausada,
    })
    .eq("id", parsed.data.lojaId)
    .select("slug")
    .single();

  if (error || !loja) {
    return { error: "Não foi possível alterar o plano da loja." };
  }

  await admin.from("super_admin_audit_logs").insert({
    actor_uid: guard.session.userId,
    acao: "alterar_plano_manual",
    alvo_loja_id: parsed.data.lojaId,
    detalhes: {
      slug: loja.slug,
      plano: parsed.data.plano,
      assinatura_status: parsed.data.assinaturaStatus,
    },
  });

  revalidateTag(`loja-${loja.slug}`);
  revalidateTag("vitrine-explorar");
  revalidatePath("/super-admin");
  return {};
}
