"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  List,
  MapPin,
  MessageCircle,
  Plus,
  Scissors,
  Share2,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { ReservaDrawer } from "@/components/reserva-drawer";
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
        {/* Banner da Loja (foto ou degradê automático da logo / cor do perfil) */}
        <div className="h-32 sm:h-36 w-full overflow-hidden">
          <StoreBannerMedia
            capaUrl={loja.capa_url}
            logoUrl={loja.logo_url}
            corPrimaria={loja.cor_primaria}
            alt={`Banner de ${loja.nome}`}
            overlayMode="store"
            priority
          />
        </div>

        {/* Store Profile Info Header (Stitch) */}
        <section className="relative overflow-hidden px-4 pt-3 pb-5 -mt-6">
          <div
            className="pointer-events-none absolute top-0 right-0 h-44 w-44 opacity-15 blur-2xl"
            style={{ background: "radial-gradient(circle, var(--t-accent), transparent 70%)" }}
          />

          <div className="relative z-10 flex flex-col gap-3.5">
            {loja.pausada && (
              <div
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ backgroundColor: "rgba(245, 158, 11, 0.14)", color: "#D97706" }}
              >
                Loja pausada temporariamente — novos agendamentos online indisponíveis no momento.
              </div>
            )}

            <div className="flex items-start gap-3.5">
              {loja.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={loja.logo_url}
                  alt={loja.nome}
                  className="h-16 w-16 shrink-0 object-cover shadow-inner"
                  style={{
                    borderRadius: "calc(var(--t-radius) * 0.85)",
                    backgroundColor: "var(--t-inner)",
                  }}
                />
              ) : (
                <div
                  className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center overflow-hidden shadow-inner"
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

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      loja.pausada ? "bg-[#F59E0B]" : "animate-pulse bg-[#10B981]"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      loja.pausada ? "text-[#D97706]" : "text-[#10B981]"
                    }`}
                  >
                    {loja.pausada ? "Loja pausada" : "Atendimento hoje"}
                  </span>
                </div>
                <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight">{loja.nome}</h1>
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

        {/* Horizontal Underline Navigation Tabs (Stitch) */}
        <nav
          aria-label="Seções da loja"
          className="no-scrollbar w-full overflow-x-auto"
          style={{
            backgroundColor: "var(--t-surface)",
            borderTop: "1px solid var(--t-border)",
            borderBottom: "1px solid var(--t-border)",
          }}
        >
          <div className="flex min-w-max items-center gap-6 px-4">
            {(
              [
                { key: "servicos", label: "Serviços", icon: List },
                { key: "equipe", label: "Equipe & Horários", icon: Users },
                { key: "detalhes", label: "Detalhes & Mapa", icon: MapPin },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="relative flex min-h-[46px] shrink-0 items-center gap-1.5 whitespace-nowrap py-3 text-sm font-semibold transition-colors"
                  style={{ color: active ? "var(--t-accent)" : "var(--t-muted)" }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {active && (
                    <span
                      className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                      style={{ backgroundColor: "var(--t-accent)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

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
                servicos.map((s) => {
                  const selected = selectedIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className="relative flex flex-col justify-between gap-3 overflow-hidden p-4 transition-all"
                      style={{
                        ...cardSurfaceStyle,
                        ...(selected
                          ? {
                              outline: "1.5px solid var(--t-accent)",
                              outlineOffset: "-1.5px",
                            }
                          : {}),
                      }}
                    >
                      {selected && (
                        <div
                          className="absolute top-0 bottom-0 left-0 w-1"
                          style={{ backgroundColor: "var(--t-accent)" }}
                        />
                      )}

                      <div className={`flex items-start gap-3 ${selected ? "pl-1.5" : ""}`}>
                        {s.exibir_imagem && s.imagem_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={s.imagem_url}
                            alt={s.nome}
                            loading="lazy"
                            decoding="async"
                            className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 object-cover"
                            style={{
                              borderRadius: "calc(var(--t-radius) * 0.72)",
                              backgroundColor: "var(--t-inner)",
                            }}
                          />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="text-base font-semibold leading-snug break-words">{s.nome}</h2>
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono-num text-xs"
                              style={{ backgroundColor: "var(--t-inner)", color: "var(--t-muted)" }}
                            >
                              <Clock className="h-3 w-3" />
                              {s.duracao_min} min
                            </span>
                          </div>
                          {s.descricao && (
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--t-muted)" }}>
                              {s.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`flex items-center justify-between pt-1 ${
                          selected ? "pl-1.5" : ""
                        }`}
                      >
                        <div className="flex flex-col">
                          <span
                            className="font-mono-num text-[10px] uppercase tracking-wider"
                            style={{ color: "var(--t-muted)" }}
                          >
                            Valor
                          </span>
                          <span className="font-mono-num text-lg font-bold">
                            {formatPrice(s.preco_centavos)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={loja.pausada}
                          onClick={() => toggleServico(s.id)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                          style={{
                            borderRadius: "calc(var(--t-radius) * 0.72)",
                            backgroundColor: selected ? "var(--t-inner)" : "var(--t-accent)",
                            color: selected ? "var(--t-accent)" : "var(--t-accent-ink)",
                            ...(isBrutal ? { border: "2px solid #000000" } : {}),
                          }}
                        >
                          {selected ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Selecionado</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Adicionar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
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

      {/* Sticky Bottom Drawer Bar (Stitch) */}
      {selecionados.length > 0 && !loja.pausada && (
        <div
          className="zelo-sheet-up fixed right-0 bottom-0 left-0 z-40 px-4 py-3 backdrop-blur-md"
          style={{
            backgroundColor: "color-mix(in srgb, var(--t-surface) 95%, transparent)",
            borderTop: "1px solid var(--t-border)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
          }}
        >
          <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col">
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
