import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — Zelo",
  description: "Termos e condições gerais de uso da plataforma Zelo.",
};

export default function TermosPage() {
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
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Atualizado em 2026
          </span>
        </div>

        <article className="rounded-3xl bg-[var(--zelo-card)] p-6 sm:p-10 space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tight-heading">Termos de Uso — Zelo</h1>
            <p className="text-sm text-[var(--zelo-muted)]">
              Estes Termos regulam o uso da plataforma Zelo por estabelecimentos parceiros (lojistas) e clientes finais.
            </p>
          </header>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">1. Objeto da Plataforma</h2>
            <p>
              O Zelo fornece infraestrutura de agendamento online white-label, gestão de equipe e vitrine regional para
              barbearias, manicures, salões e estúdios de beleza. O Zelo não presta os serviços presenciais nem atua
              como intermediador financeiro dos atendimentos realizados pelas lojas.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">2. Cadastro, Trial e Assinatura</h2>
            <p>
              Novos estabelecimentos recebem 14 dias gratuitos de teste sem necessidade de cartão de crédito. Após o
              período de avaliação, a continuidade do uso público da agenda depende da assinatura de um dos planos
              vigentes (Solo ou Estúdio), processados de forma segura via Asaas (PIX, Boleto ou Cartão).
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">3. Agendamentos e Sinal via PIX</h2>
            <p>
              Cada estabelecimento define livremente seus preços, durações de serviços, horários de atendimento e eventual
              chave PIX para sinal de reserva. O pagamento do sinal ocorre diretamente entre cliente e estabelecimento,
              cabendo à loja definir sua política de cancelamento e remarcação.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">4. Uso Adequado e Propriedade</h2>
            <p>
              É proibido utilizar o Zelo para envio de spam, reservas automatizadas abusivas ou publicação de conteúdo
              ilícito. O lojista mantém integral titularidade sobre sua marca, fotos e base de atendimentos.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
            <h2 className="text-base font-bold text-[var(--zelo-ink)]">5. Contato e Suporte</h2>
            <p>
              Dúvidas sobre estes Termos podem ser enviadas para{" "}
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
