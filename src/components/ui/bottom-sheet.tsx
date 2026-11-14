"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg";
  children: ReactNode;
}

const MAX_WIDTH_CLASSES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

/**
 * Bottom sheet mobile-first (modal centralizado em telas >= sm).
 * Sempre usa z-[70] para ficar acima da barra inferior fixa do app.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = "md",
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${MAX_WIDTH_CLASSES[maxWidth]} max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--zelo-card)] text-[var(--zelo-ink)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight truncate">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--zelo-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-full text-[var(--zelo-muted)] hover:bg-[var(--zelo-soft)] hover:text-[var(--zelo-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
