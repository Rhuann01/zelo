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
  has_loja: boolean;
}

const STORAGE_KEY = "zelo_viewer_perfil_v1";
const CACHE_TTL_MS = 30_000;

let memoryCache: { data: ViewerPerfil | null; fetchedAt: number } | null = null;
let inflightPromise: Promise<ViewerPerfil | null> | null = null;
const listeners = new Set<(data: ViewerPerfil | null) => void>();

function readSessionCache(): ViewerPerfil | null {
  if (memoryCache) return memoryCache.data;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: ViewerPerfil | null; fetchedAt: number };
    memoryCache = parsed;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: ViewerPerfil | null) {
  const entry = { data, fetchedAt: Date.now() };
  memoryCache = entry;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore storage errors
    }
  }
  for (const listener of listeners) {
    listener(data);
  }
}

async function fetchViewerPerfil(force = false): Promise<ViewerPerfil | null> {
  if (!force && memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.data;
  }
  if (!force && inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      writeCache(null);
      return null;
    }

    const [{ data: perfil }, { data: lojaPropria }, { data: profVinculo }] = await Promise.all([
      supabase
        .from("perfis")
        .select(
          "nome, email, whatsapp, avatar_url, avatar_customizado, notificacoes_push, notificacoes_email"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("lojas").select("id").eq("owner_id", user.id).limit(1).maybeSingle(),
      supabase
        .from("profissionais")
        .select("id")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle(),
    ]);

    const resolvedAvatar = perfil?.avatar_customizado
      ? (perfil.avatar_url ?? null)
      : perfil?.avatar_url ||
        (user.user_metadata?.avatar_url as string) ||
        (user.user_metadata?.picture as string) ||
        null;

    const next: ViewerPerfil = {
      id: user.id,
      nome: perfil?.nome || (user.user_metadata?.full_name as string) || user.email || "Perfil",
      email: perfil?.email || user.email || "",
      whatsapp: perfil?.whatsapp || "",
      avatar_url: resolvedAvatar,
      avatar_customizado: perfil?.avatar_customizado ?? false,
      notificacoes_push: perfil?.notificacoes_push ?? true,
      notificacoes_email: perfil?.notificacoes_email ?? true,
      has_loja: Boolean(lojaPropria || profVinculo),
    };

    writeCache(next);
    return next;
  })().finally(() => {
    inflightPromise = null;
  });

  return inflightPromise;
}

/**
 * Lê sessão e perfil com cache em memória + sessionStorage (stale-while-revalidate)
 * para evitar flash visual e requisições duplicadas ao navegar entre telas.
 */
export function useViewerPerfil() {
  const [viewer, setViewer] = useState<ViewerPerfil | null>(() =>
    typeof window !== "undefined" ? (memoryCache?.data ?? null) : null
  );
  const [loaded, setLoaded] = useState<boolean>(() =>
    typeof window !== "undefined" ? memoryCache !== null : false
  );

  const refreshViewer = useCallback(async () => {
    await fetchViewerPerfil(true);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const onUpdate = (data: ViewerPerfil | null) => {
      setViewer(data);
      setLoaded(true);
    };
    listeners.add(onUpdate);

    if (!memoryCache) {
      const sessionData = readSessionCache();
      if (memoryCache) {
        setViewer(sessionData);
        setLoaded(true);
      }
    }

    void fetchViewerPerfil(false).then(() => {
      setLoaded(true);
    });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        writeCache(null);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void fetchViewerPerfil(true);
      }
    });

    return () => {
      listeners.delete(onUpdate);
      subscription.unsubscribe();
    };
  }, []);

  return { viewer, loaded, refreshViewer };
}
