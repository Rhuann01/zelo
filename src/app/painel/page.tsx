import Link from "next/link";
import { Calendar, LayoutGrid, Palette, Plus, Settings, Sparkles } from "lucide-react";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";

export default async function PainelPage() {
  const ctx = await getPainelContext("/painel");

  return (
    <PainelShell lojas={ctx.lojas} lojaAtual={ctx.lojaAtual} isOwner={ctx.isOwner}>
      <div className="space-y-4">
        <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  ctx.lojaAtual.pausada
                    ? "bg-[#F59E0B]/15 text-[#D97706]"
                    : "bg-[#10B981]/15 text-[#10B981]"
                }`}
              >
                {ctx.lojaAtual.pausada ? "Loja Pausada" : "Loja Ativa"}
              </span>
              <h1 className="mt-1.5 text-xl font-bold tight-heading">
                Olá, {ctx.perfil.nome.split(" ")[0]}
              </h1>
              <p className="font-mono-num text-xs text-[var(--zelo-muted)]">
                zelo.app/{ctx.lojaAtual.slug}
              </p>
            </div>
            <span className="rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 font-mono-num text-[11px] font-semibold text-[var(--zelo-muted)]">
              {ctx.lojaAtual.plano.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/painel/gestao"
              className="flex flex-col items-start gap-1.5 rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90"
            >
              <LayoutGrid className="h-4 w-4 text-[#F59E0B]" />
              <span className="text-xs font-bold">Gestão</span>
              <span className="text-[10px] text-[var(--zelo-muted)]">Serviços & Equipe</span>
            </Link>
            <Link
              href="/painel/personalizar"
              className="flex flex-col items-start gap-1.5 rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90"
            >
              <Palette className="h-4 w-4 text-[#10B981]" />
              <span className="text-xs font-bold">Tema</span>
              <span className="text-[10px] text-[var(--zelo-muted)] capitalize">
                {ctx.lojaAtual.tema}
              </span>
            </Link>
            <Link
              href="/painel/configuracoes"
              className="flex flex-col items-start gap-1.5 rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90"
            >
              <Settings className="h-4 w-4 text-[var(--zelo-ink)]" />
              <span className="text-xs font-bold">Perfil</span>
              <span className="text-[10px] text-[var(--zelo-muted)]">Foto & Conta</span>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#F59E0B]" />
              <h2 className="text-sm font-bold">Agenda Visual (Schedule-X)</h2>
            </div>
            <span className="rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#D97706]">
              Etapa 5
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
            A linha do tempo interativa com encaixe manual em 3s, baixa de atendimentos e alertas Web Push entra na Etapa 5, após o motor de disponibilidade e reservas.
          </p>
        </section>

        {ctx.isOwner && (
          <Link
            href="/onboarding"
            className="flex items-center justify-between rounded-2xl bg-[var(--zelo-soft)] p-4 transition hover:opacity-90"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              <div>
                <p className="text-sm font-bold">Criar nova unidade / loja</p>
                <p className="text-xs text-[var(--zelo-muted)]">
                  Gerencie múltiplas unidades no mesmo login Google
                </p>
              </div>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
              <Plus className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </PainelShell>
  );
}
