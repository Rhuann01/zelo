"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  MapPin,
  MessageCircle,
  Scissors,
  Search,
  Share2,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { ReservaDrawer } from "@/components/reserva-drawer";
import { EquipeHorariosTab } from "@/components/storefront/equipe-horarios-tab";
import { ServiceCard } from "@/components/storefront/service-card";
import { StoreNavBar } from "@/components/storefront/store-nav-bar";
import { StoreMapEmbed, buildExternalMapUrl } from "@/components/ui";
import { LiquidGlassSvgDefs, LiquidGlassSurface } from "@/components/ui/liquid-glass-surface";
import {
  getAccentInk,
  type LojaPublica,
  type ProfissionalPublico,
  type ServicoPublico,
} from "@/lib/public/get-loja-publica";

function formatPrice(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

function formatWhatsappHref(raw: string, text: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (nome.trim().slice(0, 2) || "ZL").toUpperCase();
}

export function LojaPublicaView({
  loja,
  servicos,
  profissionais,
}: {
  loja: LojaPublica;
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
}) {
  const [tab, setTab] = useState<"servicos" | "equipe" | "detalhes">("servicos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>(profissionais[0]?.id ?? "");
  const [profPreSelecionado, setProfPreSelecionado] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [buscaServico, setBuscaServico] = useState("");
  const [filtroDuracao, setFiltroDuracao] = useState<"todos" | "rapidos" | "completos">("todos");

  const accentInk = getAccentInk(loja.cor_primaria);
  const isBrutal = loja.tema === "brutal";
  const isLiquidGlass = loja.tema === "liquid_glass";
  const isDarkStore =
    loja.tema !== "glam" && loja.tema !== "urban" && Boolean(loja.modo_escuro);
  const estiloBarra = loja.estilo_barra ?? "abas";
  const estiloCard = loja.estilo_card ?? "preenchido";
  const initials = getInitials(loja.nome);
  const storeRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = storeRootRef.current;
    if (!el) return;
    const bg = getComputedStyle(el).backgroundColor;
    if (!bg) return;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    return () => {
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, [loja.tema, isDarkStore]);

  const selecionados = useMemo(
    () => servicos.filter((s) => selectedIds.includes(s.id)),
    [servicos, selectedIds]
  );

  const servicosFiltrados = useMemo(() => {
    const q = buscaServico.trim().toLowerCase();
    return servicos.filter((s) => {
      const matchText =
        !q ||
        s.nome.toLowerCase().includes(q) ||
        s.descricao.toLowerCase().includes(q);
      const matchDur =
        filtroDuracao === "todos" ||
        (filtroDuracao === "rapidos" && s.duracao_min <= 35) ||
        (filtroDuracao === "completos" && s.duracao_min > 35);
      return matchText && matchDur;
    });
  }, [servicos, buscaServico, filtroDuracao]);

  const totalDuracao = useMemo(
    () => selecionados.reduce((acc, s) => acc + s.duracao_min, 0),
    [selecionados]
  );

  const totalCentavos = useMemo(
    () => selecionados.reduce((acc, s) => acc + s.preco_centavos, 0),
    [selecionados]
  );

  function toggleServico(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleAgendarComProfissional(profId: string) {
    setSelectedProfId(profId);
    if (selectedIds.length > 0) {
      setDrawerOpen(true);
      return;
    }
    if (servicos.length === 1) {
      setSelectedIds([servicos[0].id]);
      setDrawerOpen(true);
      return;
    }
    setProfPreSelecionado(true);
    setTab("servicos");
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({ title: loja.nome, url }).catch(() => null);
      return;
    }
    if (url && navigator.clipboard) {
      await navigator.clipboard.writeText(url).catch(() => null);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  }

  const addressQuery = [loja.nome, loja.endereco_texto, loja.bairro, loja.cidade]
    .filter(Boolean)
    .join(", ");

  const mapsHref = buildExternalMapUrl({
    latitude: loja.latitude,
    longitude: loja.longitude,
    mapsUrl: loja.maps_url,
    addressQuery: loja.endereco_texto || loja.cidade ? addressQuery : undefined,
  });

  const whatsappHref = formatWhatsappHref(
    loja.whatsapp_loja,
    selecionados.length > 0
      ? `Olá ${loja.nome}! Gostaria de agendar: ${selecionados
          .map((s) => s.nome)
          .join(", ")}.`
      : `Olá ${loja.nome}! Vi sua página no Zelo.`
  );

  const cardSurfaceStyle: React.CSSProperties = {
    backgroundColor: "var(--t-surface)",
    borderRadius: "var(--t-radius)",
    boxShadow: "var(--t-shadow)",
    ...(isBrutal ? { border: "var(--t-border-w) solid var(--t-border)" } : {}),
  };

  return (
    <div
      ref={storeRootRef}
      className={`store-view-base theme-${loja.tema} ${
        isDarkStore ? "theme-dark-override" : ""
      } flex min-h-screen flex-col`}
      style={
        {
          "--t-accent": loja.cor_primaria,
          "--t-accent-ink": accentInk,
          "--t-radius": `${loja.raio_borda_px}px`,
        } as React.CSSProperties
      }
    >
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-24">
        {isLiquidGlass && <LiquidGlassSvgDefs />}
        {/* Top App Profile Header (estilo aplicativo próprio) */}
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              {loja.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={loja.logo_url}
                  alt={loja.nome}
                  className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm"
                  style={{
                    backgroundColor: "var(--t-inner)",
                    border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                  }}
                />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm"
                  style={{
                    backgroundColor: "var(--t-surface)",
                    color: "var(--t-ink)",
                    border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                  }}
                >
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      loja.pausada ? "bg-[#F59E0B]" : "animate-pulse bg-[#10B981]"
                    }`}
                  />
                  <span className="truncate text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>
                    {loja.pausada
                      ? "Loja pausada"
                      : [loja.bairro, loja.cidade].filter(Boolean).join(", ") || "Atendimento hoje"}
                  </span>
                </div>
                <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight">
                  {loja.nome}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/explorar"
                aria-label="Voltar para explorar"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
                  isLiquidGlass ? "store-glass-surface" : ""
                }`}
                style={
                  isLiquidGlass
                    ? { color: "var(--t-ink)" }
                    : {
                        backgroundColor: "var(--t-surface)",
                        color: "var(--t-ink)",
                        border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                      }
                }
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              <button
                type="button"
                onClick={handleShare}
                aria-label="Compartilhar página"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
                  isLiquidGlass ? "store-glass-surface" : ""
                }`}
                style={
                  isLiquidGlass
                    ? { color: copiedShare ? "var(--t-accent)" : "var(--t-ink)" }
                    : {
                        backgroundColor: "var(--t-surface)",
                        color: copiedShare ? "var(--t-accent)" : "var(--t-ink)",
                        border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                      }
                }
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loja.pausada && (
            <div
              className="mt-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.16)", color: "#D97706" }}
            >
              Loja pausada temporariamente — novos agendamentos online indisponíveis no momento.
            </div>
          )}

          {loja.sinal_centavos > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-[#10B981]"
                style={{
                  backgroundColor: "var(--t-surface)",
                  borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                  border: isBrutal ? "2px solid #000000" : "1px solid rgba(16, 185, 129, 0.28)",
                  ...(isBrutal ? { boxShadow: "var(--t-shadow)" } : {}),
                }}
              >
                <Zap className="h-3 w-3" />
                <span>PIX para sinal ativo</span>
              </span>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div key={tab} className="zelo-panel-enter px-4 pt-3">
          {/* TAB 1: SERVIÇOS */}
          {tab === "servicos" && (
            <section className="flex flex-col gap-4">
              {/* Barra de busca interna da loja */}
              <div
                className={`flex h-11 items-center gap-2.5 px-4 ${
                  isLiquidGlass ? "store-glass-surface" : ""
                }`}
                style={
                  isLiquidGlass
                    ? { borderRadius: "min(calc(var(--t-radius) * 2), 9999px)" }
                    : {
                        backgroundColor: "var(--t-surface)",
                        borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                        border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                        boxShadow: "var(--t-shadow)",
                      }
                }
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--t-muted)" }} />
                <input
                  type="search"
                  value={buscaServico}
                  onChange={(e) => setBuscaServico(e.target.value)}
                  placeholder="Buscar serviço..."
                  aria-label="Buscar serviço"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--t-muted)]"
                  style={{ color: "var(--t-ink)" }}
                />
                {buscaServico && (
                  <button
                    type="button"
                    onClick={() => setBuscaServico("")}
                    aria-label="Limpar busca"
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ color: "var(--t-muted)" }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Card de Banner/Destaque: exibido SOMENTE se a loja tiver capa_url */}
              {loja.capa_url && (
                <div
                  className="relative h-40 w-full overflow-hidden shadow-md"
                  style={{
                    borderRadius: "calc(var(--t-radius) * 1.4)",
                    border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={loja.capa_url}
                    alt={`Destaque ${loja.nome}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
                  <div className="relative z-10 flex h-full max-w-[75%] flex-col justify-between p-4 text-white">
                    <div>
                      <span
                        className="inline-block bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
                        style={{
                          borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                        }}
                      >
                        Atendimento hoje
                      </span>
                      <p className="mt-1.5 text-base font-bold leading-snug">
                        Reserve seu horário na {loja.nome}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loja.pausada || servicos.length === 0}
                      onClick={() => {
                        if (servicos[0] && !selectedIds.includes(servicos[0].id)) {
                          toggleServico(servicos[0].id);
                        }
                        setDrawerOpen(true);
                      }}
                      className="inline-flex h-9 w-fit items-center gap-1.5 px-4 text-xs font-semibold shadow transition-transform active:scale-95 disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--t-accent)",
                        color: "var(--t-accent-ink)",
                        borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                        ...(isBrutal
                          ? { border: "2px solid #000000", boxShadow: "var(--t-shadow)" }
                          : {}),
                      }}
                    >
                      <span>Agendar agora</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pílulas de filtro rápidas */}
              {servicos.length > 0 && (
                <div className="no-scrollbar -mx-4 -my-3 flex items-center gap-2 overflow-x-auto px-4 py-3">
                  {(
                    [
                      { key: "todos", label: "Todos" },
                      { key: "rapidos", label: "Rápidos (até 35m)" },
                      { key: "completos", label: "Completos" },
                    ] as const
                  ).map((f) => {
                    const active = filtroDuracao === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFiltroDuracao(f.key)}
                        className={`min-h-[36px] shrink-0 px-4 text-xs font-semibold transition-all active:scale-95 ${
                          !active && isLiquidGlass ? "store-glass-surface" : ""
                        }`}
                        style={
                          active
                            ? {
                                backgroundColor: "var(--t-accent)",
                                color: "var(--t-accent-ink)",
                                borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                                ...(isLiquidGlass
                                  ? {
                                      boxShadow:
                                        "0 3px 10px color-mix(in srgb, var(--t-accent) 24%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.45)",
                                    }
                                  : {}),
                                ...(isBrutal
                                  ? {
                                      border: "2px solid #000000",
                                      boxShadow: "var(--t-shadow)",
                                    }
                                  : {}),
                              }
                            : isLiquidGlass
                              ? {
                                  color: "var(--t-ink)",
                                  borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                                  boxShadow:
                                    "0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
                                }
                              : {
                                  backgroundColor: "var(--t-surface)",
                                  color: isBrutal ? "var(--t-ink)" : "var(--t-muted)",
                                  borderRadius: "min(calc(var(--t-radius) * 2), 9999px)",
                                  border: isBrutal
                                    ? "2px solid #000000"
                                    : "1px solid var(--t-border)",
                                  ...(isBrutal ? { boxShadow: "var(--t-shadow)" } : {}),
                                }
                        }
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Cabeçalho da Seção */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold tracking-tight">Serviços</h2>
                <button
                  type="button"
                  onClick={() => setTab("equipe")}
                  className="text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: "var(--t-muted)" }}
                >
                  Ver equipe
                </button>
              </div>

              {profPreSelecionado && selectedProfId && (
                <div
                  className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                  }}
                >
                  <span className="truncate font-medium">
                    Profissional selecionado:{" "}
                    <strong>
                      {profissionais.find((p) => p.id === selectedProfId)?.nome}
                    </strong>{" "}
                    — escolha um serviço abaixo
                  </span>
                  <button
                    type="button"
                    onClick={() => setProfPreSelecionado(false)}
                    className="shrink-0 rounded-full p-1 transition-opacity hover:opacity-75"
                    aria-label="Fechar aviso de profissional"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {servicosFiltrados.length === 0 ? (
                <div className="p-6 text-center space-y-1.5" style={cardSurfaceStyle}>
                  <Scissors className="mx-auto h-6 w-6" style={{ color: "var(--t-muted)" }} />
                  <p className="text-sm font-bold">
                    {servicos.length === 0
                      ? "Nenhum serviço publicado"
                      : "Nenhum serviço encontrado"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                    {servicos.length === 0
                      ? "Este espaço ainda está finalizando o catálogo de serviços."
                      : "Tente limpar a busca ou trocar o filtro acima."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {servicosFiltrados.map((s) => (
                    <ServiceCard
                      key={s.id}
                      servico={s}
                      selected={selectedIds.includes(s.id)}
                      disabled={loja.pausada}
                      estiloCard={estiloCard}
                      isBrutal={isBrutal}
                      isLiquidGlass={isLiquidGlass}
                      onToggle={toggleServico}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: EQUIPE & HORÁRIOS */}
          {tab === "equipe" && (
            <EquipeHorariosTab
              loja={loja}
              profissionais={profissionais}
              selectedProfId={selectedProfId}
              isBrutal={isBrutal}
              cardSurfaceStyle={cardSurfaceStyle}
              onAgendarComProfissional={handleAgendarComProfissional}
            />
          )}

          {/* TAB 3: DETALHES & MAPA */}
          {tab === "detalhes" && (
            <section className="p-4 space-y-4" style={cardSurfaceStyle}>
              <div className="space-y-2.5">
                <h2 className="text-sm font-bold">Localização</h2>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  {[loja.endereco_texto, loja.bairro, loja.cidade].filter(Boolean).join(" • ") ||
                    "Endereço não informado."}
                </p>
                <StoreMapEmbed
                  latitude={loja.latitude}
                  longitude={loja.longitude}
                  addressQuery={loja.endereco_texto || loja.cidade ? addressQuery : undefined}
                  mapsUrl={loja.maps_url}
                  title={`Mapa de ${loja.nome}`}
                />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold underline underline-offset-2"
                      style={{ color: "var(--t-ink)" }}
                    >
                      <span>Abrir no Google Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold underline underline-offset-2"
                      style={{ color: "var(--t-ink)" }}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Falar no WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" style={{ color: "var(--t-accent)" }} />
                  <h3 className="text-sm font-bold">Reserva & Sinal</h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  {loja.sinal_centavos > 0
                    ? `Este espaço solicita um sinal antecipado de ${formatPrice(
                        loja.sinal_centavos
                      )} via PIX para confirmação da vaga.`
                    : "Agendamento gratuito — pagamento realizado diretamente no estabelecimento."}
                </p>
              </div>
            </section>
          )}

          <footer className="pt-3 text-center">
            <Link
              href="/"
              className="text-[11px] font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--t-muted)" }}
            >
              Agendamento online por <strong style={{ color: "var(--t-ink)" }}>Zelo</strong>
            </Link>
          </footer>
        </div>
      </main>

      {/* Barra de Navegação inferior (Abas clássicas ou Dock Flutuante; oculta se houver serviços selecionados) */}
      <StoreNavBar
        tab={tab}
        onChangeTab={setTab}
        estiloBarra={estiloBarra}
        hidden={selecionados.length > 0 && !loja.pausada}
        isBrutal={isBrutal}
        isLiquidGlass={isLiquidGlass}
        isDark={isDarkStore}
      />

      {/* Floating Concentric Booking Capsule (Apple HIG / Stitch) */}
      {selecionados.length > 0 && !loja.pausada && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] z-40 flex justify-center px-3.5">
          {isLiquidGlass ? (
            <LiquidGlassSurface
              tone={isDarkStore ? "dark" : "light"}
              className="zelo-sheet-up pointer-events-auto w-full max-w-[448px] rounded-[28px] p-2.5"
            >
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  aria-label="Limpar serviços selecionados"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 ${
                    isDarkStore
                      ? "bg-white/10 text-white/80"
                      : "bg-black/5 text-[#3A3A3C]"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-[11px] font-medium ${
                      isDarkStore ? "text-[#A1A1AA]" : "text-[#6E6E73]"
                    }`}
                  >
                    {selecionados.length === 1
                      ? `1 serviço • ${totalDuracao} min`
                      : `${selecionados.length} serviços • ${totalDuracao} min`}
                  </span>
                  <span
                    className={`font-mono-num text-lg font-bold leading-tight ${
                      isDarkStore ? "text-[#F5F5F7]" : "text-[#1C1C1E]"
                    }`}
                  >
                    {formatPrice(totalCentavos)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[20px] px-4 text-xs font-semibold shadow-md transition-transform active:scale-95"
                  style={{
                    backgroundColor: "var(--t-accent)",
                    color: "var(--t-accent-ink)",
                  }}
                >
                  <span>Escolher horário</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </LiquidGlassSurface>
          ) : (
            <div
              className="zelo-sheet-up pointer-events-auto flex w-full max-w-[448px] items-center justify-between gap-2.5 rounded-[28px] p-2.5 backdrop-blur-xl"
              style={{
                backgroundColor: "color-mix(in srgb, var(--t-surface) 94%, transparent)",
                border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
                boxShadow: isBrutal ? "3px 3px 0px #000000" : "0 14px 36px rgba(0, 0, 0, 0.22)",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                aria-label="Limpar serviços selecionados"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
                style={{
                  backgroundColor: "var(--t-inner)",
                  color: "var(--t-muted)",
                }}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[11px]" style={{ color: "var(--t-muted)" }}>
                  {selecionados.length === 1
                    ? `1 serviço • ${totalDuracao} min`
                    : `${selecionados.length} serviços • ${totalDuracao} min`}
                </span>
                <span className="font-mono-num text-lg font-bold leading-tight">
                  {formatPrice(totalCentavos)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[20px] px-4 text-xs font-semibold shadow-md transition-transform active:scale-95"
                style={{
                  backgroundColor: "var(--t-accent)",
                  color: "var(--t-accent-ink)",
                  ...(isBrutal ? { border: "2px solid #000000" } : {}),
                }}
              >
                <span>Escolher horário</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drawer Real de Disponibilidade e Reserva Blindada */}
      <ReservaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loja={loja}
        selecionados={selecionados}
        totalDuracao={totalDuracao}
        totalCentavos={totalCentavos}
        profissionais={profissionais}
        selectedProfId={selectedProfId}
        onSelectProf={setSelectedProfId}
        isBrutal={isBrutal}
        cardSurfaceStyle={cardSurfaceStyle}
        whatsappFallbackHref={whatsappHref}
      />
    </div>
  );
}
