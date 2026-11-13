"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  Download,
  Loader2,
  LogOut,
  Mail,
  Moon,
  PauseCircle,
  Shield,
} from "lucide-react";
import { AvatarUploader } from "@/components/avatar-uploader";
import {
  saveConfiguracoesAction,
  signOutConfigAction,
} from "@/app/painel/configuracoes/actions";
import type { PainelContext } from "@/lib/painel/get-painel-context";

export function ConfiguracoesForm({ ctx }: { ctx: PainelContext }) {
  const [nome, setNome] = useState(ctx.perfil.nome);
  const [whatsapp, setWhatsapp] = useState(ctx.perfil.whatsapp ?? "");
  const [pushAtivo, setPushAtivo] = useState(ctx.perfil.notificacoes_push);
  const [emailAtivo, setEmailAtivo] = useState(ctx.perfil.notificacoes_email);
  const [pausada, setPausada] = useState(ctx.lojaAtual.pausada);
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleDarkMode() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  function handleExportLgpd() {
    const payload = {
      exportado_em: new Date().toISOString(),
      perfil: ctx.perfil,
      lojas: ctx.isOwner ? [ctx.lojaAtual] : [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zelo-meus-dados-${ctx.userId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveConfiguracoesAction({
        nome,
        whatsapp,
        notificacoes_push: pushAtivo,
        notificacoes_email: emailAtivo,
        ...(ctx.isOwner ? { loja_id: ctx.lojaAtual.id, pausada } : {}),
      });
      setFeedback(res.error ?? res.message ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tight-heading">Configurações & Meu Perfil</h1>

      <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-4">
        <AvatarUploader
          userId={ctx.userId}
          initialUrl={ctx.perfil.avatar_url}
          isCustom={ctx.perfil.avatar_customizado}
          displayName={nome || ctx.perfil.nome}
        />

        <div className="space-y-2.5">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
              Nome de exibição
            </span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-sm outline-none"
            />
          </label>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
              E-mail vinculado (Google)
            </span>
            <div className="flex h-11 items-center rounded-xl bg-[var(--zelo-soft)] px-3 text-xs text-[var(--zelo-muted)]">
              {ctx.userEmail}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
              WhatsApp
            </span>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(31) 99999-8888"
              className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3 text-sm font-mono-num outline-none"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--zelo-soft)] p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ArrowLeftRight className="h-4 w-4 text-[#F59E0B]" />
          Troca Rápida de Contexto
        </div>
        <p className="text-xs text-[var(--zelo-muted)]">
          Use esta mesma conta Google para agendar horários como cliente em outros estabelecimentos.
        </p>
        <Link
          href={`/${ctx.lojaAtual.slug}`}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-xs font-semibold text-[var(--zelo-btn-ink)]"
        >
          Ver Página Pública / Modo Cliente
        </Link>
      </section>

      <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
          Preferências
        </span>

        <div className="flex min-h-[44px] items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Moon className="h-4 w-4 text-[var(--zelo-muted)]" />
            Tema Escuro
          </span>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`inline-flex min-h-[44px] items-center px-1`}
            aria-label="Alternar tema escuro"
          >
            <span
              className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                dark ? "bg-[#10B981]" : "bg-[var(--zelo-soft)]"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                  dark ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-[var(--zelo-muted)]" />
            Alertas Web Push
          </span>
          <input
            type="checkbox"
            checked={pushAtivo}
            onChange={(e) => setPushAtivo(e.target.checked)}
            className="h-5 w-5 accent-[#111111]"
          />
        </label>

        <label className="flex min-h-[44px] cursor-pointer items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-[var(--zelo-muted)]" />
            Lembretes por E-mail
          </span>
          <input
            type="checkbox"
            checked={emailAtivo}
            onChange={(e) => setEmailAtivo(e.target.checked)}
            className="h-5 w-5 accent-[#111111]"
          />
        </label>
      </section>

      {ctx.isOwner && (
        <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-[var(--zelo-card)] p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <PauseCircle className="h-4 w-4 text-[#F59E0B]" />
              Pausar Loja Temporariamente
            </div>
            <p className="text-xs text-[var(--zelo-muted)]">
              Modo férias: oculta da vitrine e pausa novas reservas.
            </p>
          </div>
          <input
            type="checkbox"
            checked={pausada}
            onChange={(e) => setPausada(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[#111111]"
          />
        </label>
      )}

      {feedback && (
        <div className="rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2.5 text-xs font-semibold">
          {feedback}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar Alterações
      </button>

      <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-2.5">
        <button
          type="button"
          onClick={handleExportLgpd}
          className="flex h-11 w-full items-center justify-between rounded-xl bg-[var(--zelo-soft)] px-3.5 text-xs font-semibold"
        >
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#10B981]" />
            Baixar Meus Dados (LGPD)
          </span>
          <Download className="h-4 w-4 text-[var(--zelo-muted)]" />
        </button>

        <form action={signOutConfigAction}>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 text-xs font-semibold text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </button>
        </form>
      </section>
    </div>
  );
}
