"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useViewerPerfil } from "@/lib/supabase/use-viewer-perfil";

export function ExplorarHeaderAvatar({ onSelectPerfil }: { onSelectPerfil?: () => void }) {
  const { viewer } = useViewerPerfil();

  if (!viewer) {
    return (
      <Link
        href="/entrar?next=/explorar"
        aria-label="Entrar ou acessar conta"
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--zelo-soft)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
          <User className="h-4 w-4" />
        </span>
      </Link>
    );
  }

  const initial = viewer.nome.trim()[0]?.toUpperCase() || "Z";
  const avatarContent = viewer.avatar_url ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={viewer.avatar_url}
      alt={viewer.nome}
      className="h-8 w-8 rounded-full object-cover shadow-xs"
    />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-xs font-bold text-[var(--zelo-btn-ink)]">
      {initial}
    </span>
  );

  if (onSelectPerfil) {
    return (
      <button
        type="button"
        onClick={onSelectPerfil}
        aria-label="Abrir meu perfil"
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--zelo-soft)]"
      >
        {avatarContent}
      </button>
    );
  }

  return (
    <Link
      href="/explorar?tab=perfil"
      aria-label="Abrir meu perfil"
      className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--zelo-soft)]"
    >
      {avatarContent}
    </Link>
  );
}
