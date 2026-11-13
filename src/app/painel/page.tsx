import Link from "next/link";
import { Calendar, LayoutGrid, Palette, Plus, Settings, Sparkles } from "lucide-react";
import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PainelPage() {
  const ctx = await getPainelContext("/painel");

  return (
    <PainelShell lojas={ctx.lojas} lojaAtual={ctx.lojaAtual} isOwner={ctx.isOwner}>
      <div className="space-y-4">
        <Card className="py-4">
          <CardContent className="space-y-4 px-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge
                  variant="secondary"
                  className={
                    ctx.lojaAtual.pausada
                      ? "bg-[#F59E0B]/15 text-[#D97706] hover:bg-[#F59E0B]/20"
                      : "bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/20"
                  }
                >
                  {ctx.lojaAtual.pausada ? "Loja Pausada" : "Loja Ativa"}
                </Badge>
                <h1 className="mt-2 text-xl font-bold tight-heading">
                  Olá, {ctx.perfil.nome.split(" ")[0]}
                </h1>
                <p className="font-mono-num text-xs text-muted-foreground">
                  zelo.app/{ctx.lojaAtual.slug}
                </p>
              </div>
              <Badge variant="secondary" className="font-mono-num text-[11px] font-semibold">
                {ctx.lojaAtual.plano.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/painel/gestao"
                className="flex min-h-[84px] flex-col items-start justify-center gap-1.5 rounded-xl bg-secondary p-3 transition hover:opacity-90"
              >
                <LayoutGrid className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-xs font-bold">Gestão</span>
                <span className="text-[10px] text-muted-foreground">Serviços & Equipe</span>
              </Link>
              <Link
                href="/painel/personalizar"
                className="flex min-h-[84px] flex-col items-start justify-center gap-1.5 rounded-xl bg-secondary p-3 transition hover:opacity-90"
              >
                <Palette className="h-4 w-4 text-[#10B981]" />
                <span className="text-xs font-bold">Tema</span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {ctx.lojaAtual.tema}
                </span>
              </Link>
              <Link
                href="/painel/configuracoes"
                className="flex min-h-[84px] flex-col items-start justify-center gap-1.5 rounded-xl bg-secondary p-3 transition hover:opacity-90"
              >
                <Settings className="h-4 w-4 text-foreground" />
                <span className="text-xs font-bold">Perfil</span>
                <span className="text-[10px] text-muted-foreground">Foto & Conta</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="space-y-2.5 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#F59E0B]" />
                <h2 className="text-sm font-bold">Agenda Visual (Schedule-X)</h2>
              </div>
              <Badge className="bg-[#F59E0B]/15 text-[#D97706] hover:bg-[#F59E0B]/20">
                Etapa 5
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A linha do tempo interativa com encaixe manual em 3s, baixa de atendimentos e alertas Web Push entra na Etapa 5, após o motor de disponibilidade e reservas.
            </p>
          </CardContent>
        </Card>

        {ctx.isOwner && (
          <Link
            href="/onboarding"
            className="flex min-h-[68px] items-center justify-between gap-3 rounded-2xl bg-secondary p-4 transition hover:opacity-90"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-[#F59E0B]" />
              <div>
                <p className="text-sm font-bold">Criar nova unidade / loja</p>
                <p className="text-xs text-muted-foreground">
                  Gerencie múltiplas unidades no mesmo login Google
                </p>
              </div>
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </PainelShell>
  );
}
