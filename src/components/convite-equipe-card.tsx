"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  MapPin,
  ShieldCheck,
  Store,
  UserCheck,
} from "lucide-react";
import { aceitarConviteAction } from "@/app/convite/[token]/actions";

export interface ConvitePreview {
  valido: boolean;
  motivo?: string;
  loja_nome?: string;
  loja_slug?: string;
  loja_logo_url?: string | null;
  loja_cidade?: string;
  loja_bairro?: string;
  cargo?: string;
  comissao_percentual?: number;
  expires_at?: string;
}

export interface ConviteUsuarioLogado {
  nome: string;
  email: string;
  avatar_url: string | null;
}

const MOTIVO_TEXTO: Record<string, { title: string; desc: string }> = {
  already_used: {
    title: "Convite já utilizado",
    desc: "Este link de uso único já foi aceito anteriormente.",
  },
  revoked: {
    title: "Convite revogado",
    desc: "O proprietário cancelou este link de convite. Peça um novo se precisar entrar.",
  },
  expired: {
    title: "Convite expirado",
    desc: "O prazo de validade de 7 dias deste link terminou. Peça um novo ao proprietário.",
  },
  store_suspended: {
    title: "Loja indisponível",
    desc: "Esta loja não está aceitando novos membros no momento.",
  },
  invalid_token: {
    title: "Link inválido",
    desc: "Verifique se o link foi copiado por completo.",
  },
  not_found: {
    title: "Convite não encontrado",
    desc: "Esse link não existe ou foi removido.",
  },
};

export function ConviteEquipeCard({
  token,
  preview,
  usuario,
}: {
  token: string;
  preview: ConvitePreview;
  usuario: ConviteUsuarioLogado | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!preview.valido) {
    const info = MOTIVO_TEXTO[preview.motivo ?? "not_found"] ?? MOTIVO_TEXTO.not_found;
    return (
      <div className="w-full max-w-[420px] space-y-5 rounded-3xl bg-[var(--zelo-card)] p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold tight-heading">{info.title}</h1>
          <p className="text-sm text-[var(--zelo-muted)]">{info.desc}</p>
        </div>
        <Link
          href="/explorar"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)]"
        >
          <span>Ir para o Zelo</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const lojaInicial = (preview.loja_nome?.trim()[0] || "Z").toUpperCase();
  const userInicial = (usuario?.nome.trim()[0] || "P").toUpperCase();
  const loginHref = `/entrar?next=${encodeURIComponent(`/convite/${token}`)}`;

  const handleAceitar = () => {
    setError(null);
    startTransition(async () => {
      const res = await aceitarConviteAction(token);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAceito(true);
      setTimeout(() => {
        router.push("/painel");
        router.refresh();
      }, 900);
    });
  };

  return (
    <div className="w-full max-w-[420px] space-y-5 rounded-3xl bg-[var(--zelo-card)] p-6 shadow-sm">
      <div className="flex items-center gap-3.5">
        {preview.loja_logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview.loja_logo_url}
            alt={preview.loja_nome ?? "Loja"}
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--zelo-soft)] text-lg font-extrabold">
            {lojaInicial}
          </div>
        )}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--zelo-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--zelo-muted)]">
            <Store className="h-3 w-3" />
            Convite de Equipe
          </span>
          <h1 className="mt-1 truncate text-lg font-extrabold tight-heading">
            {preview.loja_nome}
          </h1>
          {(preview.loja_bairro || preview.loja_cidade) && (
            <p className="flex items-center gap-1 truncate text-xs text-[var(--zelo-muted)]">
              <MapPin className="h-3 w-3 shrink-0" />
              {[preview.loja_bairro, preview.loja_cidade].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[var(--zelo-soft)] p-3.5">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]">
            Cargo
          </span>
          <span className="mt-0.5 block text-sm font-bold">{preview.cargo}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]">
            Comissão
          </span>
          <span className="mt-0.5 block font-mono-num text-sm font-bold">
            {preview.comissao_percentual ?? 50}%
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 p-3 text-xs font-medium text-red-500">
          {error}
        </div>
      )}

      {aceito ? (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Bem-vindo à equipe! Abrindo seu painel...</span>
        </div>
      ) : !usuario ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
            Entre com sua conta Google para aceitar o convite. Seu nome e foto do perfil Zelo serão usados automaticamente na equipe.
          </p>
          <Link
            href={loginHref}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] shadow-md transition active:scale-[0.99]"
          >
            <LogIn className="h-4 w-4" />
            <span>Entrar com Google para aceitar</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl bg-[var(--zelo-soft)] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--zelo-muted)]">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Seu perfil que será exibido na loja</span>
            </div>
            <div className="flex items-center gap-3">
              {usuario.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={usuario.avatar_url}
                  alt={usuario.nome}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--zelo-card)] text-xs font-bold">
                  {userInicial}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{usuario.nome}</p>
                <p className="truncate text-xs text-[var(--zelo-muted)]">{usuario.email}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleAceitar}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] shadow-md transition active:scale-[0.99] disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Entrando na equipe...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Aceitar e entrar na equipe</span>
              </>
            )}
          </button>

          <Link
            href="/explorar"
            className="block text-center text-xs font-semibold text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
          >
            Agora não — voltar ao início
          </Link>
        </div>
      )}
    </div>
  );
}
