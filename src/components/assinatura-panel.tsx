"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge, SurfaceCard } from "@/components/ui";
import {
  aplicarCodigoIndicacaoAction,
  iniciarAssinaturaAsaasAction,
} from "@/app/painel/assinatura/actions";

interface AssinaturaPanelProps {
  lojaId: string;
  lojaNome: string;
  planoAtual: "trial" | "solo" | "estudio";
  assinaturaStatus: "trial" | "ativa" | "atrasada" | "cancelada";
  trialAte: string;
  codigoIndicacao: string;
  jaIndicado: boolean;
  isOwner: boolean;
}

export function AssinaturaPanel({
  lojaId,
  planoAtual,
  assinaturaStatus,
  trialAte,
  codigoIndicacao,
  jaIndicado,
  isOwner,
}: AssinaturaPanelProps) {
  const [planoEscolhido, setPlanoEscolhido] = useState<"solo" | "estudio">(
    planoAtual === "estudio" ? "estudio" : "solo"
  );
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const diasRestantes = Math.max(
    0,
    Math.ceil((Date.parse(trialAte) - Date.now()) / 86_400_000)
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codigoIndicacao);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAssinar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await iniciarAssinaturaAsaasAction({
        lojaId,
        plano: planoEscolhido,
        billingType,
        cpfCnpj,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setPaymentLink(res.paymentLink ?? null);
        setFeedback(
          "Assinatura criada no Asaas! Assim que o pagamento confirmar, seu acesso é liberado automaticamente."
        );
      }
    });
  };

  const handleAplicarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await aplicarCodigoIndicacaoAction({
        lojaId,
        codigo: codigoInput,
      });
      if (res.error) setError(res.error);
      else setFeedback("Código de indicação aplicado! Ao ativar a assinatura, quem indicou ganha +30 dias.");
    });
  };

  const statusTone =
    assinaturaStatus === "ativa"
      ? "emerald"
      : assinaturaStatus === "trial"
        ? "amber"
        : "rose";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold tight-heading">Assinatura & Indicação</h1>
        <p className="text-xs text-[var(--zelo-muted)]">
          Gerencie seu plano Zelo via Asaas e ganhe 1 mês grátis indicando outros espaços.
        </p>
      </div>

      {error && (
        <SurfaceCard tone="rose" padding="sm" className="text-xs font-medium">
          {error}
        </SurfaceCard>
      )}
      {feedback && (
        <SurfaceCard tone="emerald" padding="sm" className="text-xs font-medium space-y-2">
          <p>{feedback}</p>
          {paymentLink && (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold underline"
            >
              <span>Abrir fatura Asaas</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </SurfaceCard>
      )}

      {/* Status atual */}
      <SurfaceCard tone="card" padding="md" className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]">
            Status do Plano
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base font-bold capitalize">
              {planoAtual === "trial" ? "Teste Grátis (14 dias)" : `Plano ${planoAtual}`}
            </span>
            <StatusBadge tone={statusTone} dot>
              {assinaturaStatus}
            </StatusBadge>
          </div>
          {assinaturaStatus === "trial" && (
            <p className="mt-1 text-xs font-mono-num text-[var(--zelo-muted)]">
              {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
            </p>
          )}
        </div>
        <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
      </SurfaceCard>

      {/* Escolha de plano e Checkout Asaas */}
      {isOwner && (
        <SurfaceCard tone="card" padding="md" className="space-y-4">
          <h2 className="text-sm font-bold">Escolher Plano Mensal</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(
              [
                {
                  id: "solo",
                  nome: "Plano Solo",
                  preco: "R$ 29/mês",
                  desc: "1 profissional, agenda e vitrine",
                },
                {
                  id: "estudio",
                  nome: "Plano Estúdio",
                  preco: "R$ 59/mês",
                  desc: "Equipe completa, comissões e push",
                },
              ] as const
            ).map((p) => {
              const selected = planoEscolhido === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanoEscolhido(p.id)}
                  className={`p-3.5 rounded-xl text-left transition-all ${
                    selected
                      ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                      : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{p.nome}</span>
                    <span className="font-mono-num text-xs font-semibold">{p.preco}</span>
                  </div>
                  <p className={`mt-1 text-xs ${selected ? "opacity-80" : "text-[var(--zelo-muted)]"}`}>
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleAssinar} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "PIX", label: "PIX" },
                  { id: "CREDIT_CARD", label: "Cartão" },
                  { id: "BOLETO", label: "Boleto" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setBillingType(m.id)}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                    billingType === m.id
                      ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                      : "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              required
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="CPF ou CNPJ do responsável"
              className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm font-mono-num outline-none"
            />

            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              <span>Assinar via Asaas</span>
            </button>
          </form>
        </SurfaceCard>
      )}

      {/* Programa de Indicação */}
      <SurfaceCard tone="card" padding="md" className="space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold">Indique e Ganhe 1 Mês Grátis</h2>
        </div>
        <p className="text-xs text-[var(--zelo-muted)]">
          Compartilhe seu código com outro profissional. No 1º pagamento confirmado dele no Asaas, você ganha +30 dias automáticos.
        </p>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2.5">
          <span className="font-mono-num text-sm font-bold">{codigoIndicacao}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--zelo-card)] px-3 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar código</span>
              </>
            )}
          </button>
        </div>

        {isOwner && !jaIndicado && (
          <form onSubmit={handleAplicarCodigo} className="flex gap-2 pt-1">
            <input
              type="text"
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value)}
              placeholder="Recebeu um código de indicação?"
              className="h-11 min-w-0 flex-1 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-mono-num outline-none"
            />
            <button
              type="submit"
              disabled={isPending || codigoInput.trim().length < 4}
              className="min-h-[44px] rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-50"
            >
              Aplicar
            </button>
          </form>
        )}
      </SurfaceCard>
    </div>
  );
}
