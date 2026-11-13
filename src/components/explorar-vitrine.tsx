"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Compass,
  MapPin,
  Search,
  Star,
  Store,
  UserCircle2,
} from "lucide-react";
import { getAccentInk, type VitrineLojaCard } from "@/lib/public/get-loja-publica";
import { useViewerPerfil } from "@/lib/supabase/use-viewer-perfil";

const NICHOS = [
  { key: "todos", label: "Todas" },
  { key: "barbearia", label: "Barbearia" },
  { key: "manicure", label: "Manicure & Unhas" },
  { key: "salao", label: "Salão & Cabelo" },
  { key: "estetica", label: "Estética & Lash" },
  { key: "outro", label: "Outros" },
] as const;

const NICHO_LABEL: Record<string, string> = {
  barbearia: "Barbearia",
  manicure: "Manicure & Unhas",
  salao: "Salão & Cabelo",
  estetica: "Estética & Lash",
  outro: "Espaço",
};

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (nome.trim().slice(0, 2) || "ZL").toUpperCase();
}

export function ExplorarVitrine({ lojas }: { lojas: VitrineLojaCard[] }) {
  const [busca, setBusca] = useState("");
  const [nicho, setNicho] = useState<string>("todos");
  const [cidade, setCidade] = useState<string>("todas");
  const searchRef = useRef<HTMLInputElement>(null);
  const viewer = useViewerPerfil();

  const cidades = useMemo(() => {
    const set = new Set<string>();
    for (const l of lojas) {
      if (l.cidade.trim()) set.add(l.cidade.trim());
    }
    return Array.from(set).sort();
  }, [lojas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lojas.filter((l) => {
      if (nicho !== "todos" && l.nicho !== nicho) return false;
      if (cidade !== "todas" && l.cidade.trim() !== cidade) return false;
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.bairro.toLowerCase().includes(q) ||
        l.cidade.toLowerCase().includes(q)
      );
    });
  }, [lojas, busca, nicho, cidade]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-4 pb-28">
        {/* Location Selector Bar & Live Availability Pill */}
        <div className="flex items-center justify-between gap-2 pt-2 pb-1">
          <div className="relative inline-flex items-center rounded-full bg-[var(--zelo-soft)] px-3 py-1.5 shadow-xs">
            <MapPin className="mr-1.5 h-4 w-4 shrink-0 text-[var(--zelo-ink)]" />
            <select
              aria-label="Selecionar cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="appearance-none bg-transparent pr-5 text-xs font-semibold tracking-tight text-[var(--zelo-ink)] outline-none"
            >
              <option value="todas">
                {cidades.length === 1 ? cidades[0] : "Todas as cidades"}
              </option>
              {cidades.length > 1 &&
                cidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none -ml-4 h-3.5 w-3.5 text-[var(--zelo-muted)]" />
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-2.5 py-1">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#10B981]" />
            <span className="font-mono-num text-[11px] font-medium text-[var(--zelo-muted)]">
              {filtradas.length}{" "}
              {filtradas.length === 1 ? "disponível" : "disponíveis"}
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative mt-2.5 flex w-full items-center">
          <Search className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-[var(--zelo-muted)]" />
          <input
            ref={searchRef}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar serviço, barbearia, manicure..."
            className="h-12 w-full rounded-xl bg-[var(--zelo-card)] pl-11 pr-4 text-sm text-[var(--zelo-ink)] placeholder:text-[var(--zelo-muted)] shadow-sm outline-none transition-all"
          />
        </div>

        {/* Niche Filter Horizontal Scroll */}
        <div className="no-scrollbar -mx-4 mt-3.5 flex items-center gap-2 overflow-x-auto px-4 py-0.5">
          {NICHOS.map((item) => {
            const active = nicho === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setNicho(item.key)}
                className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                  active
                    ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                    : "bg-[var(--zelo-card)] text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Main Establishments Feed (1 Column Mobile Cards) */}
        <div className="mt-5 flex flex-col gap-3.5">
          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--zelo-card)] px-6 py-12 text-center shadow-sm">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold">Nenhum espaço encontrado</h2>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--zelo-muted)]">
                Tente buscar por outro bairro ou limpe os filtros para ver os espaços ativos.
              </p>
              {(busca || nicho !== "todos" || cidade !== "todas") && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setNicho("todos");
                    setCidade("todas");
                  }}
                  className="mt-4 rounded-xl bg-[var(--zelo-btn-bg)] px-4 py-2 text-xs font-semibold text-[var(--zelo-btn-ink)]"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            filtradas.map((loja) => {
              const accentInk = getAccentInk(loja.cor_primaria);
              const initials = getInitials(loja.nome);
              const localLabel = [loja.bairro || loja.cidade, NICHO_LABEL[loja.nicho] ?? "Espaço"]
                .filter(Boolean)
                .join(" • ");

              return (
                <Link
                  key={loja.id}
                  href={`/${loja.slug}`}
                  className="flex flex-col gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm transition-transform duration-150 hover:bg-[var(--zelo-soft)]/40 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      {loja.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={loja.logo_url}
                          alt={loja.nome}
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 shrink-0 rounded-xl bg-[var(--zelo-soft)] object-cover shadow-xs"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold tracking-tight shadow-xs"
                          style={{
                            backgroundColor: loja.cor_primaria,
                            color: accentInk,
                          }}
                        >
                          {initials}
                        </div>
                      )}

                      <div className="flex min-w-0 flex-col">
                        <h2 className="truncate text-[18px] font-bold leading-tight text-[var(--zelo-ink)]">
                          {loja.nome}
                        </h2>
                        <p className="mt-0.5 truncate text-xs text-[var(--zelo-muted)]">
                          {localLabel}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 font-mono-num text-xs">
                      <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      <span className="font-bold text-[var(--zelo-ink)]">5.0</span>
                      <span className="text-[var(--zelo-muted)]">(0)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-[#10B981]/15 px-2.5 py-1 text-[#10B981]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      <span className="font-mono-num text-[11px] font-medium tracking-tight">
                        Agenda aberta
                      </span>
                    </div>

                    <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)] shadow-sm">
                      <span>Agendar</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Business Conversion Footer Card */}
        <Link
          href={viewer ? "/onboarding" : "/entrar?next=/onboarding"}
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm transition-colors hover:bg-[var(--zelo-soft)]/50 active:scale-[0.99]"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="w-max rounded-full bg-[var(--zelo-soft)] px-2.5 py-0.5 font-mono-num text-[10px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]">
              Para Profissionais
            </span>
            <h3 className="mt-1 text-[18px] font-bold leading-tight text-[var(--zelo-ink)]">
              Crie sua página no Zelo
            </h3>
            <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
              Cadastre seu espaço em 3 minutos e comece a receber agendamentos.
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm">
            <ArrowRight className="h-5 w-5" />
          </span>
        </Link>
      </div>

      {/* Fixed Bottom Navigation (Stitch) */}
      <nav className="fixed bottom-0 z-50 w-full bg-[var(--zelo-bg)]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-around px-2">
          <Link
            href="/explorar"
            aria-current="page"
            className="flex h-12 w-16 flex-col items-center justify-center gap-1 font-semibold text-[var(--zelo-ink)]"
          >
            <Compass className="h-5 w-5" />
            <span className="text-[11px] tracking-tight">Explorar</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              searchRef.current?.focus();
            }}
            className="flex h-12 w-16 flex-col items-center justify-center gap-1 text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)]"
          >
            <Search className="h-5 w-5" />
            <span className="text-[11px] tracking-tight">Buscar</span>
          </button>
          <Link
            href={viewer ? "/painel" : "/entrar?next=/painel"}
            className="flex h-12 w-16 flex-col items-center justify-center gap-1 text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)]"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[11px] tracking-tight">Horários</span>
          </Link>
          <Link
            href={viewer ? "/painel/configuracoes" : "/entrar"}
            className="flex h-12 w-16 flex-col items-center justify-center gap-1 text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)]"
          >
            {viewer?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={viewer.avatar_url}
                alt={viewer.nome}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-5 w-5" />
            )}
            <span className="text-[11px] tracking-tight">{viewer ? "Perfil" : "Entrar"}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
