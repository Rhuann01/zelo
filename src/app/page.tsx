import Link from "next/link";
import { ArrowRight, CalendarCheck2, ShieldCheck } from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--zelo-bg)]">
      <div className="hero-grid-bg pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative z-10 w-full max-w-[390px] rounded-2xl bg-[var(--zelo-card)] p-6 shadow-sm space-y-6 text-center">
        <div className="flex justify-center">
          <ZeloLogo size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tight-heading">
            Sua agenda online com a{" "}
            <span className="font-editorial italic text-3xl text-[#F59E0B]">cara</span> do seu negócio.
          </h1>
          <p className="text-sm text-[var(--zelo-muted)]">
            Fundação Etapa 1 ativa. Entre com sua conta Google para criar sua loja ou acessar seu painel.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/entrar"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-5 text-sm font-semibold text-[var(--zelo-btn-ink)] transition hover:opacity-90"
          >
            Entrar ou Criar Loja
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/painel"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] px-5 text-sm font-medium text-[var(--zelo-ink)] transition hover:opacity-90"
          >
            <CalendarCheck2 className="h-4 w-4 text-[#10B981]" />
            Ir para o Painel
          </Link>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-3 py-1 text-xs text-[var(--zelo-muted)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
          Multi-Tenant RLS & PostgreSQL GiST ativos
        </div>
      </div>
    </main>
  );
}
