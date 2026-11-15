"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Copy,
  CreditCard,
  Info,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";
export type ToastIcon =
  | "auto"
  | "bell"
  | "shield"
  | "credit-card"
  | "store"
  | "sparkles"
  | "copy"
  | "phone";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  icon: ToastIcon;
  leaving: boolean;
}

const TOAST_EVENT = "zelo:toast";

export function showToast(
  message: string,
  variant: ToastVariant = "success",
  icon: ToastIcon = "auto"
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message,
        variant,
        icon,
      },
    })
  );
}

export function ZeloToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleEvent(e: Event) {
      const custom = e as CustomEvent<{
        id: number;
        message: string;
        variant: ToastVariant;
        icon?: ToastIcon;
      }>;
      const { id, message, variant, icon = "auto" } = custom.detail;
      setToasts((prev) => [
        ...prev.slice(-2),
        { id, message, variant, icon, leaving: false },
      ]);

      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      }, 3400);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3750);
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
      className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function renderToastIcon(variant: ToastVariant, icon: ToastIcon) {
  const colorClass =
    variant === "success"
      ? "text-[#10B981]"
      : variant === "error"
        ? "text-rose-500"
        : variant === "warning"
          ? "text-[#FF5A1F]"
          : "text-amber-500";

  const cls = `mt-0.5 h-4 w-4 shrink-0 ${colorClass}`;

  switch (icon) {
    case "bell":
      return <Bell className={cls} />;
    case "shield":
      return <ShieldCheck className={cls} />;
    case "credit-card":
      return <CreditCard className={cls} />;
    case "store":
      return <Store className={cls} />;
    case "sparkles":
      return <Sparkles className={cls} />;
    case "copy":
      return <Copy className={cls} />;
    case "phone":
      return <Phone className={cls} />;
    default:
      if (variant === "success") return <CheckCircle2 className={cls} />;
      if (variant === "error") return <AlertCircle className={cls} />;
      if (variant === "warning") return <AlertTriangle className={cls} />;
      return <Info className={cls} />;
  }
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
      {renderToastIcon(toast.variant, toast.icon)}
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
