"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Loader2, Store, User, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelarOuRemarcarAction } from "@/app/[slug]/actions";
import { showToast } from "@/components/zelo-toast";
import type { ViewerPerfil } from "@/lib/supabase/use-viewer-perfil";

interface ClienteAgendamento {
  id: string;
  inicio: string;
  fim: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado" | "no_show";
  total_centavos: number;
  loja: { nome: string; slug: string } | null;
  profissional: { nome: string } | null;
}

const STATUS_STYLE: Record<ClienteAgendamento["status"], { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "bg-[#10B981]/15 text-[#10B981]" },
  pendente: { label: "Pendente", cls: "bg-[#F59E0B]/15 text-[#F59E0B]" },
  concluido: { label: "Concluído", cls: "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]" },
  cancelado: { label: "Cancelado", cls: "bg-red-500/15 text-red-500" },
  no_show: { label: "Não compareceu", cls: "bg-red-500/15 text-red-500" },
};

function formatDataHora(iso: string) {
  const d = new Date(iso);
  return {
    data: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const agendamentosCache = new Map<string, { items: ClienteAgendamento[]; fetchedAt: number }>();
const AGENDAMENTOS_TTL_MS = 30_000;

export function ExplorarMeusHorarios({
  viewer,
  loaded,
  onGoExplorar,
}: {
  viewer: ViewerPerfil | null;
  loaded: boolean;
  onGoExplorar: () => void;
}) {
  const cached = viewer ? agendamentosCache.get(viewer.id) : undefined;
  const [items, setItems] = useState<ClienteAgendamento[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(() => Boolean(viewer && !cached));
  const [isPending, startTransition] = useTransition();

  function handleCancelar(agId: string) {
    if (!viewer) return;
    startTransition(async () => {
      const res = await cancelarOuRemarcarAction({
        agendamento_id: agId,
        acao: "cancelar",
      });
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      setItems((prev) => {
        const next = prev.map((a) => (a.id === agId ? { ...a, status: "cancelado" as const } : a));
        agendamentosCache.set(viewer.id, { items: next, fetchedAt: Date.now() });
        return next;
      });
      showToast("Horário cancelado. A vaga foi liberada.", "success");
    });
  }

  useEffect(() => {
    if (!viewer) return;
    const entry = agendamentosCache.get(viewer.id);
    if (entry) {
      setItems(entry.items);
      setLoading(false);
      if (Date.now() - entry.fetchedAt < AGENDAMENTOS_TTL_MS) {
        return;
      }
    } else {
      setLoading(true);
    }

    let active = true;
    const supabase = createClient();
    supabase
      .from("agendamentos")
      .select("id, inicio, fim, status, total_centavos, loja:lojas(nome, slug), profissional:profissionais(nome)")
      .eq("cliente_id", viewer.id)
      .order("inicio", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!active) return;
        const normalized = (data ?? []).map((row) => ({
          id: row.id as string,
          inicio: row.inicio as string,
          fim: row.fim as string,
          status: row.status as ClienteAgendamento["status"],
          total_centavos: Number(row.total_centavos ?? 0),
          loja: Array.isArray(row.loja) ? (row.loja[0] ?? null) : (row.loja ?? null),
          profissional: Array.isArray(row.profissional)
            ? (row.profissional[0] ?? null)
            : (row.profissional ?? null),
        }));
        agendamentosCache.set(viewer.id, { items: normalized, fetchedAt: Date.now() });
        setItems(normalized);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [viewer]);

  if (!loaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--zelo-card)] p-10 text-center shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--zelo-muted)]" />
        <p className="text-xs text-[var(--zelo-muted)]">Carregando seus horários...</p>
      </div>
    );
  }

  if (!viewer) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--zelo-card)] p-8 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
          <Calendar className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--zelo-ink)]">
            Entre para ver seus horários
          </p>
          <p className="mt-1 text-xs text-[var(--zelo-muted)]">
            Acompanhe seus agendamentos confirmados, datas e profissionais.
          </p>
        </div>
        <Link
          href="/entrar?next=/explorar"
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-5 text-xs font-semibold text-[var(--zelo-btn-ink)]"
        >
          <span>Entrar com Google</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--zelo-card)] p-8 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
          <Calendar className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--zelo-ink)]">
            Você ainda não marcou nenhum horário
          </p>
          <p className="mt-1 text-xs text-[var(--zelo-muted)]">
            Escolha um estabelecimento na vitrine para reservar em segundos.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoExplorar}
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-5 text-xs font-semibold text-[var(--zelo-btn-ink)]"
        >
          <span>Explorar estabelecimentos</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((ag) => {
        const badge = STATUS_STYLE[ag.status] ?? STATUS_STYLE.confirmado;
        const { data, hora } = formatDataHora(ag.inicio);
        return (
          <div
            key={ag.id}
            className="flex flex-col gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-[var(--zelo-ink)]">
                  <Store className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-[var(--zelo-ink)]">
                    {ag.loja?.nome ?? "Estabelecimento"}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--zelo-muted)]">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>{ag.profissional?.nome ?? "Profissional"}</span>
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-mono-num text-[11px] font-medium ${badge.cls}`}
              >
                {badge.label}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-3 font-mono-num text-xs text-[var(--zelo-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {data}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {hora}
                </span>
                <span className="font-semibold text-[var(--zelo-ink)]">
                  {formatBRL(ag.total_centavos)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(ag.status === "pendente" || ag.status === "confirmado") && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleCancelar(ag.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-red-500/10 px-2.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancelar</span>
                  </button>
                )}
                {ag.loja?.slug && (
                  <Link
                    href={`/${ag.loja.slug}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
                  >
                    <span>Ver loja</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
