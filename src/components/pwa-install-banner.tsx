"use client";

import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "zelo_pwa_banner_dismissed_v1";

function StepImage({ src, alt }: { src: string; alt: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setMissing(true)}
      className="mt-2 w-full rounded-xl object-cover"
    />
  );
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [androidFallbackOpen, setAndroidFallbackOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore storage errors
    }

    const ua = window.navigator.userAgent || "";
    const iosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const androidDevice = /Android/i.test(ua);

    if (iosDevice) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Mesmo que o Android ainda não tenha disparado beforeinstallprompt, exibe a barra
    if (androidDevice) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  function dismissBanner() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage errors
    }
  }

  async function handleAction() {
    if (isIos) {
      setIosGuideOpen(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        dismissBanner();
      }
      return;
    }

    setAndroidFallbackOpen((prev) => !prev);
  }

  if (!visible) return null;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2.5 rounded-2xl bg-[var(--zelo-card)] px-3.5 py-2.5 shadow-sm">
        <button
          type="button"
          onClick={handleAction}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-[var(--zelo-ink)]">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[var(--zelo-ink)]">
              {isIos ? "Adicionar Zelo na Tela Inicial" : "Instalar atalho do Zelo"}
            </p>
            <p className="truncate text-[11px] text-[var(--zelo-muted)]">
              {isIos
                ? "Toque para ver o passo a passo no iPhone"
                : "Acesso rápido e alertas direto no celular"}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleAction}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isIos ? "Ver como" : "Instalar"}</span>
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Fechar aviso de instalação"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--zelo-muted)] hover:bg-[var(--zelo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {androidFallbackOpen && !isIos && (
        <div className="mb-3 rounded-2xl bg-[var(--zelo-soft)] px-3.5 py-2.5 text-xs text-[var(--zelo-ink)]">
          Toque no menu <strong>⋮</strong> do navegador no canto superior direito e escolha{" "}
          <strong>Adicionar à tela inicial</strong> ou <strong>Instalar aplicativo</strong>.
        </div>
      )}

      {iosGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center"
          onClick={() => setIosGuideOpen(false)}
        >
          <div
            className="w-full max-w-[440px] max-h-[85dvh] overflow-y-auto rounded-3xl bg-[var(--zelo-card)] p-5 text-[var(--zelo-ink)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Adicionar Zelo no iPhone</h3>
              <button
                type="button"
                onClick={() => setIosGuideOpen(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--zelo-soft)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs text-[var(--zelo-muted)]">
              No Safari do iPhone, siga os passos abaixo para instalar o atalho e liberar notificações:
            </p>

            <div className="space-y-3">
              <div className="rounded-2xl bg-[var(--zelo-soft)] p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-btn-bg)] text-xs font-bold text-[var(--zelo-btn-ink)]">
                    1
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Share className="h-4 w-4 shrink-0" />
                    <span>Toque no ícone Compartilhar na barra do Safari</span>
                  </div>
                </div>
                <StepImage
                  src="/ios-install-1.png"
                  alt="Passo 1: botão Compartilhar no Safari do iPhone"
                />
              </div>

              <div className="rounded-2xl bg-[var(--zelo-soft)] p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-btn-bg)] text-xs font-bold text-[var(--zelo-btn-ink)]">
                    2
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <PlusSquare className="h-4 w-4 shrink-0" />
                    <span>Role e toque em &quot;Adicionar à Tela de Início&quot;</span>
                  </div>
                </div>
                <StepImage
                  src="/ios-install-2.png"
                  alt="Passo 2: Adicionar à Tela de Início no iPhone"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIosGuideOpen(false)}
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)]"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
