import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — Zelo",
  description: "Política de Privacidade e tratamento de dados (LGPD) da plataforma Zelo.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[var(--zelo-bg)] text-[var(--zelo-ink)] px-4 sm:px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--zelo-card)] px-4 py-2 text-sm font-semibold text-[var(--zelo-ink)] transition hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--zelo-muted)]">
            <Lock className="h-4 w-4 text-emerald-500" />
            LGPD Compliance
          </span>
        </div>

        <article className="rounded-3xl bg-[var(--zelo-card)] p-6 sm:p-10 space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tight-heading">Política de Privacidade — Zelo</h1>
            <p className="text-sm text-[var(--zelo-muted)]">
              Explicamos de forma transparente quais dados coletamos e como os protegemos em conformidade com a LGPD
              (Lei nº 13.709/2018).
            </p>
          </header>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">1. Dados Coletados</h2>
            <p>
              Ao entrar com sua conta Google, recebemos seu nome, endereço de e-mail e foto de perfil. Para confirmar
              agendamentos, solicitamos seu telefone/WhatsApp e, quando autorizado, a permissão de localização para exibir
              estabelecimentos próximos na vitrine regional.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">2. Finalidade do Tratamento</h2>
            <p>
              Utilizamos seus dados exclusivamente para autenticar sua conta, registrar e gerenciar seus agendamentos,
              enviar lembretes (via Web Push ou e-mail transacional) e permitir a gestão da agenda pelo estabelecimento
              escolhido por você.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">3. Isolamento e Segurança</h2>
            <p>
              O banco de dados do Zelo utiliza isolamento multi-tenant rigoroso (Row Level Security): cada loja acessa
              apenas os próprios agendamentos e clientes, sem exposição pública de dados pessoais de terceiros.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">4. Direitos do Titular</h2>
            <p>
              Você pode atualizar sua foto de perfil, cancelar ou remarcar agendamentos diretamente pela sua conta, ou
              solicitar a exclusão dos seus dados pessoais pelo e-mail{" "}
              <a href="mailto:contato@zelo.app" className="font-semibold text-[var(--zelo-ink)] underline">
                contato@zelo.app
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
