"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Loader2, Terminal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/zelo-toast";

export function GoogleAuthButton({
  nextPath = "/painel",
  showDevLogin = false,
}: {
  nextPath?: string;
  showDevLogin?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/Instagram|FBAN|FBAV|BytedanceWebview|TikTok|Line\//i.test(ua)) {
      setIsInAppBrowser(true);
    }
  }, []);

  async function handleCopyLoginLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copiado! Cole no Safari ou Chrome para entrar em 1 toque.", "info", "copy");
    } catch {
      showToast("Não foi possível copiar o link.", "error");
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        showToast(oauthError.message, "error", "shield");
        setLoading(false);
      }
    } catch {
      const msg = "Não foi possível iniciar o login com Google.";
      setError(msg);
      showToast(msg, "error", "shield");
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    setDevLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev-login", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error ?? "Erro no login dev local.";
        setError(msg);
        showToast(msg, "error");
        setDevLoading(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      const msg = "Não foi possível conectar ao login dev local.";
      setError(msg);
      showToast(msg, "error");
      setDevLoading(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {isInAppBrowser && (
        <div className="rounded-xl bg-amber-500/10 p-3 text-xs space-y-2 text-[var(--zelo-ink)]">
          <div className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Você abriu pelo navegador interno do aplicativo (Instagram/TikTok), onde sua conta Google não fica salva. Para entrar em 1 toque, toque nos <strong>3 pontinhos (•••)</strong> acima e escolha <strong>Abrir no navegador</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLoginLink}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--zelo-card)] text-xs font-semibold shadow-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copiar link para abrir no Safari / Chrome</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[var(--zelo-card)] px-4 text-sm font-semibold text-[var(--zelo-ink)] shadow-xs ring-1 ring-[var(--zelo-border)] transition hover:bg-[var(--zelo-soft)] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span>{loading ? "Conectando..." : "Continuar com Google"}</span>
      </button>
      {showDevLogin && (
        <button
          type="button"
          onClick={handleDevLogin}
          disabled={devLoading}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] px-4 text-xs font-semibold text-[var(--zelo-ink)] transition hover:opacity-85 disabled:opacity-60"
        >
          {devLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Terminal className="h-3.5 w-3.5 text-[#FF5A1F]" />
          )}
          <span>{devLoading ? "Entrando..." : "Entrar em Modo Dev Local"}</span>
        </button>
      )}
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
