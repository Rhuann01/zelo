import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Clock,
  LayoutGrid,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";

export default async function PainelPage() {
  const ctx = await getPainelContext("/painel");
  const primeiroNome = ctx.perfil.nome.split(" ")[0] || "Gestor";

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      <div className="space-y-4">
        {/* Status & Greeting Card */}
        <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  ctx.lojaAtual.pausada
                    ? "bg-[#F59E0B]/15 text-[#D97706]"
                    : "bg-[#10B981]/15 text-[#10B981]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    ctx.lojaAtual.pausada ? "bg-[#F59E0B]" : "bg-[#10B981]"
                  }`}
                />
                {ctx.lojaAtual.pausada ? "Loja Pausada" : "Loja Ativa"}
              </span>
              <h1 className="mt-2 text-xl font-bold tracking-tight">
                Olá, {primeiroNome}
              </h1>
              <p className="font-mono-num text-xs text-[var(--zelo-muted)]">
                zelo.app/{ctx.lojaAtual.slug}
              </p>
            </div>
            <span className="rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 font-mono-num text-[11px] font-bold uppercase tracking-wider text-[var(--zelo-muted)]">
              {ctx.lojaAtual.plano}
            </span>
          </div>

          {/* 3-Card Bento Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/painel/gestao"
              className="flex min-h-[88px] flex-col items-start justify-between rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#D97706]">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-xs font-bold">Gestão</span>
                <span className="block text-[10px] text-[var(--zelo-muted)]">
                  Horários & Equipe
                </span>
              </div>
            </Link>
            <Link
              href="/painel/personalizar"
              className="flex min-h-[88px] flex-col items-start justify-between rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/15 text-[#10B981]">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-xs font-bold">Tema</span>
                <span className="block text-[10px] capitalize text-[var(--zelo-muted)]">
                  {ctx.lojaAtual.tema}
                </span>
              </div>
            </Link>
            <Link
              href="/painel/configuracoes"
              className="flex min-h-[88px] flex-col items-start justify-between rounded-xl bg-[var(--zelo-soft)] p-3 transition hover:opacity-90 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-xs font-bold">Config</span>
                <span className="block text-[10px] text-[var(--zelo-muted)]">
                  Foto & Conta
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Agenda Visual Preview (Etapa 5) */}
        <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#D97706]">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Agenda do Dia</h2>
                <p className="text-[11px] text-[var(--zelo-muted)]">
                  Schedule-X • Linha do tempo
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#D97706]">
              Etapa 5
            </span>
          </div>

          <div className="space-y-2 rounded-xl bg-[var(--zelo-soft)] p-3">
            <div className="flex items-center gap-2.5 text-xs text-[var(--zelo-muted)]">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>
                A grade interativa com encaixe manual em 3s, baixa de atendimentos e alertas Web Push entra na Etapa 5.
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--zelo-card)] px-3 py-2 text-[11px]">
              <div className="flex items-center gap-2 font-medium">
                <Utensils className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Pausa padrão configurada</span>
              </div>
              <Link
                href="/painel/gestao"
                className="inline-flex items-center gap-0.5 font-semibold text-[var(--zelo-ink)] hover:underline"
              >
                Ajustar
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {ctx.isOwner && (
          <Link
            href="/onboarding"
            className="flex min-h-[68px] items-center justify-between rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm transition hover:opacity-95 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#D97706]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Criar nova unidade / loja</p>
                <p className="text-xs text-[var(--zelo-muted)]">
                  Gerencie múltiplas unidades no mesmo login Google
                </p>
              </div>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
              <Plus className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </PainelShell>
  );
}
