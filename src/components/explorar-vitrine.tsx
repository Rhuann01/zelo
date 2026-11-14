"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brush,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  LayoutGrid,
  MapPin,
  Palette,
  Scissors,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserCircle2,
  X,
} from "lucide-react";
import type { VitrineLojaCard } from "@/lib/public/get-loja-publica";
import { useViewerPerfil } from "@/lib/supabase/use-viewer-perfil";
import { ZeloLogo } from "@/components/zelo-logo";
import { ZeloToastViewport } from "@/components/zelo-toast";
import { ExplorarHeaderAvatar } from "@/components/explorar-header-avatar";
import { ExplorarMeusHorarios } from "@/components/explorar-meus-horarios";
import { ExplorarPerfilForm } from "@/components/explorar-perfil-form";
import { EmptyState } from "@/components/ui";

const NICHOS = [
  { key: "todos", label: "Todos", icon: LayoutGrid },
  { key: "barbearia", label: "Barbearia", icon: Scissors },
  { key: "manicure", label: "Unhas & Manicure", icon: Brush },
  { key: "salao", label: "Cabelo & Salão", icon: Sparkles },
  { key: "estetica", label: "Estética & Facial", icon: Palette },
  { key: "outro", label: "Outros", icon: Store },
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

function formatPrecoReais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  });
}

