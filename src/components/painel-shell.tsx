"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  LayoutGrid,
  Palette,
  Settings,
  Store,
  User,
  Wallet,
} from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";
import type { LojaResumo } from "@/lib/painel/get-painel-context";

interface PainelShellProps {
  lojas: LojaResumo[];
  lojaAtual: LojaResumo;
  isOwner: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/painel", label: "Agenda", icon: Calendar },
  { href: "/painel/financeiro", label: "Ganhos", icon: Wallet },
  { href: "/painel/gestao", label: "Gestão", icon: LayoutGrid },
  { href: "/painel/personalizar", label: "Personalizar", icon: Palette },
  { href: "/painel/configuracoes", label: "Config", icon: Settings },
];

export function PainelShell({ lojas, lojaAtual, isOwner, children }: PainelShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleStoreSwitch(lojaId: string) {
    document.cookie = `zelo_loja_id=${lojaId}; path=/; max-age=2592000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--zelo-bg)] text-[var(--zelo-ink)]">
      <header className="sticky top-0 z-50 w-full bg-[var(--zelo-bg)]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between gap-2 px-4">
          <Link href="/painel" className="shrink-0">
            <ZeloLogo size="sm" />
          </Link>

          {lojas.length > 1 ? (
            <div className="relative min-w-0 max-w-[160px]">
              <select
                aria-label="Selecionar loja"
                value={lojaAtual.id}
                onChange={(e) => handleStoreSwitch(e.target.value)}
                className="min-h-[44px] w-full appearance-none truncate rounded-lg bg-[var(--zelo-soft)] pl-2.5 pr-7 text-[13px] font-semibold text-[var(--zelo-ink)] outline-none transition-colors hover:bg-[var(--zelo-border)]"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-3.5 h-4 w-4 text-[var(--zelo-muted)]" />
            </div>
          ) : (
            <span className="inline-flex min-h-[44px] max-w-[160px] items-center gap-1.5 truncate rounded-lg bg-[var(--zelo-soft)] px-2.5 text-[13px] font-semibold text-[var(--zelo-ink)]">
              <span className="truncate">{lojaAtual.nome}</span>
            </span>
          )}

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/${lojaAtual.slug}`}
              className="flex min-h-[44px] items-center gap-1 px-1.5 text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)]"
              title="Ver página pública / Modo Cliente"
              aria-label="Ver página pública"
            >
              <Store className="h-[18px] w-[18px]" />
              <span className="hidden text-xs sm:inline">Modo Cliente</span>
            </Link>
            <Link
              href="/painel/configuracoes"
              className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
              title={isOwner ? "Dono" : "Equipe"}
              aria-label="Meu Perfil"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-4 pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 z-50 w-full bg-[var(--zelo-bg)]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center transition-colors ${
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
