import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";
import { ExplorarVitrine } from "@/components/explorar-vitrine";
import { getVitrineLojas } from "@/lib/public/get-loja-publica";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Explorar Espaços — Zelo",
  description:
    "Descubra barbearias, salões e estúdios próximos a você e agende seu horário em segundos.",
};

export default async function ExplorarPage() {
  const lojas = await getVitrineLojas();

  return (
    <div className="min-h-screen bg-[var(--zelo-bg)] text-[var(--zelo-ink)]">
      <header className="sticky top-0 z-40 bg-[var(--zelo-bg)]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="shrink-0">
              <ZeloLogo size="sm" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--zelo-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--zelo-muted)]">
              <Compass className="h-3 w-3" />
              Vitrine
            </span>
          </div>

          <Link
            href="/entrar"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3.5 text-xs font-semibold text-[var(--zelo-btn-ink)] transition active:scale-95"
          >
            <span>Criar minha página</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tight-heading">
            Encontre e agende{" "}
            <span className="font-editorial italic font-normal text-[1.75rem]">
              sem esperar
            </span>
          </h1>
          <p className="text-sm text-[var(--zelo-muted)]">
            Escolha um estabelecimento ativo e reserve direto na agenda oficial.
          </p>
        </div>

        <ExplorarVitrine lojas={lojas} />
      </main>
    </div>
  );
}
