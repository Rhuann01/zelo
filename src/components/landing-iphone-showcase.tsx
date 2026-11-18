"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  Bell,
  Calendar,
  Check,
  Clock,
  FileSpreadsheet,
  Link2,
  Plus,
  QrCode,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type ShowcaseStyleKey = "urban" | "glam" | "glass";

interface ShowcaseScreen {
  caption: string;
  subcaption: string;
  src: string;
  alt: string;
  elevated?: boolean;
}

interface StylePreset {
  key: ShowcaseStyleKey;
  label: string;
  navLabel: string;
  screens: [ShowcaseScreen, ShowcaseScreen, ShowcaseScreen];
}

const STYLE_PRESETS: Record<ShowcaseStyleKey, StylePreset> = {
  urban: {
    key: "urban",
    label: "Urban Noir",
    navLabel: "Dock Flutuante",
    screens: [
      {
        caption: "1. Aba Serviços",
        subcaption: "Busca, destaque e grade de serviços",
        src: "/showcase/urban-servicos.webp",
        alt: "Tela de serviços da BarberFlow no tema Urban Noir com dock flutuante",
      },
      {
        caption: "2. Equipe & Horários",
        subcaption: "Profissionais e horário de funcionamento",
        src: "/showcase/urban-equipe.webp",
        alt: "Tela de equipe e horários da BarberFlow no tema Urban Noir",
        elevated: true,
      },
      {
        caption: "3. Detalhes & Mapa",
        subcaption: "Localização, WhatsApp e política de sinal",
        src: "/showcase/urban-mapa.webp",
        alt: "Tela de localização e mapa da BarberFlow no tema Urban Noir",
      },
    ],
  },
  glam: {
    key: "glam",
    label: "Clean Glam",
    navLabel: "Abas Clássicas",
    screens: [
      {
        caption: "1. Aba Serviços",
        subcaption: "Visual rosé leve para estética e unhas",
        src: "/showcase/glam-servicos.webp",
        alt: "Tela de serviços da Gertrude no tema Clean Glam com abas clássicas",
      },
      {
        caption: "2. Equipe & Horários",
        subcaption: "Sobre o espaço, redes sociais e expediente",
        src: "/showcase/glam-equipe.webp",
        alt: "Tela de equipe e horários da Gertrude no tema Clean Glam",
        elevated: true,
      },
      {
        caption: "3. Detalhes & Mapa",
        subcaption: "Endereço completo, mapa e WhatsApp",
        src: "/showcase/glam-mapa.webp",
        alt: "Tela de localização e mapa da Gertrude no tema Clean Glam",
      },
    ],
  },
  glass: {
    key: "glass",
    label: "Liquid Glass",
    navLabel: "Dock Flutuante iOS",
    screens: [
      {
        caption: "1. Aba Serviços",
        subcaption: "Cards em vidro borrado + dock translúcida",
        src: "/showcase/glass-servicos.webp",
        alt: "Tela de serviços da Cabeleireira Leila no tema Liquid Glass",
      },
      {
        caption: "2. Equipe & Horários",
        subcaption: "Profissionais e horários com dock iOS",
        src: "/showcase/glass-equipe.webp",
        alt: "Tela de equipe e horários da Cabeleireira Leila no tema Liquid Glass",
        elevated: true,
      },
      {
        caption: "3. Detalhes & Mapa",
        subcaption: "Mapa integrado e agendamento direto",
        src: "/showcase/glass-mapa.webp",
        alt: "Tela de localização e mapa da Cabeleireira Leila no tema Liquid Glass",
      },
    ],
  },
};

