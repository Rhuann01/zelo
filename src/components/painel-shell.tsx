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
    <div className="min-h-screen bg-[var(--zelo-bg)] pb-24">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-[var(--zelo-card)]/90 px-4 backdrop-blur-md">
        <Link href="/painel" className="shrink-0">
          <ZeloLogo size="sm" />
        </Link>

        {lojas.length > 1 ? (
          <div className="relative min-w-0 max-w-[180px]">
            <select
              aria-label="Selecionar loja"
              value={lojaAtual.id}
              onChange={(e) => handleStoreSwitch(e.target.value)}
              className="h-9 w-full appearance-none rounded-xl bg-[var(--zelo-soft)] pl-3 pr-7 text-xs font-semibold text-[var(--zelo-ink)] outline-none truncate"
            >
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-[var(--zelo-muted)]" />
          </div>
        ) : (
          <span className="truncate rounded-xl bg-[var(--zelo-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--zelo-ink)] max-w-[180px]">
            {lojaAtual.nome}
          </span>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-full bg-[var(--zelo-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--zelo-muted)]">
            {isOwner ? "Dono" : "Equipe"}
          </span>
          <Link
            href={`/${lojaAtual.slug}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-[var(--zelo-ink)]"
            title="Ver página pública"
            aria-label="Ver página pública"
          >
            <Store className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[440px] px-4 pt-4">{children}</main>

      <nav
        aria-label="Navegação do painel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--zelo-border)] bg-[var(--zelo-card)]/95 backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-[440px] grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/painel"
                ? pathname === "/painel"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] transition ${
                  active
                    ? "font-bold text-[var(--zelo-ink)]"
                    : "font-medium text-[var(--zelo-muted)]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? "text-[var(--zelo-ink)]" : "text-[var(--zelo-muted)]"}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
