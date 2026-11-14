import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { verifySuperAdminAccess } from "@/lib/super-admin/guard";
import { loadSuperAdminDashboardData } from "@/lib/super-admin/metrics";
import { SuperAdminDashboard } from "@/components/super-admin-dashboard";
import { SurfaceCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const guard = await verifySuperAdminAccess();

  if (!guard.ok) {
    const messages: Record<typeof guard.reason, string> = {
      unauthenticated: "Faça login com a conta do fundador para continuar.",
      not_allowlisted: "Esta conta não faz parte da allowlist do Super Admin.",
      mfa_required: "Autenticação em 2 fatores (MFA AAL2) obrigatória.",
      cloudflare_access_required: "Acesso permitido apenas via Cloudflare Access.",
    };

    return (
      <div className="min-h-dvh bg-[var(--zelo-bg)] text-[var(--zelo-ink)] flex items-center justify-center p-4">
        <SurfaceCard tone="card" padding="lg" className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-500/12 text-rose-500 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold">Acesso Restrito ({guard.status})</h1>
            <p className="text-xs text-[var(--zelo-muted)]">{messages[guard.reason]}</p>
          </div>
          <Link
            href={guard.reason === "unauthenticated" ? "/entrar?next=/super-admin" : "/painel"}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)]"
          >
            {guard.reason === "unauthenticated" ? "Entrar" : "Voltar ao Painel"}
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  const data = await loadSuperAdminDashboardData();
  return <SuperAdminDashboard data={data} actorEmail={guard.session.email} />;
}
