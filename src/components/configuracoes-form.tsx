"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  BellRing,
  ChevronRight,
  CreditCard,
  Download,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Moon,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Umbrella,
} from "lucide-react";
import { AvatarUploader } from "@/components/avatar-uploader";
import { showToast } from "@/components/zelo-toast";
import {
  saveConfiguracoesAction,
  signOutConfigAction,
} from "@/app/painel/configuracoes/actions";
import type { PainelContext } from "@/lib/painel/get-painel-context";

export function ConfiguracoesForm({ ctx }: { ctx: PainelContext }) {
  const router = useRouter();
  const [nome, setNome] = useState(ctx.perfil.nome);
  const [whatsapp, setWhatsapp] = useState(ctx.perfil.whatsapp ?? "");
  const [pushAtivo, setPushAtivo] = useState(ctx.perfil.notificacoes_push);
  const [emailAtivo, setEmailAtivo] = useState(ctx.perfil.notificacoes_email);
  const [pausada, setPausada] = useState(ctx.lojaAtual.pausada);
  const [dark, setDark] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    nome !== ctx.perfil.nome ||
    whatsapp !== (ctx.perfil.whatsapp ?? "") ||
    pushAtivo !== ctx.perfil.notificacoes_push ||
    emailAtivo !== ctx.perfil.notificacoes_email ||
    (ctx.isOwner && pausada !== ctx.lojaAtual.pausada);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDarkMode() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("zelo_theme", next ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
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
    startTransition(async () => {
      const res = await saveConfiguracoesAction({
        nome,
        whatsapp,
        notificacoes_push: pushAtivo,
        notificacoes_email: emailAtivo,
        ...(ctx.isOwner ? { loja_id: ctx.lojaAtual.id, pausada } : {}),
      });
      if (res.error) showToast(res.error, "error");
      else {
        router.refresh();
        if (res.message) showToast(res.message, "success");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Top Subheader */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/painel"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--zelo-soft)] text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
            aria-label="Voltar ao painel"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tight-heading">Configurações</h1>
        </div>
        <span className="rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 font-mono-num text-xs text-[var(--zelo-muted)]">
          {ctx.isOwner ? "Dono" : "Equipe"}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-5"
      >
        {/* Profile Card */}
      <section className="flex flex-col gap-4 rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm">
        <AvatarUploader
          userId={ctx.userId}
          initialUrl={ctx.perfil.avatar_url}
          isCustom={ctx.perfil.avatar_customizado}
          displayName={nome || ctx.perfil.nome}
        />

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--zelo-muted)]">Nome de Exibição</span>
            <div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-[var(--zelo-soft)] px-3.5">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-transparent text-sm text-[var(--zelo-ink)] outline-none"
              />
              <Pencil className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
            </div>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--zelo-muted)]">E-mail Vinculado (Google SSO)</span>
            <div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-[var(--zelo-soft)]/70 px-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
                <span className="truncate font-mono-num text-sm text-[var(--zelo-muted)]">
                  {ctx.userEmail}
                </span>
              </div>
              <Lock className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--zelo-muted)]">WhatsApp Profissional</span>
            <div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-[var(--zelo-soft)] px-3.5">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(31) 99999-8888"
                  className="w-full bg-transparent font-mono-num text-sm text-[var(--zelo-ink)] outline-none"
                />
              </div>
              {whatsapp.trim().length >= 10 && (
                <span className="shrink-0 rounded bg-[#10B981]/15 px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#10B981]">
                  Ativo
                </span>
              )}
            </div>
          </label>
        </div>
      </section>

      {/* Quick Context Switch */}
      <section className="flex flex-col gap-3 rounded-xl bg-[var(--zelo-soft)] p-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-card)] text-[var(--zelo-ink)]">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[var(--zelo-ink)]">
              Troca Rápida de Contexto
            </span>
            <p className="mt-0.5 text-xs leading-snug text-[var(--zelo-muted)]">
              Use esta mesma conta para agendar horários em outros estabelecimentos parceiros.
            </p>
          </div>
        </div>
        <Link
          href={`/${ctx.lojaAtual.slug}`}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--zelo-btn-bg)] px-4 text-sm font-semibold text-[var(--zelo-btn-ink)] transition-transform active:scale-[0.99]"
        >
          <Store className="h-[18px] w-[18px]" />
          <span>Mudar para Modo Cliente</span>
        </Link>
      </section>

      {/* Preferências do Sistema */}
      <section className="flex flex-col gap-1.5">
        <span className="px-1 text-xs font-semibold text-[var(--zelo-muted)]">
          Preferências do Sistema
        </span>
        <div className="flex flex-col gap-1 rounded-xl bg-[var(--zelo-card)] p-2 shadow-sm">
          <div className="flex h-14 items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]">
            <div className="flex items-center gap-2.5">
              <Moon className="h-5 w-5 text-[var(--zelo-muted)]" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--zelo-ink)]">Tema Visual</span>
                <span className="text-xs text-[var(--zelo-muted)]">
                  {dark ? "Escuro • Alto contraste" : "Claro • Alto contraste"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex min-h-[44px] items-center px-1"
              aria-label="Alternar tema escuro"
            >
              <span
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                  dark ? "bg-[var(--zelo-btn-bg)]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full shadow-sm transition-transform ${
                    dark ? "translate-x-5 bg-[var(--zelo-btn-ink)]" : "translate-x-0 bg-white"
                  }`}
                />
              </span>
            </button>
          </div>

          <label className="flex h-14 cursor-pointer items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]">
            <div className="flex items-center gap-2.5">
              <BellRing className="h-5 w-5 text-[var(--zelo-muted)]" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--zelo-ink)]">Web Push</span>
                <span
                  className={`text-xs ${
                    pushAtivo ? "text-[#10B981]" : "text-[var(--zelo-muted)]"
                  }`}
                >
                  {pushAtivo ? "Ativo neste navegador" : "Desativado"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPushAtivo((v) => !v)}
              className="inline-flex min-h-[44px] items-center px-1"
              aria-label="Alternar Web Push"
            >
              <span
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                  pushAtivo ? "bg-[var(--zelo-btn-bg)]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full shadow-sm transition-transform ${
                    pushAtivo ? "translate-x-5 bg-[var(--zelo-btn-ink)]" : "translate-x-0 bg-white"
                  }`}
                />
              </span>
            </button>
          </label>

          <label className="flex h-14 cursor-pointer items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]">
            <div className="flex items-center gap-2.5">
              <Mail className="h-5 w-5 text-[var(--zelo-muted)]" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--zelo-ink)]">
                  Lembretes por E-mail
                </span>
                <span className="text-xs text-[var(--zelo-muted)]">Resumo diário às 07:00</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmailAtivo((v) => !v)}
              className="inline-flex min-h-[44px] items-center px-1"
              aria-label="Alternar lembretes por e-mail"
            >
              <span
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                  emailAtivo ? "bg-[var(--zelo-btn-bg)]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full shadow-sm transition-transform ${
                    emailAtivo ? "translate-x-5 bg-[var(--zelo-btn-ink)]" : "translate-x-0 bg-white"
                  }`}
                />
              </span>
            </button>
          </label>
        </div>
      </section>

      {/* Controles da Unidade */}
      {ctx.isOwner && (
        <section className="flex flex-col gap-1.5">
          <span className="px-1 text-xs font-semibold text-[var(--zelo-muted)]">
            Controles da Unidade
          </span>
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
                  <Umbrella className="h-[18px] w-[18px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--zelo-ink)]">
                    Pausar Loja Temporariamente
                  </span>
                  <span className="mt-0.5 text-xs text-[var(--zelo-muted)]">
                    Modo Férias • Bloqueia novas reservas no catálogo público
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPausada((v) => !v)}
                className="inline-flex min-h-[44px] shrink-0 items-center px-1"
                aria-label="Pausar loja temporariamente"
              >
                <span
                  className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                    pausada ? "bg-[#F59E0B]" : "bg-[#D4D4D8] dark:bg-[#3F3F46]"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      pausada ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
            {pausada && (
              <div className="flex items-center gap-2 rounded-lg bg-[#F59E0B]/10 p-2.5">
                <Info className="h-[18px] w-[18px] shrink-0 text-[#F59E0B]" />
                <span className="text-xs text-[var(--zelo-ink)]">
                  Agendamentos futuros existentes serão mantidos na sua agenda.
                </span>
              </div>
            )}

            <div className="border-t border-[var(--zelo-soft)] pt-2 space-y-1">
              <Link
                href="/painel/assinatura"
                className="flex min-h-[48px] items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CreditCard className="h-5 w-5 shrink-0 text-[var(--zelo-muted)]" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-[var(--zelo-ink)]">
                      Assinatura & Indicação
                    </span>
                    <span className="text-xs text-[var(--zelo-muted)] truncate">
                      Plano Asaas e código de 1 mês grátis
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
              </Link>

              <Link
                href="/onboarding"
                className="flex min-h-[48px] items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Plus className="h-5 w-5 shrink-0 text-[var(--zelo-muted)]" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-[var(--zelo-ink)]">
                      Criar nova unidade / loja
                    </span>
                    <span className="text-xs text-[var(--zelo-muted)] truncate">
                      Gerencie múltiplas unidades no mesmo login
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
              </Link>
            </div>
          </div>
        </section>
      )}

        {hasChanges && (
          <p className="text-center text-xs font-medium text-[#F59E0B]">
            Você tem alterações não salvas — clique abaixo para gravar.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Alterações
        </button>
      </form>

      {/* Privacidade & Sessão (LGPD) */}
      <section className="flex flex-col gap-1.5">
        <span className="px-1 text-xs font-semibold text-[var(--zelo-muted)]">
          Privacidade & Sessão (LGPD)
        </span>
        <div className="flex flex-col gap-1 rounded-xl bg-[var(--zelo-card)] p-2 shadow-sm">
          <button
            type="button"
            onClick={handleExportLgpd}
            className="flex h-12 w-full items-center justify-between rounded-lg px-2.5 text-left transition-colors hover:bg-[var(--zelo-soft)]"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-5 w-5 text-[var(--zelo-muted)]" />
              <span className="text-sm text-[var(--zelo-ink)]">Baixar Meus Dados (LGPD)</span>
            </div>
            <ChevronRight className="h-[18px] w-[18px] text-[var(--zelo-muted)]" />
          </button>

          <form action={signOutConfigAction}>
            <button
              type="submit"
              className="mt-1 flex h-12 w-full items-center justify-between rounded-lg bg-red-500/10 px-2.5 text-red-600 transition-colors hover:bg-red-500/15"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-semibold">Sair da Conta</span>
              </div>
              <span className="font-mono-num text-xs">Sessão Atual</span>
            </button>
          </form>
        </div>
      </section>

      <div className="flex flex-col items-center justify-center gap-1 py-2 text-center">
        <div className="flex items-center gap-1.5 text-[var(--zelo-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          <span className="font-mono-num text-xs">Conexão criptografada ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}
