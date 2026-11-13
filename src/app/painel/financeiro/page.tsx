import { Wallet } from "lucide-react";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";

export default async function FinanceiroPage() {
  const ctx = await getPainelContext("/painel/financeiro");

  return (
    <PainelShell lojas={ctx.lojas} lojaAtual={ctx.lojaAtual} isOwner={ctx.isOwner}>
      <section className="rounded-2xl bg-[var(--zelo-card)] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#10B981]" />
            <h1 className="text-lg font-bold tight-heading">Dashboard de Ganhos</h1>
          </div>
          <span className="rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#D97706]">
            Etapa 5
          </span>
        </div>
        <p className="text-sm text-[var(--zelo-muted)] leading-relaxed">
          Aqui ficarão as visões <strong>Meu Bolso</strong> (para profissionais) e{" "}
          <strong>Caixa da Casa & Fechamento da Equipe</strong> (para donos) assim que os agendamentos concluídos forem ativados na Etapa 5.
        </p>
      </section>
    </PainelShell>
  );
}
