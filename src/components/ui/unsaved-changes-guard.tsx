"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Save, Trash2, X } from "lucide-react";

interface UnsavedChangesGuardProps {
  isDirty: boolean;
  isSaving?: boolean;
  onSave: () => Promise<boolean>;
}

/**
 * Intercepta saída da página (links internos do Next.js e fechamento de aba)
 * quando há alterações não salvas, exibindo modal com "Descartar" e "Salvar e sair".
 */
export function UnsavedChangesGuard({
  isDirty,
  isSaving = false,
  onSave,
}: UnsavedChangesGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [savingAndLeaving, setSavingAndLeaving] = useState(false);
  const allowBypassRef = useRef(false);

  // 1. Alerta nativo do navegador ao fechar aba ou recarregar
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (allowBypassRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 2. Intercepta cliques em <Link> / <a href="..."> internos na fase capture
  useEffect(() => {
    if (!isDirty) return;

    function handleDocumentClick(e: MouseEvent) {
      if (allowBypassRef.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
        return;
      }

      let destUrl: URL;
      try {
        destUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (destUrl.origin !== window.location.origin) return;
      const destPath = `${destUrl.pathname}${destUrl.search}${destUrl.hash}`;
      const currentPath = `${pathname}${window.location.search}`;
      if (destPath === currentPath || destUrl.pathname === pathname) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(destPath);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isDirty, pathname]);

  if (!pendingHref) return null;

  const busy = isSaving || savingAndLeaving;

  function handleDiscard() {
    const dest = pendingHref;
    if (!dest) return;
    allowBypassRef.current = true;
    setPendingHref(null);
    router.push(dest);
  }

  async function handleSaveAndLeave() {
    const dest = pendingHref;
    if (!dest || busy) return;
    setSavingAndLeaving(true);
    try {
      const ok = await onSave();
      if (ok) {
        allowBypassRef.current = true;
        setPendingHref(null);
        router.push(dest);
      } else {
        setPendingHref(null);
      }
    } finally {
      setSavingAndLeaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px] zelo-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) setPendingHref(null);
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-[var(--zelo-card)] p-5 shadow-xl space-y-4 zelo-pop-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="unsaved-modal-title" className="text-base font-bold tight-heading text-[var(--zelo-ink)]">
                Alterações não salvas
              </h2>
              <p className="text-xs text-[var(--zelo-muted)]">
                Você modificou dados nesta tela.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPendingHref(null)}
            aria-label="Continuar editando"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--zelo-muted)] hover:bg-[var(--zelo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
          Deseja salvar suas alterações antes de sair ou descartar o que foi editado?
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveAndLeave}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-sm font-semibold text-[var(--zelo-btn-ink)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Salvar e sair</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleDiscard}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-rose-500/12 px-4 text-sm font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            <span>Descartar alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
