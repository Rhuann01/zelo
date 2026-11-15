import "server-only";

export interface TurnstileVerifyResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "Verificação anti-robô indisponível no momento.",
      };
    }
    return { ok: true, skipped: true };
  }

  if (!token || token.trim().length < 10) {
    return {
      ok: false,
      error: "Confirme a verificação anti-robô antes de concluir o agendamento.",
    };
  }

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token.trim());
    if (remoteIp && remoteIp !== "unknown") {
      form.set("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        error: "Não foi possível validar a verificação anti-robô. Tente novamente.",
      };
    }

    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return {
        ok: false,
        error: "Verificação anti-robô expirada ou inválida. Tente novamente.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Falha ao conectar com a verificação anti-robô.",
    };
  }
}
