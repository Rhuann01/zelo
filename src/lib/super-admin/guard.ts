import "server-only";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface SuperAdminSession {
  userId: string;
  email: string | null;
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

/**
 * Blindagem de 4 camadas do /super-admin:
 * 1. Usuário autenticado + Allowlist estrita (`SUPER_ADMIN_UIDS` ou `SUPER_ADMIN_EMAILS`)
 * 2. MFA AAL2 obrigatório (em produção)
 * 3. `import "server-only"` + `createAdminClient` exclusivo
 * 4. Cloudflare Access header quando `CF_ACCESS_REQUIRED === "true"`
 */
export async function verifySuperAdminAccess(): Promise<SuperAdminGuardResult> {
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

  // Camada 2: MFA AAL2
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = aalData?.currentLevel ?? null;
  const allowLocalAal1 =
    process.env.NODE_ENV !== "production" &&
    process.env.SUPER_ADMIN_ALLOW_LOCAL_AAL1 === "true";

  if (currentLevel !== "aal2" && !allowLocalAal1) {
    return { ok: false, status: 403, reason: "mfa_required" };
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email ?? null,
      aal: currentLevel,
    },
  };
}
