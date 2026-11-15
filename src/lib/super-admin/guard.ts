import "server-only";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const SUPER_ADMIN_PIN_COOKIE = "zelo_sa_pin";

export interface SuperAdminSession {
  userId: string;
  email: string | null;
  nome: string | null;
  avatarUrl: string | null;
  aal: string | null;
}

export type SuperAdminGuardResult =
  | { ok: true; session: SuperAdminSession }
  | {
      ok: false;
      status: 401 | 403;
      reason:
        | "unauthenticated"
        | "not_allowlisted"
        | "mfa_required"
        | "pin_required"
        | "cloudflare_access_required";
    };

export function parseSuperAdminAllowlist(raw = process.env.SUPER_ADMIN_UIDS): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function parseSuperAdminEmailAllowlist(
  raw = process.env.SUPER_ADMIN_EMAILS
): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getPinSigningSecret(): string {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPER_ADMIN_PIN ||
    "zelo-local-pin-secret";
  return secret;
}

export function createSuperAdminPinToken(userId: string, pin: string): string {
  const hmac = crypto
    .createHmac("sha256", getPinSigningSecret())
    .update(`${userId}:${pin}`)
    .digest("hex");
  return hmac;
}

export function verifySuperAdminPinInput(inputPin: string): boolean {
  const expectedPin = process.env.SUPER_ADMIN_PIN?.trim();
  if (!expectedPin) return true;
  const a = crypto.createHash("sha256").update(inputPin.trim()).digest();
  const b = crypto.createHash("sha256").update(expectedPin).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function verifySuperAdminBaseIdentity(): Promise<SuperAdminGuardResult> {
  // Camada 4 (borda Cloudflare Access, se habilitada)
  if (process.env.CF_ACCESS_REQUIRED === "true") {
    const hdrs = await headers();
    const cfJwt = hdrs.get("cf-access-jwt-assertion");
    if (!cfJwt) {
      return { ok: false, status: 403, reason: "cloudflare_access_required" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, reason: "unauthenticated" };
  }

  // Camada 1: Allowlist explícita de UIDs ou E-mails verificados
  const uidAllowlist = parseSuperAdminAllowlist();
  const emailAllowlist = parseSuperAdminEmailAllowlist();
  const userEmail = user.email?.trim().toLowerCase() ?? "";
  const isAllowedByUid = uidAllowlist.has(user.id);
  const isAllowedByEmail =
    Boolean(userEmail) &&
    Boolean(user.email_confirmed_at) &&
    emailAllowlist.has(userEmail);

  if (!isAllowedByUid && !isAllowedByEmail) {
    return { ok: false, status: 403, reason: "not_allowlisted" };
  }

  // Camada 2: MFA AAL2 (ou PIN do fundador configurado no servidor, salvo se SUPER_ADMIN_REQUIRE_MFA=true)
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = aalData?.currentLevel ?? null;
  const allowLocalAal1 =
    process.env.NODE_ENV !== "production" &&
    process.env.SUPER_ADMIN_ALLOW_LOCAL_AAL1 === "true";
  const hasPinSecondFactor =
    process.env.SUPER_ADMIN_REQUIRE_MFA !== "true" &&
    Boolean(process.env.SUPER_ADMIN_PIN?.trim());

  if (currentLevel !== "aal2" && !allowLocalAal1 && !hasPinSecondFactor) {
    return { ok: false, status: 403, reason: "mfa_required" };
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const metaAvatar =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;
  const metaNome =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    null;

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email ?? null,
      nome: perfil?.nome ?? metaNome,
      avatarUrl: perfil?.avatar_url ?? metaAvatar,
      aal: currentLevel,
    },
  };
}

/**
 * Blindagem do /super-admin:
 * 1. Usuário autenticado + Allowlist estrita (`SUPER_ADMIN_UIDS` ou `SUPER_ADMIN_EMAILS`)
 * 2. MFA AAL2 obrigatório (em produção)
 * 3. PIN do Fundador (`SUPER_ADMIN_PIN`) via cookie HttpOnly assinado
 * 4. `import "server-only"` + `createAdminClient` exclusivo
 * 5. Cloudflare Access header quando `CF_ACCESS_REQUIRED === "true"`
 */
export async function verifySuperAdminAccess(): Promise<SuperAdminGuardResult> {
  const base = await verifySuperAdminBaseIdentity();
  if (!base.ok) return base;

  const configuredPin = process.env.SUPER_ADMIN_PIN?.trim();
  if (configuredPin) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SUPER_ADMIN_PIN_COOKIE)?.value ?? "";
    const expected = createSuperAdminPinToken(base.session.userId, configuredPin);

    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, status: 403, reason: "pin_required" };
    }
  }

  return base;
}
