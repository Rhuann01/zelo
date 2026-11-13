"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ViewerPerfil {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  avatar_url: string | null;
  avatar_customizado: boolean;
  notificacoes_push: boolean;
  notificacoes_email: boolean;
}

/**
 * Lê sessão e perfil completo do usuário no navegador sem quebrar ISR de páginas públicas.
 */
export function useViewerPerfil() {
  const [viewer, setViewer] = useState<ViewerPerfil | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setViewer(null);
      setLoaded(true);
      return;
    }

    const { data: perfil } = await supabase
      .from("perfis")
      .select(
        "nome, email, whatsapp, avatar_url, avatar_customizado, notificacoes_push, notificacoes_email"
      )
      .eq("id", user.id)
      .maybeSingle();

    setViewer({
      id: user.id,
      nome: perfil?.nome || (user.user_metadata?.full_name as string) || user.email || "Perfil",
      email: perfil?.email || user.email || "",
      whatsapp: perfil?.whatsapp || "",
      avatar_url:
        perfil?.avatar_url ||
        (user.user_metadata?.avatar_url as string) ||
        (user.user_metadata?.picture as string) ||
        null,
      avatar_customizado: perfil?.avatar_customizado ?? false,
      notificacoes_push: perfil?.notificacoes_push ?? true,
      notificacoes_email: perfil?.notificacoes_email ?? true,
    });
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { viewer, loaded, refreshViewer: load };
}
