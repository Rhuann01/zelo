"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving: boolean;
}

const TOAST_EVENT = "zelo:toast";

export function showToast(message: string, variant: ToastVariant = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message,
        variant,
      },
    })
  );
}

export function ZeloToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleEvent(e: Event) {
      const custom = e as CustomEvent<{ id: number; message: string; variant: ToastVariant }>;
      const { id, message, variant } = custom.detail;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant, leaving: false }]);

      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      }, 3200);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3550);
    }

    window.addEventListener(TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleEvent);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = entered && !toast.leaving;

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-[440px] items-start gap-2.5 rounded-2xl bg-[var(--zelo-card)] px-3.5 py-3 text-[var(--zelo-ink)] shadow-lg ring-1 ring-black/8 transition-all duration-300 ease-out dark:ring-white/10 ${
        visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-95 opacity-0"
      }`}
    >
      {toast.variant === "success" && (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
      )}
      {toast.variant === "error" && (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      )}
      {toast.variant === "info" && (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
      )}
      <p className="min-w-0 flex-1 break-words text-xs font-medium leading-relaxed">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar notificação"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[var(--zelo-muted)] transition-colors hover:bg-[var(--zelo-soft)] hover:text-[var(--zelo-ink)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
