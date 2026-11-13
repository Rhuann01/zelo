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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  function toggleDarkMode(next: boolean) {
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

      <Card className="py-4">
        <CardContent className="space-y-4 px-4">
          <AvatarUploader
            userId={ctx.userId}
            initialUrl={ctx.perfil.avatar_url}
            isCustom={ctx.perfil.avatar_customizado}
            displayName={nome || ctx.perfil.nome}
          />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="cfg-nome"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Nome de exibição
              </Label>
              <Input
                id="cfg-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-11 rounded-xl border-0 bg-secondary px-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                E-mail vinculado (Google)
              </span>
              <div className="flex h-11 items-center rounded-xl bg-secondary px-3 text-xs text-muted-foreground">
                {ctx.userEmail}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="cfg-whatsapp"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                WhatsApp
              </Label>
              <Input
                id="cfg-whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(31) 99999-8888"
                className="h-11 rounded-xl border-0 bg-secondary px-3 font-mono-num text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary py-4">
        <CardContent className="space-y-3 px-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <ArrowLeftRight className="h-4 w-4 text-[#F59E0B]" />
            Troca Rápida de Contexto
          </div>
          <p className="text-xs text-muted-foreground">
            Use esta mesma conta Google para agendar horários como cliente em outros estabelecimentos.
          </p>
          <Link
            href={`/${ctx.lojaAtual.slug}`}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Ver Página Pública / Modo Cliente
          </Link>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="space-y-2 px-4">
          <span className="block pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preferências
          </span>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Moon className="h-4 w-4 text-muted-foreground" />
              Tema Escuro
            </span>
            <Switch
              checked={dark}
              onCheckedChange={toggleDarkMode}
              aria-label="Alternar tema escuro"
            />
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Alertas Web Push
            </span>
            <Switch
              checked={pushAtivo}
              onCheckedChange={setPushAtivo}
              aria-label="Alertas Web Push"
            />
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Lembretes por E-mail
            </span>
            <Switch
              checked={emailAtivo}
              onCheckedChange={setEmailAtivo}
              aria-label="Lembretes por E-mail"
            />
          </label>
        </CardContent>
      </Card>

      {ctx.isOwner && (
        <Card className="py-4">
          <CardContent className="px-4">
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <PauseCircle className="h-4 w-4 text-[#F59E0B]" />
                  Pausar Loja Temporariamente
                </div>
                <p className="text-xs text-muted-foreground">
                  Modo férias: oculta da vitrine e pausa novas reservas.
                </p>
              </div>
              <Switch
                checked={pausada}
                onCheckedChange={setPausada}
                aria-label="Pausar Loja Temporariamente"
              />
            </label>
          </CardContent>
        </Card>
      )}

      {feedback && (
        <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-semibold">
          {feedback}
        </div>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="h-12 w-full rounded-xl text-sm font-semibold"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar Alterações
      </Button>

      <Card className="py-4">
        <CardContent className="space-y-2.5 px-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportLgpd}
            className="h-11 w-full justify-between rounded-xl px-3.5 text-xs font-semibold"
          >
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#10B981]" />
              Baixar Meus Dados (LGPD)
            </span>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>

          <form action={signOutConfigAction}>
            <Button
              type="submit"
              variant="ghost"
              className="h-11 w-full rounded-xl bg-red-500/10 text-xs font-semibold text-red-600 hover:bg-red-500/15 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
