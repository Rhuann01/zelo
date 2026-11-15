import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Termos de Uso e Condições Comerciais — Zelo",
  description:
    "Termos de Uso, planos, preços, cancelamento, direito de arrependimento (7 dias) e atendimento da plataforma Zelo.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-[var(--zelo-ink)]">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao início
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Termos de Uso e Condições Comerciais
      </h1>
      <p className="mt-2 text-xs text-[var(--zelo-muted)]">
        Última atualização: Novembro de 2026 • Atendimento oficial:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--zelo-muted)]">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            1. Objeto e Identificação
          </h2>
          <p>
            A plataforma <strong className="text-[var(--zelo-ink)]">Zelo</strong> fornece
            infraestrutura digital de agendamento online, vitrine regional e gestão de horários
            para barbearias, salões de beleza, manicures, estúdios de estética e profissionais
            autônomos, bem como aos respectivos clientes finais que realizam reservas.
          </p>
          <p>
            Canal eletrônico oficial de atendimento ao consumidor e suporte técnico:{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-[var(--zelo-ink)] underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            2. Planos, Preços, Teste Grátis e Renovação
          </h2>
          <p>
            Novos estabelecimentos contam com{" "}
            <strong className="text-[var(--zelo-ink)]">14 dias de teste grátis</strong>, sem
            cobrança automática ao término do período caso o lojista opte por não contratar um
            plano pago.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--zelo-ink)]">Plano Solo — R$ 29,00/mês:</strong>{" "}
              inclui 1 profissional, agenda online, página exclusiva e vitrine regional.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">Plano Estúdio — R$ 59,00/mês:</strong>{" "}
              inclui equipe completa de profissionais, controle de comissões e notificações Web
              Push.
            </li>
          </ul>
          <p>
            Os pagamentos são processados de forma segura via{" "}
            <strong className="text-[var(--zelo-ink)]">Asaas</strong> (PIX, Cartão de Crédito ou
            Boleto). A renovação é mensal e pode ser interrompida a qualquer momento, sem multa ou
            fidelidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            3. Direito de Arrependimento (7 Dias) e Cancelamento
          </h2>
          <p>
            Em conformidade com o art. 49 do Código de Defesa do Consumidor e o Decreto nº
            7.962/2013, o lojista tem o direito de solicitar o{" "}
            <strong className="text-[var(--zelo-ink)]">
              arrependimento e reembolso integral em até 7 (sete) dias corridos
            </strong>{" "}
            a contar da primeira contratação paga da assinatura, diretamente pelo e-mail{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-[var(--zelo-ink)] underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p>
            Após os 7 dias iniciais, o cancelamento pode ser solicitado a qualquer momento no painel
            em <span className="font-semibold text-[var(--zelo-ink)]">Assinatura</span> ou via
            suporte, interrompendo as cobranças futuras e mantendo o acesso até o fim do ciclo já
            pago.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            4. Agendamentos, Sinal PIX e Responsabilidade do Estabelecimento
          </h2>
          <p>
            Cada estabelecimento define seus próprios horários, serviços, preços e eventual sinal
            via PIX. O Zelo atua como plataforma tecnológica intermediária e não se responsabiliza
            pela execução presencial do serviço ou por estornos de valores transferidos diretamente
            entre cliente e estabelecimento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            5. Uso Adequado e Segurança
          </h2>
          <p>
            É proibido utilizar a plataforma para reservas automatizadas, spam, falsidade
            ideológica ou tentativa de acesso não autorizado a dados de terceiros. Contas que
            violarem esta regra poderão ser suspensas imediatamente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            6. Atendimento e Prazo de Resposta
          </h2>
          <p>
            Dúvidas comerciais, solicitações de cancelamento, reembolso ou suporte técnico devem ser
            enviadas para{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-[var(--zelo-ink)] underline"
            >
              {SUPPORT_EMAIL}
            </a>
            . As solicitações recebidas são respondidas em até{" "}
            <strong className="text-[var(--zelo-ink)]">5 (cinco) dias úteis</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
