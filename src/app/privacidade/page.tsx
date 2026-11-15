import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Política de Privacidade (LGPD) — Zelo",
  description:
    "Saiba quem coleta seus dados, finalidades, prazos de retenção, compartilhamento, segurança e como solicitar exclusão na plataforma Zelo.",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacidadePage() {
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
        Política de Privacidade (LGPD)
      </h1>
      <p className="mt-2 text-xs text-[var(--zelo-muted)]">
        Última atualização: Novembro de 2026 • Canal de Privacidade:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--zelo-muted)]">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            1. Controlador dos Dados e Canal de Privacidade
          </h2>
          <p>
            A plataforma <strong className="text-[var(--zelo-ink)]">Zelo</strong> atua como
            Controladora dos dados cadastrais de lojistas e clientes finais necessários para o
            funcionamento do sistema de agendamento e assinaturas. Para qualquer assunto
            relacionado à Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD), entre em
            contato pelo e-mail{" "}
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
            2. Dados Coletados e Finalidade
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--zelo-ink)]">Identificação e contato:</strong> nome,
              e-mail (via Login com Google), foto de perfil e telefone/WhatsApp, usados para
              autenticação, criação de loja, confirmação de reservas e contato sobre o atendimento.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">Dados de agendamento:</strong> serviço
              escolhido, profissional, data/horário e eventual comprovante/sinal PIX.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">Dados técnicos e notificações:</strong>{" "}
              assinatura Web Push (quando autorizada pelo usuário) e telemetria básica de sistema
              operacional/navegador para segurança, compatibilidade e melhoria do serviço.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            3. Prazo de Retenção dos Dados
          </h2>
          <p>
            Os dados pessoais são mantidos enquanto a conta estiver ativa para viabilizar o uso da
            plataforma e o histórico de agendamentos. Após solicitação de exclusão da conta ou da
            loja, os dados pessoais são eliminados ou anonimizados, ressalvados os registros de
            cobrança e auditoria cuja guarda seja exigida por obrigação legal ou fiscal (pelo prazo
            legal aplicável de até 5 anos).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            4. Compartilhamento com Terceiros (Operadores)
          </h2>
          <p>
            O Zelo <strong className="text-[var(--zelo-ink)]">não vende</strong> nem comercializa
            dados pessoais. O compartilhamento ocorre estritamente com provedores técnicos
            essenciais à operação:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--zelo-ink)]">Supabase (Banco de Dados e Auth):</strong>{" "}
              armazenamento seguro e autenticação.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">Cloudflare:</strong> hospedagem, rede de
              distribuição (CDN) e proteção Turnstile contra bots.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">Asaas:</strong> processamento de
              assinaturas e cobranças dos planos dos lojistas.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">Google (OAuth) e Resend:</strong> login
              seguro e envio de e-mails transacionais de confirmação.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            5. Segurança, Controle de Acesso, Backups e Incidentes
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--zelo-ink)]">Senhas e códigos com hash:</strong> o
              acesso à conta ocorre via OAuth 2.0 (Google) sem armazenamento de senha em texto
              puro, e senhas/PINs sensíveis de confirmação (como exclusão de loja) são protegidos
              com algoritmo criptográfico <strong className="text-[var(--zelo-ink)]">scrypt</strong>{" "}
              com salt aleatório e verificação em tempo constante.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">
                Isolamento entre estabelecimentos:
              </strong>{" "}
              cada loja é isolada por <code className="text-xs">loja_id</code> com Políticas de
              Segurança em Nível de Linha (Row Level Security — RLS) no PostgreSQL, impedindo que
              um estabelecimento acesse dados de outro.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">
                Proteção contra acesso indevido e backups:
              </strong>{" "}
              tráfego criptografado via HTTPS/TLS, validação de entrada no servidor, proteção
              Turnstile e limite de taxa (rate limiting) contra abusos, além de rotinas automáticas
              de backup da infraestrutura de banco de dados.
            </li>
            <li>
              <strong className="text-[var(--zelo-ink)]">
                Processo para lidar com vazamentos:
              </strong>{" "}
              em caso de incidente de segurança com risco ou dano relevante aos titulares, o Zelo
              acionará protocolo imediato de contenção, revogação de credenciais e auditoria de
              logs, comunicando os titulares afetados e a Autoridade Nacional de Proteção de Dados
              (ANPD) em prazo razoável, conforme o art. 48 da LGPD.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--zelo-ink)]">
            6. Direitos do Titular e Exclusão de Dados
          </h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade ou
            exclusão definitiva dos seus dados a qualquer momento enviando um e-mail para{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-[var(--zelo-ink)] underline"
            >
              {SUPPORT_EMAIL}
            </a>
            . As solicitações são respondidas em até 5 (cinco) dias úteis.
          </p>
        </section>
      </div>
    </main>
  );
}