export function ExplorarVitrine({ lojas }: { lojas: VitrineLojaCard[] }) {
  const [tab, setTab] = useState<"explorar" | "favoritos" | "horarios" | "perfil">("explorar");
  const [busca, setBusca] = useState("");
  const [nicho, setNicho] = useState<string>("todos");
  const [cidade, setCidade] = useState<string>("todas");
  const [somenteFavoritosFilter, setSomenteFavoritosFilter] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const { viewer, loaded, refreshViewer } = useViewerPerfil();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t === "horarios" || t === "favoritos" || t === "perfil" || t === "explorar") {
        setTab(t);
      }
      const raw = localStorage.getItem("zelo_favoritos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavoritos(parsed.filter((id) => typeof id === "string"));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function toggleFavorito(lojaId: string) {
    setFavoritos((prev) => {
      const next = prev.includes(lojaId)
        ? prev.filter((id) => id !== lojaId)
        : [...prev, lojaId];
      try {
        localStorage.setItem("zelo_favoritos", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  const cidades = useMemo(() => {
    const set = new Set<string>();
    for (const l of lojas) {
      if (l.cidade.trim()) set.add(l.cidade.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lojas]);

  const lojasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lojas.filter((l) => {
      if (tab === "favoritos" && !favoritos.includes(l.id)) return false;
      if (tab === "explorar" && somenteFavoritosFilter && !favoritos.includes(l.id)) {
        return false;
      }
      if (tab === "explorar") {
        if (nicho !== "todos" && l.nicho !== nicho) return false;
        if (cidade !== "todas" && l.cidade !== cidade) return false;
        if (q) {
          const hay = `${l.nome} ${l.bairro} ${l.cidade} ${NICHO_LABEL[l.nicho] ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
      }
      return true;
    });
  }, [lojas, busca, nicho, cidade, tab, favoritos, somenteFavoritosFilter]);

  const showHero =
    tab === "explorar" &&
    !busca.trim() &&
    nicho === "todos" &&
    !somenteFavoritosFilter &&
    lojasFiltradas.length > 0;

  const heroLoja = showHero ? lojasFiltradas[0] : null;
  const feedLojas = showHero && lojasFiltradas.length > 1 ? lojasFiltradas.slice(1) : lojasFiltradas;

  const cidadeLabel = cidade === "todas" ? "Sua região" : cidade;

  return (
    <>
      <ZeloToastViewport />

      {/* Fixed Top Header (Stitch Vitrine Regional Premium) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--zelo-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <ZeloLogo />

            {/* Location Selector Dropdown Pill */}
            <label className="relative flex min-h-[36px] items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 transition-colors hover:opacity-90 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--zelo-ink)]" />
              <select
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                aria-label="Selecionar cidade"
                className="max-w-[130px] cursor-pointer appearance-none bg-transparent pr-4 text-xs font-semibold tracking-tight text-[var(--zelo-ink)] outline-none truncate"
              >
                <option value="todas">Todas as cidades</option>
                {cidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-[var(--zelo-muted)]" />
            </label>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setTab("favoritos")}
              aria-label="Ver lojas favoritadas"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--zelo-muted)] transition-colors hover:bg-[var(--zelo-soft)] hover:text-[var(--zelo-ink)]"
            >
              <Heart className={`h-4 w-4 ${favoritos.length > 0 ? "fill-rose-500 text-rose-500" : ""}`} />
              {favoritos.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
              )}
            </button>
            <ExplorarHeaderAvatar onSelectPerfil={() => setTab("perfil")} />
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col w-full pt-14 pb-24">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-2.5">
          {tab === "horarios" ? (
            <ExplorarMeusHorarios
              viewer={viewer}
              loaded={loaded}
              onGoExplorar={() => setTab("explorar")}
            />
          ) : tab === "perfil" ? (
            viewer ? (
              <ExplorarPerfilForm viewer={viewer} onSaved={refreshViewer} />
            ) : (
              <EmptyState
                icon={<UserCircle2 className="h-5 w-5" />}
                title="Entre na sua conta"
                description="Faça login para editar seu perfil e acompanhar seus horários."
                action={
                  <Link
                    href="/entrar?next=/explorar"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)]"
                  >
                    <span>Entrar com Google</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            )
          ) : tab === "favoritos" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight">Lojas Favoritadas</h1>
                  <p className="text-xs text-[var(--zelo-muted)]">
                    Seus espaços salvos para agendar em 1 toque.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--zelo-soft)] px-2.5 py-1 font-mono-num text-[11px] font-bold text-[var(--zelo-muted)]">
                  {lojasFiltradas.length}
                </span>
              </div>

              {lojasFiltradas.length === 0 ? (
                <EmptyState
                  icon={<Heart className="h-5 w-5" />}
                  title="Nenhuma loja favoritada"
                  description="Toque no coração em qualquer espaço para salvar aqui."
                  action={
                    <button
                      type="button"
                      onClick={() => setTab("explorar")}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)]"
                    >
                      <span>Explorar espaços</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {lojasFiltradas.map((loja) => (
                    <PremiumLojaCard
                      key={loja.id}
                      loja={loja}
                      isFav={favoritos.includes(loja.id)}
                      onToggleFav={() => toggleFavorito(loja.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Live Status Pill Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex min-w-0 shrink items-center gap-2 rounded-full bg-[var(--zelo-card)] px-3 py-1.5 shadow-xs">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                  </span>
                  <div className="flex items-center gap-1.5 truncate text-xs">
                    <span className="font-bold whitespace-nowrap">
                      {lojasFiltradas.length}{" "}
                      {lojasFiltradas.length === 1 ? "espaço aberto" : "espaços abertos"}
                    </span>
                    <span className="text-[10px] text-[var(--zelo-subtle)]">•</span>
                    <span className="truncate font-medium text-[var(--zelo-muted)]">
                      {cidadeLabel}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSomenteFavoritosFilter((v) => !v)}
                  className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all active:scale-95 ${
                    somenteFavoritosFilter
                      ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                      : "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                  <span className="whitespace-nowrap">
                    {somenteFavoritosFilter ? "Favoritos" : "Agenda aberta"}
                  </span>
                </button>
              </div>

              {/* Search Input + Quick Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex flex-1 items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--zelo-subtle)]" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar barbearia, manicure, estética..."
                    className="h-11 w-full rounded-2xl bg-[var(--zelo-card)] pl-10 pr-9 text-[13.5px] font-medium text-[var(--zelo-ink)] placeholder:text-[var(--zelo-subtle)] shadow-xs outline-none focus:ring-2 focus:ring-[var(--zelo-btn-bg)]"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca("")}
                      aria-label="Limpar busca"
                      className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-[var(--zelo-muted)] hover:bg-[var(--zelo-soft)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {(nicho !== "todos" || cidade !== "todas" || busca || somenteFavoritosFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setNicho("todos");
                      setCidade("todas");
                      setBusca("");
                      setSomenteFavoritosFilter(false);
                    }}
                    aria-label="Limpar filtros"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs active:scale-95"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Horizontal Scroller */}
              <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-0.5 no-scrollbar">
                {NICHOS.map((item) => {
                  const Icon = item.icon;
                  const active = nicho === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setNicho(item.key)}
                      className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all active:scale-95 ${
                        active
                          ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                          : "bg-[var(--zelo-card)] text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)] shadow-xs"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hero Section: "Em Alta na sua região" */}
              {heroLoja && (
                <section className="flex flex-col gap-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-1.5 rounded-full bg-[var(--zelo-ink)]" />
                      <h2 className="text-[17px] font-extrabold tracking-tight">
                        Em Alta na sua região
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-[var(--zelo-muted)]">
                      {heroLoja.bairro || heroLoja.cidade}
                    </span>
                  </div>

                  <Link
                    href={`/${heroLoja.slug}`}
                    className="group relative block overflow-hidden rounded-3xl bg-[#111111] text-white shadow-md transition-transform active:scale-[0.99]"
                  >
                    <div className="relative h-52 w-full">
                      {heroLoja.capa_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={heroLoja.capa_url}
                          alt={heroLoja.nome}
                          className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="relative h-full w-full overflow-hidden"
                          style={{
                            background: `radial-gradient(circle at 80% 20%, ${heroLoja.cor_primaria}66, #111111 72%)`,
                          }}
                        >
                          {heroLoja.logo_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={heroLoja.logo_url}
                              alt=""
                              aria-hidden="true"
                              className="h-full w-full scale-125 object-cover opacity-45 blur-xl"
                            />
                          )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />

                      {/* Top Badges */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFB95F] backdrop-blur-md">
                          <Sparkles className="h-3 w-3" />
                          <span>Destaque</span>
                        </span>
                        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md">
                          {NICHO_LABEL[heroLoja.nicho] ?? "Espaço"}
                        </span>
                      </div>

                      {/* Bottom Overlay Content */}
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 flex flex-col gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
                            <span>
                              {heroLoja.bairro ? `${heroLoja.bairro} • ` : ""}
                              {heroLoja.cidade}
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="font-semibold text-[#34D399]">Agenda aberta</span>
                          </div>
                          <h3 className="mt-0.5 text-xl font-extrabold leading-tight text-white">
                            {heroLoja.nome}
                          </h3>
                          {heroLoja.preco_inicial_centavos != null && (
                            <p className="mt-0.5 text-xs text-white/80">
                              Serviços a partir de{" "}
                              <strong className="font-mono-num font-bold text-white">
                                {formatPrecoReais(heroLoja.preco_inicial_centavos)}
                              </strong>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                            <span>
                              {heroLoja.total_servicos}{" "}
                              {heroLoja.total_servicos === 1 ? "serviço" : "serviços"}
                            </span>
                          </div>
                          <span className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3.5 text-xs font-bold text-black shadow-sm">
                            <span>Agendar</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>
              )}

              {/* Establishments Feed Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-extrabold tracking-tight">
                    Espaços Recomendados
                  </h2>
                  <span className="rounded-full bg-[var(--zelo-soft)] px-2 py-0.5 font-mono-num text-[11px] font-bold text-[var(--zelo-muted)]">
                    {lojasFiltradas.length}
                  </span>
                </div>
              </div>

              {/* Feed of High-Impact Cards */}
              {lojasFiltradas.length === 0 ? (
                <EmptyState
                  icon={<Store className="h-5 w-5" />}
                  title="Nenhum espaço encontrado"
                  description="Tente buscar outro bairro, cidade ou categoria."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {feedLojas.map((loja) => (
                    <PremiumLojaCard
                      key={loja.id}
                      loja={loja}
                      isFav={favoritos.includes(loja.id)}
                      onToggleFav={() => toggleFavorito(loja.id)}
                    />
                  ))}
                </div>
              )}

              {/* Pro Partner Conversion Banner */}
              <Link
                href={viewer ? "/onboarding" : "/entrar?next=/onboarding"}
                style={{ backgroundColor: "#1A1C1A", color: "#FFFFFF" }}
                className="mt-1 flex items-center justify-between gap-4 rounded-3xl p-5 shadow-md transition-transform active:scale-[0.99]"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#FFB95F]">
                    Para Donos & Profissionais
                  </span>
                  <h3 className="text-[17px] font-extrabold leading-snug text-white">
                    Tenha sua página no Zelo
                  </h3>
                  <p className="max-w-[240px] text-xs text-white/75">
                    Gerencie agenda e receba clientes da sua região em minutos.
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black shadow">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--zelo-bg)]/95 backdrop-blur-lg shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-around px-2">
          <button
            type="button"
            onClick={() => setTab("explorar")}
            className={`flex h-12 w-16 flex-col items-center justify-center gap-1 transition-colors ${
              tab === "explorar"
                ? "font-bold text-[var(--zelo-ink)]"
                : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Compass className="h-5 w-5" />
              {tab === "explorar" && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--zelo-ink)]" />
              )}
            </div>
            <span className="text-[11px] tracking-tight">Explorar</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("favoritos")}
            className={`flex h-12 w-16 flex-col items-center justify-center gap-1 transition-colors ${
              tab === "favoritos"
                ? "font-bold text-[var(--zelo-ink)]"
                : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
            }`}
          >
            <Heart className={`h-5 w-5 ${tab === "favoritos" ? "fill-current" : ""}`} />
            <span className="text-[11px] tracking-tight">Favoritos</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("horarios")}
            className={`flex h-12 w-16 flex-col items-center justify-center gap-1 transition-colors ${
              tab === "horarios"
                ? "font-bold text-[var(--zelo-ink)]"
                : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[11px] tracking-tight">Horários</span>
          </button>

          {viewer ? (
            <button
              type="button"
              onClick={() => setTab("perfil")}
              className={`flex h-12 w-16 flex-col items-center justify-center gap-1 transition-colors ${
                tab === "perfil"
                  ? "font-bold text-[var(--zelo-ink)]"
                  : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
              }`}
            >
              {viewer.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={viewer.avatar_url}
                  alt={viewer.nome}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-5 w-5" />
              )}
              <span className="text-[11px] tracking-tight">Perfil</span>
            </button>
          ) : (
            <Link
              href="/entrar?next=/explorar"
              className="flex h-12 w-16 flex-col items-center justify-center gap-1 text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)]"
            >
              <UserCircle2 className="h-5 w-5" />
              <span className="text-[11px] tracking-tight">Entrar</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

function PremiumLojaCard({
  loja,
  isFav,
  onToggleFav,
}: {
  loja: VitrineLojaCard;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-3xl bg-[var(--zelo-card)] shadow-sm transition-shadow hover:shadow-md">
      {/* Banner / Capa */}
      <div className="relative h-40 w-full overflow-hidden bg-[var(--zelo-soft)]">
        <Link href={`/${loja.slug}`} className="block h-full w-full">
          {loja.capa_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={loja.capa_url}
              alt={loja.nome}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div
              className="relative h-full w-full overflow-hidden"
              style={{
                background: `radial-gradient(circle at 80% 25%, ${loja.cor_primaria}55, #141514 76%)`,
              }}
            >
              {loja.logo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={loja.logo_url}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full scale-125 object-cover opacity-55 blur-xl"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        </Link>

        {/* Top Left Badge */}
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#111111] backdrop-blur-md shadow-xs">
            {loja.bairro || loja.cidade}
          </span>
          <span className="rounded-full bg-black/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
            {NICHO_LABEL[loja.nicho] ?? "Espaço"}
          </span>
        </div>

        {/* Top Right Favorito Button */}
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className="absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#111111] backdrop-blur-md shadow-xs transition-transform active:scale-90"
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>

        {/* Bottom Status Pill */}
        <div className="pointer-events-none absolute bottom-3 left-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5]/95 px-2.5 py-1 text-[11.5px] font-bold text-[#065F46] backdrop-blur-md shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span>Agenda aberta</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {loja.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={loja.logo_url}
                alt={loja.nome}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-xs"
              />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-xs"
                style={{ backgroundColor: loja.cor_primaria }}
              >
                {getInitials(loja.nome)}
              </span>
            )}
            <div className="min-w-0">
              <Link href={`/${loja.slug}`} className="hover:underline">
                <h3 className="truncate text-[17px] font-extrabold leading-tight tracking-tight">
                  {loja.nome}
                </h3>
              </Link>
              <p className="mt-0.5 truncate text-xs font-medium text-[var(--zelo-muted)]">
                {[loja.bairro, loja.cidade].filter(Boolean).join(", ")} •{" "}
                {NICHO_LABEL[loja.nicho] ?? "Espaço"}
              </p>
            </div>
          </div>
          {loja.preco_inicial_centavos != null && (
            <div className="shrink-0 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--zelo-muted)]">
                A partir de
              </span>
              <span className="font-mono-num text-base font-extrabold tracking-tight">
                {formatPrecoReais(loja.preco_inicial_centavos)}
              </span>
            </div>
          )}
        </div>

        <div className="h-px w-full bg-[var(--zelo-soft)]" />

        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs text-[var(--zelo-muted)]">
            {loja.total_servicos}{" "}
            {loja.total_servicos === 1 ? "serviço disponível" : "serviços disponíveis"}
          </span>
          <Link
            href={`/${loja.slug}`}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-bold text-[var(--zelo-btn-ink)] shadow-xs transition-transform active:scale-95"
          >
            <span>Agendar</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