export function LandingIphoneShowcase() {
  const [activeStyle, setActiveStyle] = useState<ShowcaseStyleKey>("urban");
  const [userInteracted, setUserInteracted] = useState(false);
  const [encaixeAdded, setEncaixeAdded] = useState(false);
  const [financeTab, setFinanceTab] = useState<"caixa" | "bolso">("caixa");
  const [ownerAttends, setOwnerAttends] = useState(true);
  const phonesRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);

  const preset = STYLE_PRESETS[activeStyle];

  useEffect(() => {
    if (userInteracted) return;
    const order: ShowcaseStyleKey[] = ["urban", "glam", "glass"];
    const timer = window.setInterval(() => {
      setActiveStyle((prev) => {
        const idx = order.indexOf(prev);
        return order[(idx + 1) % order.length];
      });
    }, 5500);
    return () => window.clearInterval(timer);
  }, [userInteracted]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !phonesRef.current) return;

    gsap.fromTo(
      phonesRef.current.children,
      { y: 14, opacity: 0.65 },
      {
        y: 0,
        opacity: 1,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
        overwrite: "auto",
      }
    );
  }, [activeStyle]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !bentoRef.current) return;

    const el = bentoRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        gsap.fromTo(
          el.children,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.08,
            ease: "power2.out",
          }
        );
        observer.disconnect();
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-10">
      <section
        id="telas-loja"
        className="scroll-mt-24 mx-auto max-w-6xl px-4 sm:px-5 pt-4 pb-10 sm:pb-14 border-t border-[var(--zelo-border)]"
      >
      <div className="pt-10 sm:pt-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
            <Sparkles className="h-3.5 w-3.5" />
            3 telas reais da sua loja no celular
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tight-heading">
            Serviços, equipe e mapa exatamente como o cliente abre.
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--zelo-muted)]">
            Alterne entre os 3 estilos abaixo para ver sua página com abas clássicas ou dock flutuante estilo iPhone.
          </p>
        </div>

        <div className="grid grid-cols-3 w-full md:w-auto shrink-0 gap-1.5 rounded-2xl bg-[var(--zelo-card)] p-1.5 shadow-sm">
          {(Object.keys(STYLE_PRESETS) as ShowcaseStyleKey[]).map((key) => {
            const item = STYLE_PRESETS[key];
            const active = activeStyle === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setUserInteracted(true);
                  setActiveStyle(key);
                }}
                className={`min-h-[40px] rounded-xl px-2.5 sm:px-3.5 py-2 text-center md:text-left transition-all whitespace-nowrap ${
                  active
                    ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                    : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                }`}
              >
                <div className="text-[11px] sm:text-xs font-semibold leading-tight">{item.label}</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-tight truncate">{item.navLabel}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={phonesRef}
        className="mt-8 sm:mt-12 flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 no-scrollbar md:grid md:grid-cols-3 md:gap-7 md:overflow-visible md:pb-0"
      >
        {preset.screens.map((screen) => (
          <div
            key={`${preset.key}-${screen.caption}`}
            className={`snap-center shrink-0 w-[278px] sm:w-[296px] md:w-full flex flex-col items-center ${
              screen.elevated ? "md:-translate-y-3" : ""
            }`}
          >
            <div className="mb-3 text-center">
              <div className="text-xs font-bold tracking-tight text-[var(--zelo-ink)]">
                {screen.caption}
              </div>
              <div className="text-[11px] text-[var(--zelo-muted)]">{screen.subcaption}</div>
            </div>

            <div
              className="relative w-full max-w-[292px] rounded-[42px] p-[9px] shadow-[0_24px_50px_-16px_rgba(0,0,0,0.32)]"
              style={{
                background: "linear-gradient(145deg, #2b2b31 0%, #141418 55%, #26262c 100%)",
              }}
            >
              <div className="overflow-hidden rounded-[34px] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screen.src}
                  alt={screen.alt}
                  width={640}
                  height={1385}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto select-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* BENTO GRID INTERATIVO: POR TRÁS DO BALCÃO (SEM FOTOS EXTRAS) */}
    <section
      id="gestao-bento"
      className="scroll-mt-24 mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]"
    >
      <div className="max-w-2xl mb-8 sm:mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
          <TrendingUp className="h-3.5 w-3.5" />
          Por trás do balcão
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold tight-heading">
          Gestão simples para rodar o dia sem planilhas.
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--zelo-muted)]">
          Clique nos controles abaixo para testar como o painel organiza seus encaixes, repasses da equipe e avisos automáticos.
        </p>
      </div>

      <div ref={bentoRef} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-12">
        {/* Card 1: Agenda em tempo real & Encaixe de balcão */}
        <div className="md:col-span-7 rounded-2xl bg-[var(--zelo-card)] p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Agenda &amp; Encaixe Rápido</span>
              </div>
              <h3 className="mt-1.5 text-base sm:text-lg font-bold">
                Cliente chegou sem marcar? Encaixe em 2 toques.
              </h3>
              <p className="mt-1 text-sm text-[var(--zelo-muted)]">
                O horário bloqueia na hora na página pública para não dar choque com quem agenda online.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEncaixeAdded((v) => !v)}
              className="inline-flex min-h-[38px] shrink-0 self-start items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--zelo-btn-ink)] transition hover:opacity-90 active:scale-95"
            >
              {encaixeAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{encaixeAdded ? "Encaixe salvo" : "Simular encaixe"}</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center rounded-xl bg-[var(--zelo-soft)] p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-red-500">
                14:29
              </span>
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <div className="h-[1.5px] flex-1 bg-red-500/60" />
              <span className="text-[11px] font-medium text-[var(--zelo-muted)]">Agora</span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--zelo-card)] px-3 py-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono-num font-bold text-amber-500 shrink-0">15:00</span>
                <span className="truncate font-semibold">Lucas Almeida — Corte Degradê</span>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 shrink-0">
                PIX OK
              </span>
            </div>

            {encaixeAdded ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs transition-all">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono-num font-bold text-amber-500 shrink-0">15:45</span>
                  <span className="truncate font-semibold">Encaixe de balcão — Barba</span>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 shrink-0">
                  Manual
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--zelo-card)]/60 px-3 py-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono-num font-bold text-[var(--zelo-muted)] shrink-0">15:45</span>
                  <span className="truncate text-[var(--zelo-muted)]">Horário livre na grade pública</span>
                </div>
                <span className="rounded-full bg-[var(--zelo-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--zelo-muted)] shrink-0">
                  Livre
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Ganhos & Fechamento da Equipe */}
        <div className="md:col-span-5 rounded-2xl bg-[var(--zelo-card)] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                <Wallet className="h-3.5 w-3.5" />
                <span>Ganhos &amp; Repasse</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--zelo-muted)]">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>.CSV</span>
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Fechamento automático sem conta errada.
              </h3>
              <p className="mt-1 text-sm text-[var(--zelo-muted)]">
                Separe o que é da casa e o que vai para cada profissional.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--zelo-soft)] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFinanceTab("caixa")}
                className={`min-h-[34px] rounded-lg transition ${
                  financeTab === "caixa"
                    ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
                    : "text-[var(--zelo-muted)]"
                }`}
              >
                Caixa da Casa
              </button>
              <button
                type="button"
                onClick={() => setFinanceTab("bolso")}
                className={`min-h-[34px] rounded-lg transition ${
                  financeTab === "bolso"
                    ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
                    : "text-[var(--zelo-muted)]"
                }`}
              >
                Meu Bolso
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--zelo-soft)] p-4 space-y-2.5">
            <div className="text-[11px] text-[var(--zelo-muted)]">
              {financeTab === "caixa" ? "Bruto da loja (30 dias)" : "Seus ganhos líquidos (30 dias)"}
            </div>
            <div className="font-mono-num text-2xl font-bold">
              {financeTab === "caixa" ? "R$ 4.820,00" : "R$ 3.670,00"}
            </div>
            <div className="flex items-center justify-between pt-2 text-xs border-t border-[var(--zelo-border)]">
              <span className="text-[var(--zelo-muted)]">
                {financeTab === "caixa" ? "Repasse equipe" : "Ticket médio"}
              </span>
              <span className="font-mono-num font-bold text-emerald-500">
                {financeTab === "caixa" ? "R$ 1.150,00" : "R$ 62,00"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Equipe com 1 Link + Chave "Também atendo clientes" */}
        <div className="md:col-span-5 rounded-2xl bg-[var(--zelo-card)] p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <Users className="h-3.5 w-3.5" />
              <span>Equipe &amp; Comissões</span>
            </div>
            <h3 className="mt-1.5 text-base sm:text-lg font-bold">
              Convide barbeiros com 1 link exclusivo.
            </h3>
            <p className="mt-1 text-sm text-[var(--zelo-muted)]">
              Defina a % de comissão de cada pessoa e escolha se você também aparece na vitrine para atender.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setOwnerAttends((v) => !v)}
              className="w-full rounded-xl bg-[var(--zelo-soft)] p-3.5 flex items-center justify-between gap-3 text-left transition hover:opacity-90"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <Store className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold">Também atendo clientes</div>
                  <div className="truncate text-[11px] text-[var(--zelo-muted)]">
                    {ownerAttends ? "Visível na vitrine pública" : "Oculto da vitrine pública"}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                  ownerAttends ? "justify-end bg-emerald-500" : "justify-start bg-zinc-500/40"
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>

            <div className="rounded-xl bg-[var(--zelo-soft)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--zelo-muted)]">
                <Link2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Convite único • Barbeiro</span>
              </span>
              <span className="font-mono-num font-bold">50%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Lembretes automáticos & Sinal PIX */}
        <div className="md:col-span-7 rounded-2xl bg-[var(--zelo-card)] p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <Bell className="h-3.5 w-3.5" />
              <span>Menos faltas, mais previsibilidade</span>
            </div>
            <h3 className="mt-1.5 text-base sm:text-lg font-bold">
              Push no celular, e-mail automático e sinal PIX direto na sua conta.
            </h3>
            <p className="mt-1 text-sm text-[var(--zelo-muted)]">
              O cliente recebe confirmação e link para remarcar sozinho. Você não paga nenhuma taxa por fora ao receber o sinal via PIX.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--zelo-soft)] p-3.5 flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <QrCode className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-bold">PIX direto para você</div>
                <div className="mt-0.5 text-[11px] text-[var(--zelo-muted)]">
                  Usa a chave da loja ou de cada profissional, sem intermediação.
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--zelo-soft)] p-3.5 flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-bold">Lembrete automático</div>
                <div className="mt-0.5 text-[11px] text-[var(--zelo-muted)]">
                  Aviso antes do horário por Web Push e e-mail para zerar esquecimentos.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}
