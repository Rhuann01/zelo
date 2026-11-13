import type { Metadata } from "next";
import Link from "next/link";
import { User } from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";
import { ExplorarVitrine } from "@/components/explorar-vitrine";
import { getVitrineLojas } from "@/lib/public/get-loja-publica";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Vitrine Regional — Zelo",
  description:
    "Descubra barbearias, salões e estúdios próximos a você e agende seu horário em segundos.",
};

export default async function ExplorarPage() {
  const lojas = await getVitrineLojas();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--zelo-bg)] text-[var(--zelo-ink)]">
      <header className="sticky top-0 z-50 w-full bg-[var(--zelo-bg)]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-4">
          <Link href="/" className="shrink-0">
            <ZeloLogo size="sm" />
          </Link>

          <Link
            href="/entrar"
            aria-label="Entrar ou acessar painel"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--zelo-soft)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
              <User className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-2">
        <ExplorarVitrine lojas={lojas} />
      </main>
    </div>
  );
}
