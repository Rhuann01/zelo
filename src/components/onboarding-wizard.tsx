"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  MapPin,
  Palette,
  Scissors,
  Sparkles,
  Store,
} from "lucide-react";
import { ZeloLogo } from "@/components/zelo-logo";
import {
  NICHO_OPTIONS,
  PRESETS_POR_NICHO,
  TEMA_OPTIONS,
  slugifyNome,
  type PresetServico,
} from "@/lib/schemas/loja";
import { createLojaAction } from "@/app/onboarding/actions";

const NICHO_LABELS: Record<(typeof NICHO_OPTIONS)[number], { title: string; sub: string }> = {
  barbearia: { title: "Barbearia", sub: "Cortes, barba e cuidados" },
  manicure: { title: "Manicure & Unhas", sub: "Nails, fibra e spa" },
  salao: { title: "Salão & Cabelo", sub: "Mechas, corte e terapia" },
  estetica: { title: "Estética & Lash", sub: "Cílios, sobrancelhas" },
  outro: { title: "Outro Espaço", sub: "Atendimento sob medida" },
};

const TEMA_META: Record<
  (typeof TEMA_OPTIONS)[number],
  { label: string; desc: string; bg: string; accent: string }
> = {
  urban: { label: "Urban Noir", desc: "Dark premium", bg: "#0F0F12", accent: "#F59E0B" },
  glam: { label: "Clean Glam", desc: "Estética & Spa", bg: "#FDF8F6", accent: "#BE185D" },
  brutal: { label: "Neo-Brutal", desc: "Visual bold e pop", bg: "#FFFDF4", accent: "#A3E635" },
  slate: { label: "Minimalist Slate", desc: "Clínica moderna", bg: "#FFFFFF", accent: "#2563EB" },
};

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [nicho, setNicho] = useState<(typeof NICHO_OPTIONS)[number]>("barbearia");
  const [servicos, setServicos] = useState<PresetServico[]>(PRESETS_POR_NICHO.barbearia);
  const [cidade, setCidade] = useState("Belo Horizonte");
  const [bairro, setBairro] = useState("");
  const [endereco, setEndereco] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tema, setTema] = useState<(typeof TEMA_OPTIONS)[number]>("urban");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleNomeChange(val: string) {
    setNome(val);
    if (!slugTouched) {
      setSlug(slugifyNome(val));
    }
  }

  function handleNichoSelect(nextNicho: (typeof NICHO_OPTIONS)[number]) {
    setNicho(nextNicho);
    setServicos(PRESETS_POR_NICHO[nextNicho]);
  }

  function toggleServico(index: number) {
    setServicos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await createLojaAction({
        nome,
        slug,
        nicho,
        cidade,
        bairro,
        endereco_texto: endereco,
        whatsapp_loja: whatsapp,
        tema,
        servicos,
      });
      if (res?.error) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[var(--zelo-bg)] pb-24">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-[var(--zelo-bg)]/90 px-4 backdrop-blur-md">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--zelo-card)] text-[var(--zelo-ink)]"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <ZeloLogo size="sm" />
        )}
        <span className="font-mono-num text-xs font-medium text-[var(--zelo-muted)]">
          Passo {step} de 3
        </span>
      </header>

      <div className="mx-auto max-w-[420px] px-4 space-y-5">
        <div className="relative overflow-hidden rounded-2xl bg-[var(--zelo-card)] p-5">
          <div className="hero-grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative z-10 space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--zelo-muted)]">
              <Sparkles className="h-3 w-3 text-[#F59E0B]" />
              14 dias grátis • Sem cartão
            </span>
            <h1 className="text-2xl font-bold tight-heading">
              Configure seu espaço em{" "}
              <span className="font-editorial italic text-[1.75rem] font-normal">
                poucos minutos
              </span>
            </h1>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
                Nome do estabelecimento
              </label>
              <div className="flex h-12 items-center gap-2.5 rounded-xl bg-[var(--zelo-card)] px-3.5 ring-1 ring-[var(--zelo-border)]">
                <Store className="h-4 w-4 text-[var(--zelo-muted)] shrink-0" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Barbearia Don Leon"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2.5">
                <div className="flex items-center gap-1 font-mono-num text-xs min-w-0">
                  <span className="text-[var(--zelo-subtle)]">zelo.app/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugifyNome(e.target.value));
                    }}
                    placeholder="seu-espaco"
                    className="min-w-0 bg-transparent font-bold text-[var(--zelo-ink)] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
                Seu nicho de atuação
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(["barbearia", "manicure", "salao", "estetica"] as const).map((key) => {
                  const active = nicho === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNichoSelect(key)}
                      className={`flex flex-col items-start gap-1 rounded-2xl p-3.5 text-left transition ${
                        active
                          ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                          : "bg-[var(--zelo-card)] text-[var(--zelo-ink)]"
                      }`}
                    >
                      <Scissors className="h-4 w-4 opacity-80" />
                      <span className="text-sm font-bold">{NICHO_LABELS[key].title}</span>
                      <span className="text-[11px] opacity-70">{NICHO_LABELS[key].sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
                  Serviços sugeridos
                </span>
                <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
                  {servicos.length} ativos
                </span>
              </div>
              <div className="space-y-2">
                {servicos.map((srv, idx) => (
                  <div
                    key={srv.nome}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-card)] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{srv.nome}</p>
                      <p className="inline-flex items-center gap-1 font-mono-num text-xs text-[var(--zelo-muted)]">
                        <Clock className="h-3 w-3" />
                        {srv.duracao_min} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-num text-sm font-bold whitespace-nowrap">
                        R$ {(srv.preco_centavos / 100).toFixed(2).replace(".", ",")}
                      </span>
                      {servicos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleServico(idx)}
                          className="rounded-lg bg-[var(--zelo-soft)] px-2 py-1 text-[11px] text-[var(--zelo-muted)]"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (nome.trim().length < 2 || slug.length < 3) {
                  setError("Informe o nome e um link válido para continuar.");
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)]"
            >
              Continuar para Localização
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl bg-[var(--zelo-card)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <MapPin className="h-4 w-4 text-[#F59E0B]" />
                Localização e Contato
              </div>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade (ex: Belo Horizonte)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm outline-none"
              />
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro (ex: Savassi)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm outline-none"
              />
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua e número (opcional)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm outline-none"
              />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp da loja com DDD (ex: 31999998888)"
                className="h-11 w-full rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm font-mono-num outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!bairro.trim() || whatsapp.replace(/\D/g, "").length < 10) {
                  setError("Informe o bairro e o WhatsApp com DDD.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)]"
            >
              Escolher Estilo Visual
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl bg-[var(--zelo-card)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Palette className="h-4 w-4 text-[#F59E0B]" />
                Escolha o tema inicial da sua página
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {TEMA_OPTIONS.map((key) => {
                  const meta = TEMA_META[key];
                  const active = tema === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTema(key)}
                      className={`rounded-xl p-3 text-left transition ${
                        active ? "ring-2 ring-[var(--zelo-ink)]" : "bg-[var(--zelo-soft)]"
                      }`}
                    >
                      <div
                        className="mb-2 flex h-7 w-full items-center justify-between rounded-lg px-2"
                        style={{ backgroundColor: meta.bg }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: meta.accent }}
                        />
                        {active && <Check className="h-3.5 w-3.5 text-[#10B981]" />}
                      </div>
                      <p className="text-xs font-bold">{meta.label}</p>
                      <p className="text-[11px] text-[var(--zelo-muted)]">{meta.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando sua loja...
                </>
              ) : (
                <>
                  Criar Minha Loja no Zelo
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
