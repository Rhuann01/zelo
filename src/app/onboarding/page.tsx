import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?next=/onboarding");
  }

  const { count } = await supabase
    .from("lojas")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= 3) {
    return (
      <div className="min-h-dvh bg-[var(--zelo-bg)] text-[var(--zelo-ink)] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[420px] rounded-3xl bg-[var(--zelo-card)] p-6 shadow-sm space-y-4 text-center">
          <h1 className="text-lg font-extrabold tight-heading">
            Limite de 3 lojas atingido
          </h1>
          <p className="text-sm text-[var(--zelo-muted)]">
            Cada conta pode gerenciar até 3 lojas próprias no Zelo. Para criar uma nova, utilize outra conta ou gerencie suas lojas atuais no painel.
          </p>
          <Link
            href="/painel"
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)]"
          >
            Voltar para o Painel
          </Link>
        </div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
