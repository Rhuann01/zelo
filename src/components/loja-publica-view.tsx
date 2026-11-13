"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import {
  getAccentInk,
  type LojaPublica,
  type ProfissionalPublico,
  type ServicoPublico,
} from "@/lib/public/get-loja-publica";

const NICHO_LABEL: Record<LojaPublica["nicho"], string> = {
  barbearia: "Barbearia",
  manicure: "Manicure & Unhas",
  salao: "Salão & Cabelo",
  estetica: "Estética & Lash",
  outro: "Espaço de Atendimento",
};

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

  const accentInk = getAccentInk(loja.cor_primaria);
  const isBrutal = loja.tema === "brutal";
  const inicial = (loja.nome.trim()[0] || "Z").toUpperCase();

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

  const mapsHref =
    loja.maps_url ||
    (loja.endereco_texto || loja.cidade
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [loja.nome, loja.endereco_texto, loja.bairro, loja.cidade].filter(Boolean).join(", ")
        )}`
      : null);

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
    ...(isBrutal
      ? { border: "var(--t-border-w) solid var(--t-border)" }
      : {}),
  };

  return (
    <div
      className={`store-view-base theme-${loja.tema} min-h-screen`}
      style={
        {
          "--t-accent": loja.cor_primaria,
          "--t-accent-ink": accentInk,
          "--t-radius": `${loja.raio_borda_px}px`,
        } as React.CSSProperties
      }
    >
      {/* Top Minimal Nav */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ backgroundColor: "color-mix(in srgb, var(--t-bg) 88%, transparent)" }}
      >
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4">
          <Link
            href="/explorar"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--t-muted)" }}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Explorar</span>
          </Link>
          <span
            className="rounded-full px-2.5 py-1 font-mono-num text-[11px] font-semibold"
            style={{ backgroundColor: "var(--t-inner)", color: "var(--t-muted)" }}
          >
            zelo.app/{loja.slug}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-4 pt-2 pb-32 space-y-5">
        {/* Store Hero Card */}
        <section className="p-4 space-y-4" style={cardSurfaceStyle}>
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
                className="h-16 w-16 shrink-0 object-cover"
                style={{
                  borderRadius: "calc(var(--t-radius) * 0.85)",
                  backgroundColor: "var(--t-inner)",
                }}
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center text-xl font-bold"
                style={{
                  borderRadius: "calc(var(--t-radius) * 0.85)",
                  backgroundColor: "var(--t-accent)",
                  color: "var(--t-accent-ink)",
                }}
              >
                {inicial}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-bold tracking-tight">{loja.nome}</h1>
                <BadgeCheck
                  className="h-[18px] w-[18px] shrink-0"
                  style={{ color: "var(--t-accent)" }}
                />
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>
                {NICHO_LABEL[loja.nicho]}
              </p>
              {(loja.bairro || loja.cidade) && (
                <p
                  className="flex items-center gap-1 truncate text-xs"
                  style={{ color: "var(--t-muted)" }}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {[loja.bairro, loja.cidade].filter(Boolean).join(" • ")}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {(whatsappHref || mapsHref) && (
            <div className="flex items-center gap-2 pt-1">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 px-3 text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--t-inner)",
                    color: "var(--t-ink)",
                    borderRadius: "calc(var(--t-radius) * 0.75)",
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 px-3 text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--t-inner)",
                    color: "var(--t-ink)",
                    borderRadius: "calc(var(--t-radius) * 0.75)",
                  }}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Ver mapa</span>
                </a>
              )}
            </div>
          )}
        </section>

        {/* Horizontal Scrollable Tabs (Mobile 360px+ safe) */}
        <nav
          aria-label="Seções da loja"
          className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
        >
          {(
            [
              { key: "servicos", label: `Serviços (${servicos.length})`, icon: Scissors },
              { key: "equipe", label: `Equipe & Horários`, icon: Users },
              { key: "detalhes", label: "Detalhes & Mapa", icon: Store },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-4 text-xs font-semibold transition-all"
                style={{
                  borderRadius: "calc(var(--t-radius) * 0.75)",
                  backgroundColor: active ? "var(--t-accent)" : "var(--t-surface)",
                  color: active ? "var(--t-accent-ink)" : "var(--t-muted)",
                  ...(isBrutal && active ? { border: "2px solid #000000", boxShadow: "2px 2px 0px #000000" } : {}),
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* TAB 1: SERVIÇOS */}
        {tab === "servicos" && (
          <section className="space-y-2.5">
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
                  <button
                    key={s.id}
                    type="button"
                    disabled={loja.pausada}
                    onClick={() => toggleServico(s.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition-all active:scale-[0.99] disabled:opacity-60"
                    style={{
                      ...cardSurfaceStyle,
                      ...(selected
                        ? {
                            outline: `2px solid var(--t-accent)`,
                            outlineOffset: "-2px",
                          }
                        : {}),
                    }}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-bold">{s.nome}</p>
                      {s.descricao && (
                        <p className="line-clamp-2 text-xs" style={{ color: "var(--t-muted)" }}>
                          {s.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 font-mono-num text-xs">
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: "var(--t-muted)" }}
                        >
                          <Clock className="h-3 w-3" />
                          {s.duracao_min} min
                        </span>
                        <span style={{ color: "var(--t-muted)" }}>•</span>
                        <span className="font-bold">{formatPrice(s.preco_centavos)}</span>
                      </div>
                    </div>

                    <span
                      className="inline-flex h-9 shrink-0 items-center gap-1 px-3 text-xs font-semibold transition-colors"
                      style={{
                        borderRadius: "calc(var(--t-radius) * 0.7)",
                        backgroundColor: selected ? "var(--t-accent)" : "var(--t-inner)",
                        color: selected ? "var(--t-accent-ink)" : "var(--t-ink)",
                      }}
                    >
                      {selected ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Selecionado</span>
                        </>
                      ) : (
                        <span>Escolher</span>
                      )}
                    </span>
                  </button>
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
                <div className="p-4 text-xs" style={{ ...cardSurfaceStyle, color: "var(--t-muted)" }}>
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
                    <div
                      key={key}
                      className="flex items-center justify-between py-1 text-xs"
                    >
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
            <div className="space-y-1">
              <h2 className="text-sm font-bold">Localização</h2>
              <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {[loja.endereco_texto, loja.bairro, loja.cidade].filter(Boolean).join(" • ") ||
                  "Endereço não informado."}
              </p>
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold underline underline-offset-2"
                  style={{ color: "var(--t-ink)" }}
                >
                  <span>Abrir no Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
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

        {/* Minimal Footer */}
        <footer className="pt-4 text-center">
          <Link
            href="/"
            className="text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--t-muted)" }}
          >
            Agendamento online por <strong style={{ color: "var(--t-ink)" }}>Zelo</strong>
          </Link>
        </footer>
      </main>

      {/* Sticky Bottom Booking Bar */}
      {selecionados.length > 0 && !loja.pausada && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 px-4 py-3 backdrop-blur-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--t-surface) 92%, transparent)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">
                {selecionados.length === 1
                  ? selecionados[0].nome
                  : `${selecionados.length} serviços selecionados`}
              </p>
              <p className="font-mono-num text-xs" style={{ color: "var(--t-muted)" }}>
                {totalDuracao} min •{" "}
                <strong style={{ color: "var(--t-ink)" }}>{formatPrice(totalCentavos)}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-4 text-xs font-bold transition-transform active:scale-95"
              style={{
                borderRadius: "calc(var(--t-radius) * 0.78)",
                backgroundColor: "var(--t-accent)",
                color: "var(--t-accent-ink)",
                ...(isBrutal ? { border: "2px solid #000000", boxShadow: "3px 3px 0px #000000" } : {}),
              }}
            >
              <Calendar className="h-4 w-4" />
              <span>Escolher Horário</span>
            </button>
          </div>
        </div>
      )}

      {/* Etapa 3 -> Etapa 4 Handoff Sheet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4">
          <div
            className="w-full max-w-[480px] p-5 space-y-4"
            style={{
              ...cardSurfaceStyle,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Resumo da Reserva</h2>
                <p className="font-mono-num text-xs" style={{ color: "var(--t-muted)" }}>
                  {totalDuracao} min • {formatPrice(totalCentavos)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar"
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--t-inner)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {profissionais.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>
                  Profissional
                </span>
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                  {profissionais.map((p) => {
                    const active = selectedProfId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProfId(p.id)}
                        className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-xs font-semibold transition-all"
                        style={{
                          borderRadius: "calc(var(--t-radius) * 0.7)",
                          backgroundColor: active ? "var(--t-accent)" : "var(--t-inner)",
                          color: active ? "var(--t-accent-ink)" : "var(--t-ink)",
                        }}
                      >
                        <span>{p.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              className="p-3.5 text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--t-inner)",
                borderRadius: "calc(var(--t-radius) * 0.75)",
                color: "var(--t-muted)",
              }}
            >
              A grade de horários livres em tempo real e a reserva blindada com 1 clique entram na{" "}
              <strong style={{ color: "var(--t-ink)" }}>Etapa 4</strong>.
            </div>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[46px] w-full items-center justify-center gap-2 text-sm font-bold transition-opacity hover:opacity-90"
                style={{
                  borderRadius: "calc(var(--t-radius) * 0.78)",
                  backgroundColor: "var(--t-accent)",
                  color: "var(--t-accent-ink)",
                }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Combinar horário no WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
