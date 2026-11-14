"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { verifySuperAdminPinAction } from "@/app/super-admin/actions";

export function SuperAdminPinGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifySuperAdminPinAction({ pin });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="min-h-dvh bg-[#F7F6F3] text-[#1C1B1B] dark:bg-[#0D0E12] dark:text-[#F4F3F0] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#17181C] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[#FF5A1F]/12 text-[#FF5A1F] flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold">PIN do Fundador</h1>
            <p className="text-xs text-[#605E58] dark:text-[#9CA3AF]">
              Confirme o PIN de segurança para abrir a Torre de Controle.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="super-admin-pin"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#605E58] dark:text-[#9CA3AF]"
          >
            PIN de acesso
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-[#F7F6F3] dark:bg-white/6 px-3.5 h-12">
            <KeyRound className="h-4 w-4 text-[#605E58] dark:text-[#9CA3AF] shrink-0" />
            <input
              id="super-admin-pin"
              type="password"
              inputMode="numeric"
              autoFocus
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Digite o PIN do .env"
              className="w-full bg-transparent text-sm font-mono-num outline-none"
            />
          </div>
          {error && (
            <p className="text-xs font-medium text-rose-500">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || pin.trim().length < 4}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111216] dark:bg-[#FF5A1F] text-white text-xs font-bold hover:opacity-95 disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{isPending ? "Verificando..." : "Desbloquear Super Admin"}</span>
        </button>
      </form>
    </div>
  );
}
