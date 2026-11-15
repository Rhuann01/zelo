"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  BellRing,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Moon,
  Pencil,
  Phone,
  ShieldCheck,
  Store,
} from "lucide-react";
import { AvatarUploader } from "@/components/avatar-uploader";
import { formatBrazilPhone } from "@/lib/schemas/agendamento";
import { showToast } from "@/components/zelo-toast";
import {
  saveConfiguracoesAction,
  signOutConfigAction,
  checkIsSuperAdminAction,
} from "@/app/painel/configuracoes/actions";
import type { ViewerPerfil } from "@/lib/supabase/use-viewer-perfil";

export function ExplorarPerfilForm({
  viewer,
  onSaved,
}: {
  viewer: ViewerPerfil;
  onSaved: () => Promise<void>;
}) {
  const [nome, setNome] = useState(viewer.nome);
  const [whatsapp, setWhatsapp] = useState(viewer.whatsapp);
  const [pushAtivo, setPushAtivo] = useState(viewer.notificacoes_push);
  const [emailAtivo, setEmailAtivo] = useState(viewer.notificacoes_email);
  const [dark, setDark] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    checkIsSuperAdminAction()
      .then((ok) => {
        if (active) setIsSuperAdmin(ok);
      })
      .catch(() => {
        if (active) setIsSuperAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [viewer.id]);

  useEffect(() => {
    setNome(viewer.nome);
    setWhatsapp(viewer.whatsapp);
    setPushAtivo(viewer.notificacoes_push);
    setEmailAtivo(viewer.notificacoes_email);
  }, [viewer]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const hasChanges =
    nome !== viewer.nome ||
    whatsapp !== viewer.whatsapp ||
    pushAtivo !== viewer.notificacoes_push ||
    emailAtivo !== viewer.notificacoes_email;

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

  function handleSave() {
    startTransition(async () => {
      const res = await saveConfiguracoesAction({
        nome,
        whatsapp,
        notificacoes_push: pushAtivo,
        notificacoes_email: emailAtivo,
      });
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      await onSaved();
      showToast(res.message ?? "Perfil atualizado.", "success");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4"
      >
        <section className="flex flex-col gap-4 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm">
          <AvatarUploader
            userId={viewer.id}
            initialUrl={viewer.avatar_url}
            isCustom={viewer.avatar_customizado}
            displayName={nome || viewer.nome}
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
              <span className="text-xs text-[var(--zelo-muted)]">E-mail Vinculado</span>
              <div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-[var(--zelo-soft)]/70 px-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
                  <span className="truncate font-mono-num text-sm text-[var(--zelo-muted)]">
                    {viewer.email}
                  </span>
                </div>
                <Lock className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--zelo-muted)]">WhatsApp</span>
              <div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-[var(--zelo-soft)] px-3.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatBrazilPhone(e.target.value))}
                    placeholder="(31) 99999-8888"
                    className="w-full bg-transparent font-mono-num text-sm text-[var(--zelo-ink)] outline-none"
                  />
                </div>
              </div>
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-1 rounded-2xl bg-[var(--zelo-card)] p-2 shadow-sm">
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

          <div className="flex h-14 items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]">
            <div className="flex items-center gap-2.5">
              <BellRing className="h-5 w-5 text-[var(--zelo-muted)]" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--zelo-ink)]">Notificações Push</span>
                <span className="text-xs text-[var(--zelo-muted)]">
                  {pushAtivo ? "Lembretes ativados" : "Desativado"}
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
          </div>

          <div className="flex h-14 items-center justify-between rounded-lg px-2.5 transition-colors hover:bg-[var(--zelo-soft)]">
            <div className="flex items-center gap-2.5">
              <Mail className="h-5 w-5 text-[var(--zelo-muted)]" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--zelo-ink)]">
                  Lembretes por E-mail
                </span>
                <span className="text-xs text-[var(--zelo-muted)]">Confirmações e avisos</span>
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
          </div>
        </section>

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

      <div className="flex flex-col gap-2 rounded-2xl bg-[var(--zelo-card)] p-2 shadow-sm">
        <Link
          href="/painel"
          className="flex h-12 items-center justify-between rounded-lg px-2.5 text-sm font-medium text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-soft)]"
        >
          <span className="flex items-center gap-2.5">
            <Store className="h-5 w-5 text-[var(--zelo-muted)]" />
            <span>Acessar Painel Profissional</span>
          </span>
          <span className="font-mono-num text-xs text-[var(--zelo-muted)]">/painel</span>
        </Link>

        {isSuperAdmin && (
          <Link
            href="/super-admin"
            className="flex h-12 items-center justify-between rounded-lg px-2.5 text-sm font-medium text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-soft)]"
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[var(--zelo-muted)]" />
              <span>Torre de Controle (Super Admin)</span>
            </span>
            <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
              /super-admin
            </span>
          </Link>
        )}

        <form action={signOutConfigAction}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-between rounded-lg bg-red-500/10 px-2.5 text-red-600 transition-colors hover:bg-red-500/15"
          >
            <span className="flex items-center gap-2.5">
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-semibold">Sair da Conta</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
