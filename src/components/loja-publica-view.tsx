"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Scissors,
  Share2,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { ReservaDrawer } from "@/components/reserva-drawer";
import { ServiceCard } from "@/components/storefront/service-card";
import { StoreNavBar } from "@/components/storefront/store-nav-bar";
import { StoreMapEmbed, buildExternalMapUrl } from "@/components/ui";
import { StoreBannerMedia } from "@/components/ui/store-banner-media";
import {
  getAccentInk,
  type LojaPublica,
  type ProfissionalPublico,
  type ServicoPublico,
} from "@/lib/public/get-loja-publica";

const DIAS_ORDEM = [
  { key: "seg", label: "Segunda-feira" },
  { key: "ter", label: "Terça-feira" },
  { key: "qua", label: "Quarta-feira" },
  { key: "qui", label: "Quinta-feira" },
  { key: "sex", label: "Sexta-feira" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
] as const;

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const accentInk = getAccentInk(loja.cor_primaria);
  const isBrutal = loja.tema === "brutal";
  const isLiquidGlass = loja.tema === "liquid_glass";
  const estiloBarra = loja.estilo_barra ?? "abas";
  const estiloCard = loja.estilo_card ?? "preenchido";
  const initials = getInitials(loja.nome);

  const selecionados = useMemo(
    () => servicos.filter((s) => selectedIds.includes(s.id)),
    [servicos, selectedIds]
  );

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
      className={`store-view-base theme-${loja.tema} flex min-h-screen flex-col`}
      style={
        {
          "--t-accent": loja.cor_primaria,
          "--t-accent-ink": accentInk,
          "--t-radius": `${loja.raio_borda_px}px`,
        } as React.CSSProperties
      }
    >
      {/* Stitch Sticky Header */}
      <header
        className="sticky top-0 z-40 w-full backdrop-blur-xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--t-bg) 90%, transparent)",
          borderBottom: "1px solid color-mix(in srgb, var(--t-border) 60%, transparent)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/explorar"
              aria-label="Voltar para explorar"
              className="-ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
              style={{ color: "var(--t-ink)" }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <span className="truncate text-[15px] font-semibold tracking-tight">
              {loja.nome}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Compartilhar página"
            className="flex h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-transform active:scale-95"
            style={{ color: "var(--t-muted)" }}
          >
            {copiedShare ? (
              <span>Link copiado</span>
            ) : (
              <Share2 className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-32">
        {/* Store Profile Hero with Banner Behind (foto ou degradê automático da logo / cor do perfil) */}
        <section className="relative overflow-hidden px-4 pt-20 sm:pt-24 pb-5">
          {/* Banner de fundo atrás da foto e nome da loja */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-44 sm:h-48 overflow-hidden">
            <StoreBannerMedia
              capaUrl={loja.capa_url}
              logoUrl={loja.logo_url}
              corPrimaria={loja.cor_primaria}
              alt={`Banner de ${loja.nome}`}
              overlayMode="store"
              priority
            />
          </div>

          <div className="relative z-10 flex flex-col gap-3.5">
            {loja.pausada && (
              <div
                className="rounded-xl px-3 py-2 text-xs font-semibold backdrop-blur-sm"
                style={{ backgroundColor: "rgba(245, 158, 11, 0.18)", color: "#F59E0B" }}
              >
                Loja pausada temporariamente — novos agendamentos online indisponíveis no momento.
              </div>
            )}

            <div className="flex items-end gap-3.5">
              {loja.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={loja.logo_url}
                  alt={loja.nome}
                  className="h-16 w-16 shrink-0 object-cover shadow-lg ring-2 ring-[var(--t-bg)]"
                  style={{
                    borderRadius: "calc(var(--t-radius) * 0.85)",
                    backgroundColor: "var(--t-inner)",
                  }}
                />
              ) : (
                <div
                  className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center overflow-hidden shadow-lg ring-2 ring-[var(--t-bg)]"
                  style={{
                    borderRadius: "calc(var(--t-radius) * 0.85)",
                    backgroundColor: "var(--t-surface)",
                    border: "1px solid var(--t-border)",
                  }}
                >
                  <span className="text-[17px] font-bold leading-none tracking-tight">
                    {initials}
                  </span>
                  <Scissors className="mt-1 h-3.5 w-3.5" style={{ color: "var(--t-accent)" }} />
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col justify-center pb-0.5">
                <div
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${
                    loja.pausada
                      ? "bg-black/75 text-[#FBBF24]"
                      : "bg-black/75 text-[#34D399]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      loja.pausada ? "bg-[#FBBF24]" : "animate-pulse bg-[#34D399]"
                    }`}
                  />
                  <span>{loja.pausada ? "Loja pausada" : "Atendimento hoje"}</span>
                </div>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">{loja.nome}</h1>
                {(loja.bairro || loja.cidade) && (
                  <p className="mt-0.5 truncate text-xs" style={{ color: "var(--t-muted)" }}>
                    {[loja.bairro, loja.cidade].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            {loja.sinal_centavos > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[#10B981]"
                  style={{
                    backgroundColor: "var(--t-surface)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>PIX para sinal ativo</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Navegação: Abas clássicas no topo OU Dock Flutuante no rodapé */}
        {estiloBarra === "abas" && (
          <StoreNavBar
            tab={tab}
            onChangeTab={setTab}
            estiloBarra="abas"
            isBrutal={isBrutal}
            isLiquidGlass={isLiquidGlass}
          />
        )}

        {/* Content Area */}
        <div key={tab} className="zelo-panel-enter px-4 pt-5">
          {/* TAB 1: SERVIÇOS */}
          {tab === "servicos" && (
            <section className="flex flex-col gap-3">
              {servicos.length === 0 ? (
                <div className="p-6 text-center space-y-1.5" style={cardSurfaceStyle}>
                  <Scissors className="mx-auto h-6 w-6" style={{ color: "var(--t-muted)" }} />
                  <p className="text-sm font-bold">Nenhum serviço publicado</p>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                    Este espaço ainda está finalizando o catálogo de serviços.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {servicos.map((s) => (
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
            <div className="space-y-4">
              <section className="space-y-2.5">
                <h2 className="px-0.5 text-sm font-bold">Profissionais</h2>
                {profissionais.length === 0 ? (
                  <div
                    className="p-4 text-xs"
                    style={{ ...cardSurfaceStyle, color: "var(--t-muted)" }}
                  >
                    Nenhum profissional disponível para exibição pública no momento.
                  </div>
                ) : (
                  profissionais.map((p) => {
                    const pInicial = (p.nome.trim()[0] || "P").toUpperCase();
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-3.5"
                        style={cardSurfaceStyle}
                      >
                        {p.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.avatar_url}
                            alt={p.nome}
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                            style={{ backgroundColor: "var(--t-inner)", color: "var(--t-ink)" }}
                          >
                            {pInicial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{p.nome}</p>
                          <p className="truncate text-xs" style={{ color: "var(--t-muted)" }}>
                            {p.cargo}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="p-4 space-y-2.5" style={cardSurfaceStyle}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: "var(--t-accent)" }} />
                  <h2 className="text-sm font-bold">Horário de Funcionamento</h2>
                </div>
                <div className="space-y-1.5">
                  {DIAS_ORDEM.map(({ key, label }) => {
                    const cfg = loja.horarios_loja?.[key] as
                      | { ativo?: boolean; abre?: string; fecha?: string }
                      | undefined;
                    const ativo = cfg?.ativo ?? key !== "dom";
                    const abre = cfg?.abre ?? "09:00";
                    const fecha = cfg?.fecha ?? "20:00";
                    return (
                      <div key={key} className="flex items-center justify-between py-1 text-xs">
                        <span style={{ color: ativo ? "var(--t-ink)" : "var(--t-muted)" }}>
                          {label}
                        </span>
                        <span
                          className="font-mono-num font-medium"
                          style={{ color: ativo ? "var(--t-ink)" : "var(--t-muted)" }}
                        >
                          {ativo ? `${abre} – ${fecha}` : "Fechado"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
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

          <footer className="pt-6 text-center">
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

      {/* Dock Flutuante quando configurado (oculto se houver serviços selecionados para não empilhar barras) */}
      {estiloBarra === "dock_flutuante" && (
        <StoreNavBar
          tab={tab}
          onChangeTab={setTab}
          estiloBarra="dock_flutuante"
          hidden={selecionados.length > 0 && !loja.pausada}
          isBrutal={isBrutal}
          isLiquidGlass={isLiquidGlass}
        />
      )}

      {/* Sticky Bottom Drawer Bar (Stitch) */}
      {selecionados.length > 0 && !loja.pausada && (
        <div
          className={`zelo-sheet-up fixed right-0 bottom-0 left-0 z-40 px-4 py-3 backdrop-blur-md ${
            isLiquidGlass ? "store-glass-surface" : ""
          }`}
          style={{
            backgroundColor: "color-mix(in srgb, var(--t-surface) 95%, transparent)",
            borderTop: "1px solid var(--t-border)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
          }}
        >
          <div className="mx-auto flex max-w-[480px] items-center justify-between gap-2.5">
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
              <span className="truncate text-xs" style={{ color: "var(--t-muted)" }}>
                {selecionados.length === 1
                  ? `1 serviço • ${totalDuracao} min`
                  : `${selecionados.length} serviços • ${totalDuracao} min`}
              </span>
              <span className="font-mono-num text-xl font-bold leading-tight">
                {formatPrice(totalCentavos)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-12 shrink-0 items-center justify-center gap-2 px-5 text-sm font-semibold shadow-lg transition-transform active:scale-95"
              style={{
                borderRadius: "calc(var(--t-radius) * 0.78)",
                backgroundColor: "var(--t-accent)",
                color: "var(--t-accent-ink)",
                ...(isBrutal ? { border: "2px solid #000000", boxShadow: "3px 3px 0px #000000" } : {}),
              }}
            >
              <span>Escolher horário</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
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
