import Link from "next/link";
import { CreditCard, ChevronRight } from "lucide-react";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { ConfiguracoesForm } from "@/components/configuracoes-form";

export default async function ConfiguracoesPage() {
  const ctx = await getPainelContext("/painel/configuracoes");

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      {ctx.isOwner && (
        <Link
          href="/painel/assinatura"
          className="mb-4 flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-[var(--zelo-card)] px-4 py-3 transition-opacity hover:opacity-90"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-soft)]">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-semibold">Assinatura & Indicação</span>
              <span className="block text-xs text-[var(--zelo-muted)] truncate">
                Plano Zelo via Asaas e código de 1 mês grátis
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--zelo-muted)] shrink-0" />
        </Link>
      )}
      <ConfiguracoesForm ctx={ctx} />
    </PainelShell>
  );
}
