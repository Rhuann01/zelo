import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/painel";

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[var(--zelo-bg)] overflow-hidden">
      <div className="hero-grid-bg pointer-events-none absolute inset-x-0 top-0 h-80 opacity-80" />

      <div className="relative z-10 w-full max-w-[390px] space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <ZeloLogo size="lg" />
          <h1 className="text-2xl font-bold tight-heading leading-tight text-[var(--zelo-ink)]">
            Entre para gerenciar ou{" "}
            <span className="font-editorial italic text-[1.85rem] font-normal">
              marcar seu horário
            </span>
          </h1>
          <p className="max-w-xs text-sm text-[var(--zelo-muted)]">
            Acesse seus agendamentos ou seu painel profissional com 1 clique.
          </p>
        </div>

        <section className="rounded-2xl bg-[var(--zelo-card)] p-5 shadow-xs space-y-4">
          {params.erro && (
            <div className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 text-center">
              Não foi possível concluir o login. Tente novamente.
            </div>
          )}

          <GoogleAuthButton
            nextPath={nextPath}
            showDevLogin={process.env.NODE_ENV === "development"}
          />

          <p className="text-center text-xs leading-relaxed text-[var(--zelo-muted)]">
            Acesso único tanto para clientes quanto para profissionais e donos de estabelecimentos.
          </p>

          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-3 py-1 text-[11px] font-medium text-[var(--zelo-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
              Acesso criptografado e seguro
            </span>
            <Link
              href="/explorar"
              className="text-xs font-semibold text-[var(--zelo-ink)] underline underline-offset-4 hover:opacity-80"
            >
              Só quer ver lojas? Explorar Vitrine →
            </Link>
          </div>
        </section>

        <p className="text-center text-xs leading-relaxed text-[var(--zelo-subtle)] px-4">
          Ao continuar, você concorda com os{" "}
          <Link href="/termos" className="underline underline-offset-2 hover:text-[var(--zelo-ink)]">
            Termos de Uso
          </Link>{" "}
          e{" "}
          <Link
            href="/privacidade"
            className="underline underline-offset-2 hover:text-[var(--zelo-ink)]"
          >
            Política de Privacidade (LGPD)
          </Link>{" "}
          do Zelo.
        </p>
      </div>
    </main>
  );
}
