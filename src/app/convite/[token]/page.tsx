import { createClient } from "@/lib/supabase/server";
import { tokenConviteSchema } from "@/lib/schemas/painel";
import {
  ConviteEquipeCard,
  type ConvitePreview,
  type ConviteUsuarioLogado,
} from "@/components/convite-equipe-card";

export const dynamic = "force-dynamic";

export default async function ConviteEquipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = tokenConviteSchema.safeParse({ token });

  let preview: ConvitePreview = { valido: false, motivo: "invalid_token" };
  let usuario: ConviteUsuarioLogado | null = null;

  if (parsed.success) {
    const supabase = await createClient();
    const [{ data: previewData }, { data: authData }] = await Promise.all([
      supabase.rpc("obter_convite_equipe_preview", { p_token: parsed.data.token }),
      supabase.auth.getUser(),
    ]);

    if (previewData && typeof previewData === "object") {
      preview = previewData as ConvitePreview;
    } else {
      preview = { valido: false, motivo: "not_found" };
    }

    if (authData.user) {
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome, avatar_url")
        .eq("id", authData.user.id)
        .maybeSingle();

      usuario = {
        nome: perfil?.nome || authData.user.user_metadata?.full_name || "Profissional",
        email: authData.user.email ?? "",
        avatar_url: perfil?.avatar_url ?? null,
      };
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--zelo-bg)] text-[var(--zelo-ink)] flex flex-col items-center justify-center px-4 py-10">
      <ConviteEquipeCard token={token} preview={preview} usuario={usuario} />
    </div>
  );
}
