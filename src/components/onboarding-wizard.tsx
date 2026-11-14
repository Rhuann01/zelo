"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Check,
  Clock,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Plus,
  Scissors,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import {
  NICHO_OPTIONS,
  PRESETS_POR_NICHO,
  TEMA_OPTIONS,
  slugifyNome,
  type PresetServico,
} from "@/lib/schemas/loja";
import { createLojaAction } from "@/app/onboarding/actions";
import { StatusBadge, SurfaceCard } from "@/components/ui";
import { StoreLocationFields } from "@/components/ui/store-location-fields";

const NICHO_META: Record<
  (typeof NICHO_OPTIONS)[number],
  { title: string; sub: string; presetLabel: string }
> = {
  barbearia: {
    title: "Barbearia",
    sub: "Cortes, barba e cuidados",
    presetLabel: "Preset Barbearia",
  },
  manicure: {
    title: "Manicure & Unhas",
    sub: "Nails, fibra e spa",
    presetLabel: "Preset Nails",
  },
  salao: {
    title: "Salão & Cabelo",
    sub: "Mechas, corte e terapia",
    presetLabel: "Preset Salão",
  },
  estetica: {
    title: "Estética & Lash",
    sub: "Cílios, sobrancelhas",
    presetLabel: "Preset Estética",
  },
  outro: {
    title: "Outro Espaço",
    sub: "Atendimento sob medida",
    presetLabel: "Preset Padrão",
  },
};

function NichoIcon({ nicho }: { nicho: (typeof NICHO_OPTIONS)[number] }) {
  switch (nicho) {
    case "barbearia":
      return <Scissors className="h-[18px] w-[18px]" />;
    case "manicure":
      return <Brush className="h-[18px] w-[18px]" />;
    case "salao":
      return <Sparkles className="h-[18px] w-[18px]" />;
    case "estetica":
      return <Palette className="h-[18px] w-[18px]" />;
    default:
      return <Store className="h-[18px] w-[18px]" />;
  }
}

const TEMA_META: Record<
  (typeof TEMA_OPTIONS)[number],
  { label: string; desc: string; bg: string; accent: string; darkCard?: boolean }
