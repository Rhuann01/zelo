"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  LayoutGrid,
  Palette,
  Settings,
  Sparkles,
  Store,
  User,
  Wallet,
} from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";
import { ZeloToastViewport } from "@/components/zelo-toast";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import type { LojaResumo } from "@/lib/painel/get-painel-context";

interface PainelShellProps {
  lojas: LojaResumo[];
  lojaAtual: LojaResumo;
  isOwner: boolean;
  avatarUrl?: string | null;
  perfilNome?: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/painel", label: "Agenda", icon: Calendar },
  { href: "/painel/financeiro", label: "Ganhos", icon: Wallet },
  { href: "/painel/gestao", label: "Gestão", icon: LayoutGrid },
  { href: "/painel/personalizar", label: "Personalizar", icon: Palette },
  { href: "/painel/configuracoes", label: "Config", icon: Settings },
];

export function PainelShell({
  lojas,
  lojaAtual,
  isOwner,
  avatarUrl,
  perfilNome,
  children,
}: PainelShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleStoreSwitch(lojaId: string) {
    if (lojaId === "__new__") {
      router.push("/onboarding");
      return;
    }
    document.cookie = `zelo_loja_id=${lojaId}; path=/; max-age=2592000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--zelo-bg)] text-[var(--zelo-ink)]">
      <ZeloToastViewport />
      <header className="sticky top-0 z-50 w-full bg-[var(--zelo-bg)]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between gap-2 px-4">
          <Link href="/painel" className="shrink-0">
            <ZeloLogo size="sm" />
          </Link>

          {lojas.length > 1 ? (
            <div className="relative min-w-0 max-w-[185px]">
              <select
                aria-label="Selecionar loja"
                value={lojaAtual.id}
                onChange={(e) => handleStoreSwitch(e.target.value)}
                className="min-h-[40px] w-full appearance-none truncate rounded-xl bg-[var(--zelo-soft)] pl-3 pr-8 text-[13px] font-semibold text-[var(--zelo-ink)] outline-none ring-1 ring-[var(--zelo-border)] transition-colors hover:bg-[var(--zelo-border)]"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
                <option value="__new__">+ Criar nova loja</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-[var(--zelo-muted)]" />
            </div>
          ) : (
            <Link
              href="/onboarding"
              title="Criar outra loja"
              className="inline-flex min-h-[40px] max-w-[170px] items-center gap-1.5 truncate rounded-xl bg-[var(--zelo-soft)] px-2.5 text-[13px] font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
            >
              <span className="truncate">{lojaAtual.nome}</span>
            </Link>
          )}

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/${lojaAtual.slug}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)]"
              title="Ver página pública da loja"
              aria-label="Ver página pública da loja"
            >
              <Store className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/painel/configuracoes"
              className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
              title={isOwner ? "Dono" : "Equipe"}
              aria-label="Meu Perfil"
            >
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={perfilNome || "Meu perfil"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-[18px] w-[18px]" />
              )}
            </Link>
          </div>
        </div>
      </header>

      <main key={lojaAtual.id} className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-4 pb-28">
        <PwaInstallBanner />
        {isOwner &&
          pathname !== "/painel/assinatura" &&
          (() => {
            const diasRestantes = lojaAtual.trial_ate
              ? Math.ceil((Date.parse(lojaAtual.trial_ate) - Date.now()) / 86_400_000)
              : 14;
            const bloqueado =
              lojaAtual.assinatura_status === "atrasada" ||
              lojaAtual.assinatura_status === "cancelada" ||
              (lojaAtual.assinatura_status === "trial" && diasRestantes <= 0);

            if (bloqueado) {
              return (
                <Link
                  href="/painel/assinatura"
                  className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-rose-500/12 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="font-semibold leading-snug">
                      {lojaAtual.assinatura_status === "trial"
                        ? "Seu teste grátis encerrou — novos agendamentos online estão pausados."
                        : "Assinatura pendente — regularize para reabrir agendamentos online."}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white">
                    Assinar
                  </span>
                </Link>
              );
            }

            if (lojaAtual.assinatura_status === "trial" && diasRestantes <= 5) {
              return (
                <Link
                  href="/painel/assinatura"
                  className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-[#F59E0B]/12 px-3.5 py-2 text-xs text-[#B45309] dark:text-[#FBBF24]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-semibold truncate">
                      Teste grátis: {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold underline underline-offset-2">
                    Ver planos
                  </span>
                </Link>
              );
            }

            return null;
          })()}
        {children}
      </main>

      <nav className="fixed bottom-0 z-50 w-full bg-[var(--zelo-bg)]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-evenly px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] min-w-[52px] flex-col items-center justify-center transition-colors ${
                  active
                    ? "font-semibold text-[var(--zelo-ink)]"
                    : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
                <span className="mt-0.5 text-[11px] leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
