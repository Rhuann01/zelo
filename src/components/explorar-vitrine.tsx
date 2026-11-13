"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Scissors,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { getAccentInk, type VitrineLojaCard } from "@/lib/public/get-loja-publica";

const NICHOS = [
  { key: "todos", label: "Todos" },
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

function formatPrice(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

export function ExplorarVitrine({ lojas }: { lojas: VitrineLojaCard[] }) {
  const [busca, setBusca] = useState("");
  const [nicho, setNicho] = useState<string>("todos");
  const [cidade, setCidade] = useState<string>("todas");

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
    <div className="space-y-5">
      {/* Search & Filters */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--zelo-muted)]" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, bairro ou cidade..."
              className="h-11 w-full rounded-xl bg-[var(--zelo-card)] pl-10 pr-3.5 text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-[var(--zelo-ink)] dark:ring-white/10"
            />
          </div>
          {cidades.length > 1 && (
            <select
              aria-label="Filtrar por cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="h-11 rounded-xl bg-[var(--zelo-card)] px-3.5 text-sm font-medium shadow-sm outline-none ring-1 ring-black/5 dark:ring-white/10"
            >
              <option value="todas">Todas as cidades</option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Horizontal Scrollable Niche Pills */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {NICHOS.map((item) => {
            const active = nicho === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setNicho(item.key)}
                className={`inline-flex h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                    : "bg-[var(--zelo-card)] text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Results Count */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-medium text-[var(--zelo-muted)]">
          {filtradas.length === 1
            ? "1 espaço disponível"
            : `${filtradas.length} espaços disponíveis`}
        </p>
        {(busca || nicho !== "todos" || cidade !== "todas") && (
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setNicho("todos");
              setCidade("todas");
            }}
            className="text-xs font-semibold text-[var(--zelo-ink)] underline underline-offset-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Store Grid */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--zelo-card)] px-6 py-12 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--zelo-soft)] text-[var(--zelo-muted)]">
            <Store className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold">Nenhum espaço encontrado</h2>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--zelo-muted)]">
            Tente buscar por outro bairro ou limpe os filtros para ver todos os estabelecimentos ativos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((loja) => {
            const accentInk = getAccentInk(loja.cor_primaria);
            const inicial = (loja.nome.trim()[0] || "Z").toUpperCase();
            return (
              <Link
                key={loja.id}
                href={`/${loja.slug}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-[var(--zelo-card)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
              >
                <div>
                  {/* Subtle Theme Accent Bar */}
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: loja.cor_primaria }}
                  />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {loja.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={loja.logo_url}
                          alt={loja.nome}
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 shrink-0 rounded-xl object-cover bg-[var(--zelo-soft)]"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold"
                          style={{
                            backgroundColor: loja.cor_primaria,
                            color: accentInk,
                          }}
                        >
                          {inicial}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h2 className="truncate text-sm font-bold text-[var(--zelo-ink)]">
                            {loja.nome}
                          </h2>
                          <BadgeCheck
                            className="h-4 w-4 shrink-0"
                            style={{ color: loja.cor_primaria }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-[var(--zelo-muted)]">
                          {NICHO_LABEL[loja.nicho] ?? "Espaço"}
                        </p>
                        {(loja.cidade || loja.bairro) && (
                          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-[var(--zelo-muted)]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {[loja.bairro, loja.cidade].filter(Boolean).join(" • ")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[var(--zelo-soft)]/70 px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    {loja.preco_inicial_centavos !== null ? (
                      <>
                        <Scissors className="h-3.5 w-3.5 text-[var(--zelo-muted)]" />
                        <span className="text-[var(--zelo-muted)]">A partir de</span>
                        <span className="font-mono-num font-bold text-[var(--zelo-ink)]">
                          {formatPrice(loja.preco_inicial_centavos)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-[var(--zelo-muted)]" />
                        <span className="text-[var(--zelo-muted)]">Agenda online</span>
                      </>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--zelo-ink)] transition-transform group-hover:translate-x-0.5">
                    Agendar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
