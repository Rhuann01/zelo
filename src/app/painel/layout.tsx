import { getPainelContext } from "@/lib/painel/get-painel-context";
import { PainelShell } from "@/components/painel-shell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPainelContext("/painel");

  return (
    <PainelShell
      lojas={ctx.lojas}
      lojaAtual={ctx.lojaAtual}
      isOwner={ctx.isOwner}
      avatarUrl={ctx.perfil.avatar_url}
      perfilNome={ctx.perfil.nome}
    >
      {children}
    </PainelShell>
  );
}
