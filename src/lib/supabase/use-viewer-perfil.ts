"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ViewerPerfil {
  id: string;
  nome: string;
  avatar_url: string | null;
}

/**
 * Lê sessão e perfil do usuário no navegador sem quebrar ISR de páginas públicas.
 */
export function useViewerPerfil(): ViewerPerfil | null {
  const [viewer, setViewer] = useState<ViewerPerfil | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user) return;
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      setViewer({
        id: user.id,
        nome: perfil?.nome || (user.user_metadata?.full_name as string) || user.email || "Perfil",
        avatar_url:
          perfil?.avatar_url ||
          (user.user_metadata?.avatar_url as string) ||
          (user.user_metadata?.picture as string) ||
          null,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  return viewer;
}
