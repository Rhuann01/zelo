"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { cancelarOuRemarcarAction } from "@/app/[slug]/actions";
import { showToast } from "@/components/zelo-toast";

export interface NotificacaoItem {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  url: string;
  lida: boolean;
  acao_tipo: string | null;
  acao_status: "pendente" | "confirmada" | "recusada" | "concluida";
  acao_payload: Record<string, unknown>;
  agendamento_id: string | null;
  loja_id: string | null;
  created_at: string;
}

function formatTempo(iso: string) {
  const diffMin = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case "adiamento":
    case "reagendamento":
      return <CalendarClock className="h-4 w-4 text-[#F59E0B]" />;
    case "cancelamento":
      return <XCircle className="h-4 w-4 text-rose-500" />;
    case "lembrete":
      return <Clock className="h-4 w-4 text-emerald-500" />;
    case "trial_expirando":
      return <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />;
    default:
      return <Sparkles className="h-4 w-4 text-[var(--zelo-ink)]" />;
  }
}

export function NotificationsSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [items, setItems] = useState<NotificacaoItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        authenticated: boolean;
        items: NotificacaoItem[];
        unreadCount: number;
      };
      setAuthenticated(json.authenticated);
      setItems(json.items ?? []);
      setUnreadCount(json.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (open) {
      setRendered(true);
      loadNotifications();
    } else {
      const t = window.setTimeout(() => setRendered(false), 260);
      return () => window.clearTimeout(t);
    }
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    setUnreadCount(0);
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcarTodas: true }),
    });
  }

  async function clearRead() {
    setItems((prev) => prev.filter((n) => !n.lida));
    await fetch("/api/notificacoes", { method: "DELETE" });
  }

  async function handleCardClick(item: NotificacaoItem) {
    if (!item.lida) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, lida: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await fetch("/api/notificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
    }
    if (item.url) {
      setOpen(false);
      router.push(item.url);
    }
  }

  async function handleInteractiveAction(
    item: NotificacaoItem,
    decision: "confirmar" | "recusar"
  ) {
    setBusyId(item.id);
    try {
      if (decision === "recusar" && item.agendamento_id) {
        const res = await cancelarOuRemarcarAction({
          agendamento_id: item.agendamento_id,
          acao: "cancelar",
        });
        if (res.error) {
          showToast(res.error, "error");
          setBusyId(null);
          return;
        }
      }

      const nextStatus = decision === "confirmar" ? "confirmada" : "recusada";
      await fetch("/api/notificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, acaoStatus: nextStatus }),
      });

      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, lida: true, acao_status: nextStatus } : n
        )
      );
      if (!item.lida) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      showToast(
        decision === "confirmar"
          ? "Novo horário confirmado!"
          : "Horário cancelado e estabelecimento avisado.",
        "success"
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir notificações e mensagens"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--zelo-soft)] text-[var(--zelo-ink)] transition-colors hover:opacity-85 active:scale-95"
      >
        <MessageSquare className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F59E0B] px-1 font-mono-num text-[9px] font-bold text-[#111111]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {rendered && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Central de notificações"
        >
          <div
            onClick={() => setOpen(false)}
            className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-250 ${
              open ? "opacity-100" : "opacity-0"
            }`}
          />

          <aside
            className={`relative z-10 flex h-full w-full max-w-[380px] flex-col bg-[var(--zelo-bg)] text-[var(--zelo-ink)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
              <div>
                <h2 className="text-base font-extrabold tracking-tight">Notificações</h2>
                <p className="text-[11px] text-[var(--zelo-muted)]">
                  Atualizações de horários e avisos
                </p>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    title="Marcar todas como lidas"
                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-[var(--zelo-soft)] px-2.5 text-[11px] font-semibold text-[var(--zelo-ink)]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Lidas</span>
                  </button>
                )}
                {items.some((i) => i.lida) && (
                  <button
                    type="button"
                    onClick={clearRead}
                    title="Limpar lidas"
                    aria-label="Limpar lidas"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-[var(--zelo-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar notificações"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--zelo-soft)] text-[var(--zelo-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-14 text-xs text-[var(--zelo-muted)] gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando notificações...</span>
                </div>
              ) : !authenticated ? (
                <div className="rounded-2xl bg-[var(--zelo-card)] p-5 text-center space-y-2">
                  <MessageSquare className="mx-auto h-6 w-6 text-[var(--zelo-muted)]" />
                  <p className="text-sm font-bold">Entre para ver suas notificações</p>
                  <p className="text-xs text-[var(--zelo-muted)]">
                    Confirmações, lembretes e avisos de reagendamento ficam salvos aqui.
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl bg-[var(--zelo-card)] p-6 text-center space-y-1.5">
                  <MessageSquare className="mx-auto h-6 w-6 text-[var(--zelo-muted)]" />
                  <p className="text-sm font-bold">Tudo tranquilo por aqui</p>
                  <p className="text-xs text-[var(--zelo-muted)]">
                    Suas últimas notificações aparecerão aqui automaticamente.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const hasAdiamentoAction =
                    item.acao_tipo === "confirmar_adiamento" &&
                    item.acao_status === "pendente";

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl p-3.5 transition-colors ${
                        item.lida ? "bg-[var(--zelo-card)]/70" : "bg-[var(--zelo-card)] shadow-sm"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCardClick(item)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--zelo-soft)]">
                          {getTipoIcon(item.tipo)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-bold text-[var(--zelo-ink)]">
                              {item.titulo}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono-num text-[10px] text-[var(--zelo-subtle)]">
                                {formatTempo(item.created_at)}
                              </span>
                              {!item.lida && (
                                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
                            {item.mensagem}
                          </p>
                        </div>
                      </button>

                      {hasAdiamentoAction && (
                        <div className="mt-2.5 flex items-center gap-2 pl-11">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleInteractiveAction(item, "confirmar")}
                            className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--zelo-btn-bg)] px-2.5 text-[11px] font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Confirmar horário</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleInteractiveAction(item, "recusar")}
                            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-xl bg-rose-500/12 px-2.5 text-[11px] font-semibold text-rose-500 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      )}

                      {item.acao_tipo === "confirmar_adiamento" &&
                        item.acao_status !== "pendente" && (
                          <div className="mt-2 pl-11">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                item.acao_status === "confirmada"
                                  ? "bg-emerald-500/12 text-emerald-500"
                                  : "bg-rose-500/12 text-rose-500"
                              }`}
                            >
                              {item.acao_status === "confirmada"
                                ? "Novo horário confirmado"
                                : "Cancelado por você"}
                            </span>
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