> = {
  urban: {
    label: "Urban Noir",
    desc: "Dark premium com destaque âmbar",
    bg: "#0F0F12",
    accent: "#F59E0B",
    darkCard: true,
  },
  glam: {
    label: "Clean Glam",
    desc: "Estética & Spa acolhedor",
    bg: "#FDF8F6",
    accent: "#BE185D",
  },
  brutal: {
    label: "Neo-Brutal",
    desc: "Visual bold e contraste alto",
    bg: "#FFFDF4",
    accent: "#A3E635",
  },
  slate: {
    label: "Minimalist Slate",
    desc: "Clínica & estúdio moderno",
    bg: "#FFFFFF",
    accent: "#2563EB",
  },
};

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface ServicoSelectable extends PresetServico {
  ativo: boolean;
}

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [nicho, setNicho] = useState<(typeof NICHO_OPTIONS)[number]>("barbearia");
  const [servicos, setServicos] = useState<ServicoSelectable[]>(() =>
    PRESETS_POR_NICHO.barbearia.map((s) => ({ ...s, ativo: true }))
  );
  const [novoSrvNome, setNovoSrvNome] = useState("");
  const [novoSrvMin, setNovoSrvMin] = useState("40");
  const [novoSrvPreco, setNovoSrvPreco] = useState("50");
  const [showAddSrv, setShowAddSrv] = useState(false);

  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [endereco, setEndereco] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [tema, setTema] = useState<(typeof TEMA_OPTIONS)[number]>("urban");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveSlug = slugTouched ? slug : slugifyNome(nome);
  const ativosCount = servicos.filter((s) => s.ativo).length;

  const handleNomeChange = (val: string) => {
    setNome(val);
    if (!slugTouched) {
      setSlug(slugifyNome(val));
    }
  };

  const handleSelectNicho = (next: (typeof NICHO_OPTIONS)[number]) => {
    setNicho(next);
    setServicos(PRESETS_POR_NICHO[next].map((s) => ({ ...s, ativo: true })));
  };

  const toggleServico = (idx: number) => {
    setServicos((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ativo: !s.ativo } : s))
    );
  };

  const handleAddCustomServico = () => {
    const trimmed = novoSrvNome.trim();
    if (trimmed.length < 2) {
      setError("Informe o nome do serviço (mínimo 2 letras).");
      return;
    }
    const duracao = Math.max(5, Math.min(480, Number(novoSrvMin) || 30));
    const precoCentavos = Math.max(0, Math.round((Number(novoSrvPreco) || 0) * 100));
    setServicos((prev) => [
      ...prev,
      { nome: trimmed, duracao_min: duracao, preco_centavos: precoCentavos, ativo: true },
    ]);
    setNovoSrvNome("");
    setShowAddSrv(false);
    setError(null);
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (nome.trim().length < 2) {
        setError("Informe o nome do seu estabelecimento.");
        return;
      }
      if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(effectiveSlug)) {
        setError("O link precisa ter pelo menos 3 caracteres (letras, números ou hífen).");
        return;
      }
      if (ativosCount === 0) {
        setError("Deixe pelo menos 1 serviço selecionado para abrir sua vitrine.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (cidade.trim().length < 2 || bairro.trim().length < 2) {
        setError("Informe a cidade e o bairro para aparecer na busca local.");
        return;
      }
      if (whatsapp.replace(/\D/g, "").length < 10) {
        setError("Informe um WhatsApp válido com DDD.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = () => {
    setError(null);
    const servicosAtivos = servicos
      .filter((s) => s.ativo)
      .map(({ nome: n, duracao_min, preco_centavos }) => ({
        nome: n,
        duracao_min,
        preco_centavos,
      }));

    startTransition(async () => {
      const res = await createLojaAction({
        nome: nome.trim(),
        slug: effectiveSlug,
        nicho,
        cidade: cidade.trim(),
        bairro: bairro.trim(),
        endereco_texto: endereco.trim(),
        latitude,
        longitude,
        whatsapp_loja: whatsapp.trim(),
        tema,
        servicos: servicosAtivos,
      });
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  const stepTitles: Record<1 | 2 | 3, string> = {
    1: "Passo 1 de 3 • Dados do Espaço",
    2: "Passo 2 de 3 • Endereço e WhatsApp",
    3: "Passo 3 de 3 • Estilo da Vitrine",
  };

  return (
    <div className="min-h-dvh bg-[var(--zelo-bg)] text-[var(--zelo-ink)] flex flex-col">
      {/* Top Bar estilo Stitch Zelo Express */}
      <header className="sticky top-0 z-30 bg-[var(--zelo-bg)]/90 backdrop-blur-md">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1));
              }}
              className="min-h-[44px] min-w-[44px] -ml-2 inline-flex items-center justify-center rounded-full hover:bg-[var(--zelo-soft)] transition-colors"
              aria-label="Voltar passo"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link
              href="/explorar"
              className="min-h-[44px] min-w-[44px] -ml-2 inline-flex items-center justify-center rounded-full hover:bg-[var(--zelo-soft)] transition-colors"
              aria-label="Voltar para explorar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}

          <div className="text-center min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--zelo-muted)]">
              Onboarding Express
            </span>
            <span className="block text-xs font-semibold truncate">
              {stepTitles[step]}
            </span>
          </div>

          <Link
            href="/explorar"
            className="min-h-[44px] min-w-[44px] -mr-2 inline-flex items-center justify-center rounded-full text-[var(--zelo-muted)] hover:bg-[var(--zelo-soft)] transition-colors"
            aria-label="Fechar onboarding"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>

        {/* Barra de progresso discreta */}
        <div className="max-w-[480px] mx-auto px-4 pb-2">
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 rounded-full transition-colors ${
                  step >= n ? "bg-[var(--zelo-btn-bg)]" : "bg-[var(--zelo-soft)]"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-[480px] w-full mx-auto px-4 pt-3 pb-28 space-y-6">
        {error && (
          <SurfaceCard tone="rose" padding="sm" className="text-xs font-medium">
            {error}
          </SurfaceCard>
        )}

        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold tight-heading leading-tight">
                Configure seu espaço em poucos minutos
              </h1>
              <p className="text-sm text-[var(--zelo-muted)]">
                Personalize a vitrine digital que seus clientes verão ao agendar.
              </p>
              <Link
                href="/explorar"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--zelo-ink)] underline underline-offset-4 pt-1 hover:opacity-80"
              >
                Só quero agendar como cliente — Ir para a Vitrine →
              </Link>
            </div>

            {/* Nome do Estabelecimento + Link preview */}
            <div className="space-y-2">
              <label
                htmlFor="store-name-input"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]"
              >
                Nome do Estabelecimento
              </label>
              <div className="flex items-center gap-2.5 rounded-xl bg-[var(--zelo-card)] px-3.5 h-12 shadow-xs">
                <Store className="h-4 w-4 text-[var(--zelo-subtle)] shrink-0" />
                <input
                  id="store-name-input"
                  type="text"
                  value={nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Barbearia Don Leon"
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[var(--zelo-subtle)]"
                />
              </div>

              <SurfaceCard tone="soft" padding="sm" className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[11px] text-[var(--zelo-muted)]">
                      Seu link exclusivo
                    </span>
                    <div className="font-mono-num text-xs font-semibold truncate">
                      <span className="text-[var(--zelo-muted)]">zelo.app/</span>
                      <span>{effectiveSlug || "meu-espaco"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!slugTouched && (
                      <StatusBadge tone="amber" icon={<Sparkles className="h-3 w-3" />}>
                        Automático
                      </StatusBadge>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingSlug((v) => !v)}
                      className="text-[11px] font-semibold text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)] px-2 py-1 rounded-lg"
                    >
                      {editingSlug ? "OK" : "Editar"}
                    </button>
                  </div>
                </div>

                {editingSlug && (
                  <input
                    type="text"
                    value={effectiveSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugifyNome(e.target.value));
                    }}
                    placeholder="meu-espaco"
                    className="h-10 w-full rounded-lg bg-[var(--zelo-card)] px-3 font-mono-num text-xs outline-none"
                  />
                )}
              </SurfaceCard>
            </div>

            {/* Seu Nicho de Atuação */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]">
                  Seu Nicho de Atuação
                </span>
                <span className="text-xs text-[var(--zelo-muted)]">1 selecionado</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {NICHO_OPTIONS.map((opt) => {
                  const selected = nicho === opt;
                  const meta = NICHO_META[opt];
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectNicho(opt)}
                      className={`flex flex-col items-start p-3.5 rounded-xl text-left transition-all min-h-[96px] ${
                        opt === "outro" ? "col-span-2 min-h-[72px]" : ""
                      } ${
                        selected
                          ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-md"
                          : "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs hover:bg-[var(--zelo-soft)]"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${
                          selected
                            ? "bg-white/15 dark:bg-black/15"
                            : "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]"
                        }`}
                      >
                        <NichoIcon nicho={opt} />
                      </div>
                      <span className="text-sm font-semibold leading-tight">
                        {meta.title}
                      </span>
                      <span
                        className={`text-xs mt-0.5 ${
                          selected ? "opacity-80" : "text-[var(--zelo-muted)]"
                        }`}
                      >
                        {meta.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Serviços Sugeridos */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] truncate">
                    Serviços Sugeridos
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--zelo-soft)] font-mono-num text-[10px] text-[var(--zelo-muted)] shrink-0">
                    {NICHO_META[nicho].presetLabel}
                  </span>
                </div>
                <span className="font-mono-num text-xs text-[var(--zelo-muted)] shrink-0">
                  {ativosCount}/{servicos.length} ativos
                </span>
              </div>

              <div className="space-y-2">
                {servicos.map((srv, idx) => (
                  <button
                    key={`${srv.nome}-${idx}`}
                    type="button"
                    onClick={() => toggleServico(idx)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all min-h-[60px] ${
                      srv.ativo
                        ? "bg-[var(--zelo-card)] shadow-xs"
                        : "bg-[var(--zelo-soft)] opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          srv.ativo
                            ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                            : "bg-[var(--zelo-border)] text-transparent"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold truncate">
                          {srv.nome}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-mono-num text-[var(--zelo-muted)] mt-0.5">
                          <Clock className="h-3 w-3" />
                          {srv.duracao_min} min
                        </span>
                      </div>
                    </div>
                    <span className="font-mono-num text-sm font-semibold shrink-0">
                      {formatBRL(srv.preco_centavos)}
                    </span>
                  </button>
                ))}
              </div>

              {showAddSrv ? (
                <SurfaceCard tone="card" padding="sm" className="space-y-2.5">
                  <input
                    type="text"
                    value={novoSrvNome}
                    onChange={(e) => setNovoSrvNome(e.target.value)}
                    placeholder="Nome do serviço"
                    className="h-10 w-full rounded-lg bg-[var(--zelo-soft)] px-3 text-sm outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={novoSrvMin}
                      onChange={(e) => setNovoSrvMin(e.target.value)}
                      placeholder="Minutos"
                      className="h-10 rounded-lg bg-[var(--zelo-soft)] px-3 text-sm font-mono-num outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={novoSrvPreco}
                      onChange={(e) => setNovoSrvPreco(e.target.value)}
                      placeholder="Preço (R$)"
                      className="h-10 rounded-lg bg-[var(--zelo-soft)] px-3 text-sm font-mono-num outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSrv(false)}
                      className="h-10 flex-1 rounded-lg bg-[var(--zelo-soft)] text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomServico}
                      className="h-10 flex-1 rounded-lg bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] text-xs font-semibold"
                    >
                      Adicionar
                    </button>
                  </div>
                </SurfaceCard>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddSrv(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)] py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar outro serviço agora</span>
                </button>
              )}

              <p className="text-xs text-[var(--zelo-muted)] px-1">
                Você poderá ajustar preços, durações e criar novas opções a qualquer momento.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold tight-heading leading-tight">
                Onde seus clientes te encontram?
              </h1>
              <p className="text-sm text-[var(--zelo-muted)]">
                Usamos sua cidade e bairro na vitrine do Zelo e enviamos seu contato para clientes confirmados.
              </p>
            </div>

            <div className="space-y-4">
              <StoreLocationFields
                cidade={cidade}
                bairro={bairro}
                endereco={endereco}
                latitude={latitude}
                longitude={longitude}
                onChangeCidade={setCidade}
                onChangeBairro={setBairro}
                onChangeEndereco={setEndereco}
                onChangeCoords={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                variant="card"
              />

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
                  WhatsApp da Loja (com DDD)
                </label>
                <div className="flex items-center gap-2.5 rounded-xl bg-[var(--zelo-card)] px-3.5 h-12 shadow-xs">
                  <Phone className="h-4 w-4 text-[var(--zelo-subtle)] shrink-0" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(31) 99999-9999"
                    className="w-full bg-transparent text-sm font-mono-num outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold tight-heading leading-tight">
                Escolha o estilo da sua página
              </h1>
              <p className="text-sm text-[var(--zelo-muted)]">
                Sua página já nasce pronta em <span className="font-mono-num font-semibold">zelo.app/{effectiveSlug}</span>. Você pode personalizar tudo depois.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {TEMA_OPTIONS.map((t) => {
                const meta = TEMA_META[t];
                const selected = tema === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTema(t)}
                    className={`flex items-center justify-between gap-3 p-4 rounded-2xl text-left transition-all min-h-[72px] ${
                      selected
                        ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-md"
                        : "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/10"
                        style={{ backgroundColor: meta.bg }}
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: meta.accent }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold">{meta.label}</span>
                        <span
                          className={`block text-xs ${
                            selected ? "opacity-80" : "text-[var(--zelo-muted)]"
                          }`}
                        >
                          {meta.desc}
                        </span>
                      </div>
                    </div>
                    {selected && <Check className="h-5 w-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA Bar fixo estilo Stitch */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--zelo-bg)]/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-[480px] mx-auto px-4 pt-2 pb-1">
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full h-12 rounded-xl bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform"
            >
              <span>{step === 1 ? "Continuar para Localização" : "Continuar para Estilo"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              className="w-full h-12 rounded-xl bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Criando sua loja...</span>
                </>
              ) : (
                <>
                  <span>Publicar minha página no Zelo</span>
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
