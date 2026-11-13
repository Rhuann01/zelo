import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, LogOut, Plus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ZeloLogo } from "@/components/zelo-logo";
import { AvatarUploader } from "@/components/avatar-uploader";

async function signOutAction() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?next=/painel");
  }

  const [{ data: perfil }, { data: lojas }] = await Promise.all([
    supabase
      .from("perfis")
      .select("nome, email, avatar_url, avatar_customizado")
      .eq("id", user.id)
      .single(),
    supabase
      .from("lojas")
      .select("id, nome, slug, nicho, tema, plano")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!lojas || lojas.length === 0) {
    redirect("/onboarding");
  }

  const lojaAtual = lojas[0];

  return (
    <main className="min-h-screen bg-[var(--zelo-bg)] pb-12">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-[var(--zelo-card)]/90 px-4 backdrop-blur-md">
        <ZeloLogo size="sm" />
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-medium text-[var(--zelo-muted)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </form>
      </header>

      <div className="mx-auto max-w-[420px] px-4 pt-5 space-y-4">
        <section className="rounded-2xl bg-[var(--zelo-card)] p-4">
          <AvatarUploader
            userId={user.id}
            initialUrl={perfil?.avatar_url ?? null}
            isCustom={perfil?.avatar_customizado ?? false}
            displayName={perfil?.nome || user.email || "Usuário Zelo"}
          />
        </section>

        <section className="rounded-2xl bg-[var(--zelo-card)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
                <Store className="h-3.5 w-3.5 text-[#F59E0B]" />
                Sua Loja Ativa
              </span>
              <h1 className="text-lg font-bold tight-heading">{lojaAtual.nome}</h1>
              <p className="font-mono-num text-xs text-[var(--zelo-muted)]">
                zelo.app/{lojaAtual.slug}
              </p>
            </div>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-1 text-[11px] font-semibold text-[#10B981]">
              {lojaAtual.plano.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-xl bg-[var(--zelo-soft)] p-3">
              <p className="text-[11px] text-[var(--zelo-muted)]">Nicho</p>
              <p className="text-sm font-bold capitalize">{lojaAtual.nicho}</p>
            </div>
            <div className="rounded-xl bg-[var(--zelo-soft)] p-3">
              <p className="text-[11px] text-[var(--zelo-muted)]">Tema</p>
              <p className="text-sm font-bold capitalize">{lojaAtual.tema}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--zelo-soft)] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-[var(--zelo-ink)]" />
            <div>
              <p className="text-sm font-bold">Fundação Etapa 1 pronta</p>
              <p className="text-xs text-[var(--zelo-muted)]">
                Na Etapa 2 liberaremos Serviços, Horários e Customizador.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
            title="Criar outra loja"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}
