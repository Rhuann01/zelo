"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Link2,
  MapPin,
  Menu,
  Moon,
  QrCode,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";

type ThemeKey = "urban" | "glam" | "brutal" | "slate";
type VitrineFilter = "all" | "barber" | "nails";
type AppMode = "client" | "admin";

interface ThemeMeta {
  label: string;
  bg: string;
  color: string;
  surface: string;
  inner: string;
  border: string;
  muted: string;
  borderW: string;
  shadow: string;
  storeName: string;
  storeInitials: string;
  storeAddress: string;
  browserUrl: string;
  srv1Title: string;
  srv1Price: string;
  srv2Title: string;
  srv2Price: string;
}

const THEMES: Record<ThemeKey, ThemeMeta> = {
  urban: {
    label: "Urban Noir",
    bg: "#0F0F12",
    color: "#F4F4F5",
    surface: "#18181D",
    inner: "#222229",
    border: "#2C2C35",
    muted: "#A1A1AA",
    borderW: "1px",
    shadow: "none",
    storeName: "Barbearia Don Leon",
    storeInitials: "DL",
    storeAddress: "Av. Paulista, 420 • Bela Vista • Aberto hoje 09h–20h",
    browserUrl: "zelo.app/barbearia-don-leon",
    srv1Title: "Corte Degradê na Navalha",
    srv1Price: "R$ 45,00",
    srv2Title: "Barba Completa + Toalha Quente",
    srv2Price: "R$ 35,00",
  },
  glam: {
    label: "Clean Glam",
    bg: "#FDF8F6",
    color: "#2A1D1D",
    surface: "#FFFFFF",
    inner: "#FBF1EE",
    border: "#EFE0DA",
    muted: "#7C6565",
    borderW: "1px",
    shadow: "0 4px 20px rgba(190, 24, 93, 0.05)",
    storeName: "Studio Lumière & Unhas",
    storeInitials: "SL",
    storeAddress: "Rua da Bahia, 1140 • Savassi • Aberto hoje 09h–19h",
    browserUrl: "zelo.app/studio-lumiere",
    srv1Title: "Alongamento em Gel + Cutícula",
    srv1Price: "R$ 110,00",
    srv2Title: "Esmaltação em Gel",
    srv2Price: "R$ 65,00",
  },
  brutal: {
    label: "Neo-Brutal",
    bg: "#FFFDF4",
    color: "#000000",
    surface: "#FFFFFF",
    inner: "#F7F5EA",
    border: "#000000",
    muted: "#27272A",
    borderW: "2px",
    shadow: "4px 4px 0px #000000",
    storeName: "Garage Cut Club",
    storeInitials: "GC",
    storeAddress: "Rua Augusta, 910 • Consolação • Aberto hoje 10h–21h",
    browserUrl: "zelo.app/garage-cut-club",
    srv1Title: "Corte Navalhado + Styling",
    srv1Price: "R$ 55,00",
    srv2Title: "Barba Terapia",
    srv2Price: "R$ 40,00",
  },
  slate: {
    label: "Slate",
    bg: "#FFFFFF",
    color: "#0F172A",
    surface: "#F8FAFC",
    inner: "#F1F5F9",
    border: "#CBD5E1",
    muted: "#64748B",
    borderW: "1px",
    shadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
    storeName: "Atelier Clássico",
    storeInitials: "AC",
    storeAddress: "Av. Contorno, 2800 • Funcionários • Aberto hoje 09h–19h",
    browserUrl: "zelo.app/atelier-classico",
    srv1Title: "Corte Executivo na Tesoura",
    srv1Price: "R$ 60,00",
    srv2Title: "Barba Alinhada",
    srv2Price: "R$ 35,00",
  },
};

const SWATCHES = [
  { hex: "#F59E0B", ink: "#111111", label: "Âmbar" },
  { hex: "#10B981", ink: "#FFFFFF", label: "Esmeralda" },
  { hex: "#BE185D", ink: "#FFFFFF", label: "Rosé" },
  { hex: "#2563EB", ink: "#FFFFFF", label: "Cobalto" },
  { hex: "#A3E635", ink: "#111111", label: "Lima" },
];

const ODOMETER_TIMES = ["14:30", "15:15", "16:40", "09:30", "18:45"];
const PREVIEW_SLOTS = ["14:00", "14:45", "15:30", "16:15"];

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function ZeloMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]">
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 6h14L5 18h14" />
        <circle cx="19" cy="6" r="1.75" fill="#F59E0B" stroke="none" />
      </svg>
    </span>
  );
}

export function LandingPage() {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [odoIndex, setOdoIndex] = useState(0);

  // Interactive Showcase State
  const [appMode, setAppMode] = useState<AppMode>("client");
  const [themeKey, setThemeKey] = useState<ThemeKey>("urban");
  const [accentHex, setAccentHex] = useState("#F59E0B");
  const [accentInk, setAccentInk] = useState("#111111");
  const [radiusPx, setRadiusPx] = useState(12);
  const [selectedBarber, setSelectedBarber] = useState<"Matheus" | "Lucas">("Matheus");
  const [selectedTime, setSelectedTime] = useState("14:45");
  const [extraAdded, setExtraAdded] = useState(false);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);

  // Vitrine preview filter
  const [vitrineFilter, setVitrineFilter] = useState<VitrineFilter>("all");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const id = window.setInterval(() => {
      setOdoIndex((prev) => (prev + 1) % ODOMETER_TIMES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("zelo_theme", next ? "dark" : "light");
    } catch {
      // ignore storage failure
    }
  }

  const theme = THEMES[themeKey];
  const odoStr = ODOMETER_TIMES[odoIndex];
  const basePrice = themeKey === "glam" ? 110 : themeKey === "brutal" ? 55 : themeKey === "slate" ? 60 : 45;
  const extraPrice = themeKey === "glam" ? 65 : themeKey === "brutal" ? 40 : 35;
  const totalPrice = extraAdded ? basePrice + extraPrice : basePrice;
  const totalMin = extraAdded ? 60 : 35;

  return (
    <div className="min-h-screen bg-[var(--zelo-bg)] text-[var(--zelo-ink)] transition-colors duration-200">
      {/* Navbar Flutuante */}
      <div className="sticky top-2.5 sm:top-3 z-40 mx-auto max-w-5xl px-3 sm:px-4">
        <header
          style={{
            backgroundColor: isDark ? "rgba(22, 22, 26, 0.90)" : "rgba(255, 255, 255, 0.92)",
            borderColor: "var(--zelo-border)",
          }}
          className="rounded-2xl border px-3.5 sm:px-4 py-2.5 shadow-sm backdrop-blur-md transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <a href="#topo" className="flex items-center gap-2 text-base font-bold tight-heading shrink-0">
              <ZeloMark />
              <span>Zelo</span>
            </a>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--zelo-muted)]">
              <a href="#estilos" className="hover:text-[var(--zelo-ink)] transition-colors">
                Telas & Estilos
              </a>
              <a href="#recursos" className="hover:text-[var(--zelo-ink)] transition-colors">
                Funcionalidades
              </a>
              <a href="#vitrine" className="hover:text-[var(--zelo-ink)] transition-colors">
                Vitrine Regional
              </a>
              <a href="#precos" className="hover:text-[var(--zelo-ink)] transition-colors">
                Preços
              </a>
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="Alternar modo escuro"
                title="Alternar modo claro/escuro"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] text-[var(--zelo-ink)] transition hover:border-[var(--zelo-ink)] shrink-0"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <Link
                href="/entrar"
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)] transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/entrar?next=/onboarding"
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--zelo-btn-ink)] transition hover:bg-[var(--zelo-btn-hover)] whitespace-nowrap shrink-0"
              >
                Começar grátis
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={mobileMenuOpen}
                className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] text-[var(--zelo-ink)] shrink-0"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-[var(--zelo-border)] space-y-1 text-sm font-medium">
              <a
                href="#estilos"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 hover:bg-[var(--zelo-soft)]"
              >
                Telas & Estilos
              </a>
              <a
                href="#recursos"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 hover:bg-[var(--zelo-soft)]"
              >
                Funcionalidades
              </a>
              <a
                href="#vitrine"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 hover:bg-[var(--zelo-soft)]"
              >
                Vitrine Regional
              </a>
              <a
                href="#precos"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 hover:bg-[var(--zelo-soft)]"
              >
                Preços
              </a>
              <Link
                href="/entrar"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-[var(--zelo-muted)] hover:bg-[var(--zelo-soft)]"
              >
                Entrar na minha conta
              </Link>
            </div>
          )}
        </header>
      </div>

      {/* HERO CENTRALIZADO */}
      <section
        id="topo"
        className="relative overflow-hidden mx-auto max-w-4xl px-4 sm:px-5 pt-16 pb-14 sm:pt-16 sm:pb-12 text-center md:pt-20 md:pb-14"
      >
        <div className="hero-grid-bg pointer-events-none absolute inset-0 -z-10 opacity-70" />

        <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--zelo-card)] p-1 pr-3 text-xs font-medium text-[var(--zelo-muted)] shadow-sm">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 shrink-0">
            NOVO
          </span>
          <span className="truncate">Para barbearias, manicures e estúdios</span>
        </div>

        <h1 className="mx-auto max-w-3xl text-[2.25rem] leading-[1.08] font-bold tight-heading sm:text-6xl sm:leading-[1.08]">
          Sua agenda online{" "}
          <span className="mx-1 inline-flex items-center rounded-xl sm:rounded-2xl bg-[var(--zelo-card)] px-3 sm:px-3.5 py-1 sm:py-1.5 text-2xl sm:text-4xl font-bold align-middle shadow-sm font-mono-num">
            <span className="mr-2 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{odoStr}</span>
          </span>{" "}
          com a{" "}
          <span className="font-editorial italic font-normal text-[2.6rem] sm:text-[4.25rem] text-amber-500">
            cara
          </span>{" "}
          do{" "}
          <span className="relative inline-block whitespace-nowrap">
            seu negócio.
            <span className="absolute left-0 right-0 bottom-0.5 sm:bottom-1 h-2 sm:h-2.5 rounded-full bg-amber-500/25 -z-10" />
          </span>
        </h1>

        <p className="sm:hidden mx-auto mt-5 max-w-xs text-base leading-relaxed text-[var(--zelo-muted)]">
          Sua página exclusiva de agendamento, no seu estilo e com sinal via PIX.
        </p>
        <p className="hidden sm:block mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--zelo-muted)]">
          Crie a página exclusiva do seu negócio com sua cor, seu formato e sua identidade visual. Sem concorrência na
          tela e com sinal via PIX.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/entrar?next=/onboarding"
            className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-[var(--zelo-btn-bg)] px-6 py-3.5 text-sm font-semibold text-[var(--zelo-btn-ink)] shadow-sm transition hover:bg-[var(--zelo-btn-hover)]"
          >
            <GoogleIcon />
            Criar minha loja com Google
          </Link>
          <Link
            href="/explorar"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] px-6 py-3.5 text-sm font-semibold text-[var(--zelo-ink)] transition hover:border-[var(--zelo-ink)]"
          >
            Explorar Vitrine Regional
          </Link>
        </div>

        <div className="mt-3 text-xs text-[var(--zelo-subtle)]">
          14 dias grátis • Sem cartão de crédito • Link próprio sem concorrência
        </div>
      </section>

      {/* SHOWCASE INTERATIVO */}
      <section id="estilos" className="scroll-mt-24 mx-auto max-w-6xl px-3.5 sm:px-5 pb-16 sm:pb-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-xl bg-[var(--zelo-card)] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setAppMode("client")}
              className={`min-h-[40px] rounded-lg px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                appMode === "client"
                  ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                  : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
              }`}
            >
              Tela do Cliente
            </button>
            <button
              type="button"
              onClick={() => setAppMode("admin")}
              className={`min-h-[40px] rounded-lg px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                appMode === "admin"
                  ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                  : "text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
              }`}
            >
              Painel do Dono
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--zelo-card)] px-3 py-1.5 text-xs font-medium text-[var(--zelo-muted)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Prévia interativa ao vivo — clique para testar</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-[20px] bg-[var(--zelo-card)] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.16)]">
          {/* Barra Navegador */}
          <div className="flex items-center justify-between gap-3 bg-[var(--zelo-soft)] px-3 sm:px-4 py-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[var(--zelo-card)] px-3 py-1 text-xs flex-1 sm:flex-initial sm:min-w-[260px] min-w-0 justify-center text-[var(--zelo-muted)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-mono truncate">{theme.browserUrl}</span>
            </div>
            <div className="hidden sm:block text-xs font-medium shrink-0 text-[var(--zelo-subtle)]">
              100% Personalizável
            </div>
          </div>

          {/* Barra de Personalização Ao Vivo */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[var(--zelo-soft)] px-3 sm:px-5 py-3 border-t border-[var(--zelo-border)]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-[var(--zelo-muted)]">Estilo:</span>
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                const active = themeKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeKey(key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                      active
                        ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                        : "bg-[var(--zelo-card)] text-[var(--zelo-ink)] hover:opacity-80"
                    }`}
                  >
                    {THEMES[key].label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--zelo-muted)]">Cor:</span>
                <div className="flex items-center gap-2">
                  {SWATCHES.map((swatch) => {
                    const active = accentHex === swatch.hex;
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => {
                          setAccentHex(swatch.hex);
                          setAccentInk(swatch.ink);
                        }}
                        title={swatch.label}
                        aria-label={`Cor ${swatch.label}`}
                        style={{ backgroundColor: swatch.hex }}
                        className={`h-5 w-5 rounded-full transition ${
                          active ? "ring-2 ring-[var(--zelo-ink)] ring-offset-2 ring-offset-[var(--zelo-soft)]" : "opacity-85 hover:opacity-100"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--zelo-muted)]">Bordas:</span>
                <input
                  type="range"
                  min={2}
                  max={24}
                  value={radiusPx}
                  onChange={(e) => setRadiusPx(Number(e.target.value))}
                  aria-label="Raio das bordas"
                  className="h-1.5 w-20 sm:w-24 cursor-pointer accent-amber-500"
                />
                <span className="w-9 font-mono text-xs font-semibold">{radiusPx}px</span>
              </div>
            </div>
          </div>

          {appMode === "client" ? (
            <div
              style={{ backgroundColor: theme.bg, color: theme.color }}
              className="p-3.5 sm:p-6 md:p-8 transition-colors duration-300"
            >
              <div className="mx-auto max-w-5xl grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-4">
                  <div
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: `${radiusPx}px`,
                      borderWidth: theme.borderW,
                      borderColor: theme.border,
                      borderStyle: "solid",
                      boxShadow: theme.shadow,
                    }}
                    className="p-4 sm:p-5 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            backgroundColor: accentHex,
                            color: accentInk,
                            borderRadius: `${Math.min(radiusPx, 14)}px`,
                          }}
                          className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center text-base sm:text-lg font-bold"
                        >
                          {theme.storeInitials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold leading-snug">{theme.storeName}</h3>
                          <p style={{ color: theme.muted }} className="text-xs mt-0.5">
                            {theme.storeAddress}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500 whitespace-nowrap">
                        PIX para sinal ativo
                      </span>
                    </div>

                    <div className="mt-4 sm:mt-5 flex gap-5 overflow-x-auto no-scrollbar whitespace-nowrap border-b border-current/15 text-xs font-semibold">
                      <span
                        style={{ borderBottom: `2px solid ${accentHex}` }}
                        className="pb-2.5 shrink-0"
                      >
                        Serviços
                      </span>
                      <span style={{ color: theme.muted }} className="pb-2.5 shrink-0">
                        Equipe & Horários
                      </span>
                      <span style={{ color: theme.muted }} className="pb-2.5 shrink-0">
                        Detalhes & Mapa
                      </span>
                      <span style={{ color: theme.muted }} className="pb-2.5 shrink-0">
                        Meus Horários
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div
                        style={{
                          backgroundColor: theme.inner,
                          borderRadius: `${Math.max(4, radiusPx - 2)}px`,
                          color: theme.muted,
                        }}
                        className="px-3.5 py-2.5 text-xs"
                      >
                        Buscar serviço (ex: degradê, barba, gel)...
                      </div>

                      <div
                        style={{
                          backgroundColor: theme.inner,
                          borderRadius: `${Math.max(4, radiusPx - 2)}px`,
                        }}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div>
                          <div className="text-sm font-semibold">{theme.srv1Title}</div>
                          <div style={{ color: theme.muted }} className="text-xs">
                            35 min • Acabamento completo
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                          <span className="text-sm font-bold whitespace-nowrap">{theme.srv1Price}</span>
                          <span
                            style={{
                              backgroundColor: accentHex,
                              color: accentInk,
                              borderRadius: `${Math.max(4, radiusPx - 4)}px`,
                            }}
                            className="px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                          >
                            Selecionado
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setExtraAdded((v) => !v);
                          setPreviewConfirmed(false);
                        }}
                        style={{
                          backgroundColor: theme.inner,
                          borderRadius: `${Math.max(4, radiusPx - 2)}px`,
                        }}
                        className="w-full text-left p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition hover:opacity-95"
                      >
                        <div>
                          <div className="text-sm font-semibold">{theme.srv2Title}</div>
                          <div style={{ color: theme.muted }} className="text-xs">
                            25 min • + Adicionar ao pacote
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 w-full sm:w-auto">
                          <span className="text-sm font-bold whitespace-nowrap">{theme.srv2Price}</span>
                          <span
                            style={{
                              backgroundColor: extraAdded ? accentHex : theme.surface,
                              color: extraAdded ? accentInk : theme.color,
                              borderRadius: `${Math.max(4, radiusPx - 4)}px`,
                            }}
                            className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                          >
                            {extraAdded ? "Adicionado" : "+ Adicionar"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: `${radiusPx}px`,
                      borderWidth: theme.borderW,
                      borderColor: theme.border,
                      borderStyle: "solid",
                      boxShadow: theme.shadow,
                    }}
                    className="p-4 sm:p-5 space-y-4 transition-all"
                  >
                    <div>
                      <div style={{ color: theme.muted }} className="text-xs font-semibold mb-2">
                        Profissional selecionado
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(["Matheus", "Lucas"] as const).map((name) => {
                          const active = selectedBarber === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                setSelectedBarber(name);
                                setPreviewConfirmed(false);
                              }}
                              style={{
                                backgroundColor: active ? accentHex : theme.inner,
                                color: active ? accentInk : theme.color,
                                borderRadius: `${Math.max(4, radiusPx - 4)}px`,
                              }}
                              className="py-2 px-3 text-xs font-semibold flex items-center gap-2 transition"
                            >
                              <span className="h-5 w-5 rounded-full bg-black/15 flex items-center justify-center text-xs font-bold shrink-0">
                                {name[0]}
                              </span>
                              <span className="truncate">{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold">Novembro 2026</span>
                        <span className="text-xs font-semibold underline">Próxima vaga</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
                        {[
                          { d: "Qui", n: "12", bar: "bg-amber-400", active: false, off: false },
                          { d: "Sex", n: "13", bar: "bg-emerald-400", active: true, off: false },
                          { d: "Sáb", n: "14", bar: "bg-rose-500", active: false, off: false },
                          { d: "Dom", n: "15", bar: "bg-zinc-500", active: false, off: true },
                          { d: "Seg", n: "16", bar: "bg-emerald-400", active: false, off: false },
                        ].map((day) => (
                          <div
                            key={day.n}
                            style={{
                              backgroundColor: day.active ? accentHex : theme.inner,
                              color: day.active ? accentInk : theme.color,
                              borderRadius: `${Math.max(4, radiusPx - 4)}px`,
                            }}
                            className={`py-2 ${day.off ? "opacity-40" : ""}`}
                          >
                            <div className="text-xs opacity-80">{day.d}</div>
                            <div className="text-sm font-bold">{day.n}</div>
                            <div className={`mx-auto mt-1 h-1 w-4 rounded-full ${day.bar}`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {PREVIEW_SLOTS.map((slot) => {
                          const active = selectedTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedTime(slot);
                                setPreviewConfirmed(false);
                              }}
                              style={{
                                backgroundColor: active ? accentHex : theme.inner,
                                color: active ? accentInk : theme.color,
                                borderRadius: `${Math.max(4, radiusPx - 4)}px`,
                              }}
                              className="py-2 text-xs font-semibold transition"
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-current/15 pt-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div style={{ color: theme.muted }} className="text-xs truncate">
                          {extraAdded ? "2 serviços" : "1 serviço"} • {totalMin} min • {selectedBarber}
                        </div>
                        <div className="text-lg font-bold font-mono-num">
                          R$ {totalPrice.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewConfirmed(true)}
                        style={{
                          backgroundColor: accentHex,
                          color: accentInk,
                          borderRadius: `${Math.max(4, radiusPx - 4)}px`,
                        }}
                        className="px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition hover:opacity-90"
                      >
                        {previewConfirmed ? `Confirmado ${selectedTime}` : `Confirmar ${selectedTime}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 md:p-8 bg-[var(--zelo-card)] text-[var(--zelo-ink)]">
              <div className="mx-auto max-w-5xl grid grid-cols-1 gap-5 md:grid-cols-12">
                <div className="md:col-span-3 rounded-xl bg-[var(--zelo-soft)] p-3 sm:p-4 text-xs font-medium text-[var(--zelo-muted)]">
                  <div className="text-sm font-bold pb-2 mb-2 border-b border-[var(--zelo-border)] hidden md:block text-[var(--zelo-ink)]">
                    Don Leon Admin
                  </div>
                  <div className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="rounded-lg bg-[var(--zelo-card)] px-3 py-2 font-semibold text-[var(--zelo-ink)] shrink-0">
                      Agenda de Hoje
                    </div>
                    <div className="px-3 py-1.5 shrink-0">Serviços & Presets</div>
                    <div className="px-3 py-1.5 shrink-0">Equipe & Almoço</div>
                    <div className="px-3 py-1.5 shrink-0">Personalizar Estilo</div>
                    <div className="px-3 py-1.5 shrink-0">PIX & Asaas</div>
                  </div>
                </div>

                <div className="md:col-span-9 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold">Agenda — Sexta, 13 de Novembro</h3>
                      <p className="text-xs text-[var(--zelo-muted)]">
                        4 atendimentos confirmados • R$ 215,00 previstos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-lg bg-[var(--zelo-soft)] px-3 py-2 text-xs font-semibold whitespace-nowrap">
                        Bloquear horário
                      </span>
                      <span className="rounded-lg bg-[var(--zelo-btn-bg)] px-3 py-2 text-xs font-semibold text-[var(--zelo-btn-ink)] whitespace-nowrap">
                        + Encaixe manual
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] p-3.5">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <span className="font-mono-num text-sm font-bold shrink-0">14:00</span>
                        <div>
                          <div className="text-sm font-semibold">Rafael Mendes — Corte Degradê + Barba</div>
                          <div className="text-xs text-[var(--zelo-muted)]">
                            Com Matheus • 60 min • Sinal PIX pago (R$ 10)
                          </div>
                        </div>
                      </div>
                      <span className="self-start sm:self-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500 whitespace-nowrap">
                        Confirmado
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)]/50 p-3.5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="font-mono-num text-sm font-bold text-[var(--zelo-subtle)] shrink-0">
                          15:00
                        </span>
                        <div className="text-sm text-[var(--zelo-muted)]">Horário livre na grade pública</div>
                      </div>
                      <span className="text-xs font-semibold text-blue-500 whitespace-nowrap">Disponível</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[var(--zelo-soft)] p-3.5">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <span className="font-mono-num text-sm font-bold shrink-0">16:00</span>
                        <div>
                          <div className="text-sm font-semibold">Gabriel Costa — Corte Social</div>
                          <div className="text-xs text-[var(--zelo-muted)]">
                            Com Lucas • 35 min • Lembrete automático enviado
                          </div>
                        </div>
                      </div>
                      <span className="self-start sm:self-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500 whitespace-nowrap">
                        Confirmado
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BENTO GRID DE FUNCIONALIDADES */}
      <section
        id="recursos"
        className="scroll-mt-24 mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]"
      >
        <div className="max-w-2xl mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tight-heading">
            Feito para vender o seu trabalho, não o da concorrência.
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--zelo-muted)]">
            Todas as ferramentas essenciais para o pequeno negócio rodar profissionalmente no navegador.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-6">
          <div className="rounded-2xl bg-[var(--zelo-card)] md:col-span-3 p-5 sm:p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Link2 className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold">Link exclusivo na bio do Instagram</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
              Quem entra pelo seu link vê apenas os seus serviços, seus horários e a sua marca. Sem propagandas e sem
              indicar outro barbeiro da rua ao lado.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--zelo-card)] md:col-span-3 p-5 sm:p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold">Lembretes automáticos para o cliente não esquecer</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
              Assim que o horário é marcado, o cliente recebe a confirmação direto no celular e por e-mail, já com o link
              pronto para remarcar ou cancelar se precisar.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--zelo-card)] md:col-span-2 p-5 sm:p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <QrCode className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold">Chave PIX da loja</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
              Cadastre sua chave PIX para receber sinal na reserva e reduzir faltas em horários de pico.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--zelo-card)] md:col-span-2 p-5 sm:p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold">Soma automática de tempo</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
              Se o cliente pedir Corte + Barba, o Zelo calcula os minutos juntos e só mostra horários com espaço
              contínuo.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--zelo-card)] md:col-span-2 p-5 sm:p-6">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold">Presets prontos por nicho</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--zelo-muted)]">
              Barbearia ou Manicure? Ao criar a loja, os serviços mais comuns já vêm pré-cadastrados para você só
              ajustar o preço.
            </p>
          </div>
        </div>
      </section>

      {/* NA PRÁTICA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tight-heading">
            Menos mensagem fora de hora. Mais cadeira ocupada.
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--zelo-muted)]">
            Em vez de responder áudio tarde da noite ou dividir tela com concorrentes, seu cliente resolve tudo direto no
            seu link.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-[var(--zelo-soft)] p-6 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--zelo-subtle)]">
                No WhatsApp manual
              </div>

              <div className="rounded-2xl rounded-tl-sm bg-[var(--zelo-card)] p-4 max-w-sm shadow-sm">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--zelo-subtle)]">
                  <span className="font-semibold text-[var(--zelo-muted)]">Cliente</span>
                  <span className="font-mono-num">23:14</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--zelo-muted)]">
                  &ldquo;Opa, tudo bem? Tem horário amanhã depois das 18h? Só vi agora que cheguei do trabalho.&rdquo;
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[var(--zelo-subtle)]">
              Se você demora para responder, o cliente esfria — e se usar app genérico, ele vê outros barbeiros na mesma
              busca.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--zelo-card)] p-6 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Com a sua página no Zelo
                </span>
                <span className="text-xs font-medium text-emerald-500">24h no ar</span>
              </div>

              <div className="rounded-2xl bg-[var(--zelo-soft)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold">Novo horário confirmado</span>
                  </div>
                  <span className="font-mono-num text-[11px] text-[var(--zelo-subtle)]">agora</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Rafael Mendes — Corte Degradê</div>
                    <div className="text-xs mt-0.5 text-[var(--zelo-muted)]">Amanhã às 18:30 • Com Matheus</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-500 whitespace-nowrap">
                    Sinal PIX R$ 10
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
              Só a sua marca na tela, escolha em 3 toques direto da bio do Instagram e lembrete automático antes do
              atendimento.
            </p>
          </div>
        </div>
      </section>

      {/* VITRINE REGIONAL */}
      <section
        id="vitrine"
        className="scroll-mt-24 mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]"
      >
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
          <div className="md:col-span-5 space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              <MapPin className="h-3.5 w-3.5" />
              Vitrine Regional Separada
            </span>
            <h2 className="text-2xl font-bold tight-heading sm:text-3xl">
              Novos clientes também te acham pela sua cidade
            </h2>
            <p className="text-sm leading-relaxed text-[var(--zelo-muted)]">
              Enquanto o seu link direto é fechado só para você, quem pesquisa no site principal do Zelo pode filtrar por
              bairro e categoria para descobrir barbearias e manicures por perto.
            </p>
            <Link
              href="/explorar"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] px-4 py-2 text-xs font-semibold text-[var(--zelo-ink)] transition hover:border-[var(--zelo-ink)]"
            >
              Abrir Vitrine Completa
            </Link>
          </div>

          <div className="md:col-span-7 rounded-2xl bg-[var(--zelo-soft)] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--zelo-card)] px-3 py-1.5 text-xs font-semibold">
                <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Belo Horizonte
              </span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "all", label: "Todas" },
                    { id: "barber", label: "Barbearia" },
                    { id: "nails", label: "Manicure" },
                  ] as const
                ).map((tab) => {
                  const active = vitrineFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVitrineFilter(tab.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
                          : "bg-[var(--zelo-card)] text-[var(--zelo-muted)] hover:text-[var(--zelo-ink)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(vitrineFilter === "all" || vitrineFilter === "barber") && (
                <Link
                  href="/explorar"
                  className="rounded-xl bg-[var(--zelo-card)] p-4 flex flex-col justify-between gap-3 transition hover:opacity-90"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xs font-bold text-[#111111]">
                      DL
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">Barbearia Don Leon</div>
                      <div className="text-xs truncate text-[var(--zelo-muted)]">Bela Vista • Barbearia</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--zelo-border)] text-xs">
                    <span className="font-semibold text-emerald-500">Hoje a partir das 14:00</span>
                    <span className="font-semibold">Agendar →</span>
                  </div>
                </Link>
              )}

              {(vitrineFilter === "all" || vitrineFilter === "nails") && (
                <Link
                  href="/explorar"
                  className="rounded-xl bg-[var(--zelo-card)] p-4 flex flex-col justify-between gap-3 transition hover:opacity-90"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-xs font-bold text-white">
                      NS
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">Novo Stilo Studio & Unhas</div>
                      <div className="text-xs truncate text-[var(--zelo-muted)]">Buritis • Manicure & Gel</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--zelo-border)] text-xs">
                    <span className="font-semibold text-emerald-500">Hoje a partir das 15:30</span>
                    <span className="font-semibold">Agendar →</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PREÇOS */}
      <section
        id="precos"
        className="scroll-mt-24 mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]"
      >
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tight-heading">Preço justo para quem está crescendo</h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--zelo-muted)]">
            14 dias grátis para testar sem cartão. Pagamento seguro via PIX, Boleto ou Cartão.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[var(--zelo-card)] p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--zelo-muted)]">Plano Solo</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold tight-heading font-mono-num">R$ 29</span>
                <span className="text-sm text-[var(--zelo-subtle)]">/mês</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--zelo-muted)]">
                Para quem atende sozinho —{" "}
                <span className="font-semibold text-amber-600">menos que 1 corte por mês</span>.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {[
                  "1 profissional completo",
                  "Link exclusivo + escolha e ajuste de temas",
                  "Agendamentos ilimitados sem baixar app",
                  "Remarcação/cancelamento e chave PIX",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/entrar?next=/onboarding"
              className="mt-7 flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] py-3 text-center text-sm font-semibold text-[var(--zelo-ink)] transition hover:border-[var(--zelo-ink)]"
            >
              Testar 14 dias grátis
            </Link>
          </div>

          <div
            className="rounded-2xl bg-[var(--zelo-card)] p-6 sm:p-7 flex flex-col justify-between shadow-lg"
            style={{ border: "1px solid rgba(245, 158, 11, 0.35)" }}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Plano Estúdio</span>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 whitespace-nowrap">
                  Mais econômico
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold tight-heading font-mono-num">R$ 59</span>
                <span className="text-sm text-[var(--zelo-subtle)]">/mês</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--zelo-muted)]">
                Para equipe de até 5 pessoas —{" "}
                <span className="font-semibold text-amber-600">R$ 11,80 por profissional</span>.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {[
                  "Até 5 barbeiros ou manicures",
                  "Agenda independente + horário de almoço",
                  "Bloqueio rápido de encaixes presenciais",
                  "Lembretes automáticos no celular e por e-mail",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/entrar?next=/onboarding"
              className="mt-7 flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--zelo-btn-bg)] py-3 text-center text-sm font-semibold text-[var(--zelo-btn-ink)] transition hover:bg-[var(--zelo-btn-hover)]"
            >
              Testar equipe 14 dias grátis
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-24 mx-auto max-w-4xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]"
      >
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tight-heading">Dúvidas rápidas antes de começar</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              open: true,
              q: "Meu cliente precisa baixar algum aplicativo para agendar?",
              a: "Não. Seu link abre direto no navegador do celular (Instagram, WhatsApp ou Google) em menos de 1 segundo, e o cliente confirma o horário com a conta Google em 3 toques.",
            },
            {
              open: false,
              q: "Preciso cadastrar cartão de crédito para testar os 14 dias grátis?",
              a: "Não. Você cria sua loja grátis com o Google e testa tudo por 14 dias sem informar cartão. Depois, pode pagar via PIX, Boleto ou Cartão.",
            },
            {
              open: false,
              q: "O dinheiro do sinal via PIX passa pelo Zelo?",
              a: "Não. Você cadastra a chave PIX da sua própria loja, e o valor do sinal cai direto na sua conta sem intermediários ou taxas extras por agendamento.",
            },
            {
              open: false,
              q: "Posso começar atendendo sozinho e adicionar barbeiros depois?",
              a: "Sim. Você pode começar no Plano Solo e, quando sua equipe crescer, mudar para o Plano Estúdio (até 5 profissionais) sem perder seus clientes nem o seu link.",
            },
          ].map((item) => (
            <details key={item.q} open={item.open} className="group rounded-2xl bg-[var(--zelo-card)] p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm sm:text-base font-semibold">
                <span>{item.q}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--zelo-muted)] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--zelo-muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16 border-t border-[var(--zelo-border)]">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--zelo-soft)] p-7 text-center sm:p-10 md:p-14">
          <div className="hero-grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold tight-heading sm:text-4xl">
              Coloque o seu link na bio hoje mesmo.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm sm:text-base leading-relaxed text-[var(--zelo-muted)]">
              14 dias grátis, sem cartão. Crie sua página com o Google e comece a receber agendamentos em minutos.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/entrar?next=/onboarding"
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-[var(--zelo-btn-bg)] px-6 py-3.5 text-sm font-semibold text-[var(--zelo-btn-ink)] transition hover:bg-[var(--zelo-btn-hover)]"
              >
                <GoogleIcon />
                Criar minha loja com Google
              </Link>
              <Link
                href="/explorar"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--zelo-border-strong)] bg-[var(--zelo-card)] px-6 py-3.5 text-sm font-semibold text-[var(--zelo-ink)] transition hover:border-[var(--zelo-ink)]"
              >
                Explorar Vitrine Regional
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--zelo-border)] bg-[var(--zelo-bg)] pt-12 pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5 space-y-4">
              <a href="#topo" className="inline-flex items-center gap-2 text-lg font-bold tight-heading">
                <ZeloMark />
                <span>Zelo</span>
              </a>
              <p className="max-w-xs text-sm leading-relaxed text-[var(--zelo-muted)]">
                Agendamento online e vitrine local para barbearias, manicures e estúdios de beleza.
              </p>

              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--zelo-card)] px-3 py-1 text-xs font-medium text-[var(--zelo-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Todos os sistemas operando
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium text-[var(--zelo-muted)]">
                <a href="mailto:contato@zelo.app" className="text-[var(--zelo-ink)] hover:underline">
                  contato@zelo.app
                </a>
                <span>•</span>
                <Link href="/explorar" className="text-[var(--zelo-ink)] hover:underline">
                  Vitrine Regional
                </Link>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3 text-sm">
              <div className="space-y-3">
                <div className="font-semibold">Produto</div>
                <ul className="space-y-2 text-xs text-[var(--zelo-muted)]">
                  <li>
                    <a href="#recursos" className="hover:underline">
                      Funcionalidades
                    </a>
                  </li>
                  <li>
                    <a href="#estilos" className="hover:underline">
                      Estilos de Loja
                    </a>
                  </li>
                  <li>
                    <Link href="/explorar" className="hover:underline">
                      Vitrine Regional
                    </Link>
                  </li>
                  <li>
                    <a href="#precos" className="hover:underline">
                      Planos e Preços
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="font-semibold">Para Negócios</div>
                <ul className="space-y-2 text-xs text-[var(--zelo-muted)]">
                  <li>
                    <a href="#estilos" className="hover:underline">
                      Barbearias
                    </a>
                  </li>
                  <li>
                    <a href="#estilos" className="hover:underline">
                      Manicures & Unhas
                    </a>
                  </li>
                  <li>
                    <a href="#estilos" className="hover:underline">
                      Salões & Estética
                    </a>
                  </li>
                  <li>
                    <a href="#precos" className="hover:underline">
                      Autônomos
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="font-semibold">Suporte & Legal</div>
                <ul className="space-y-2 text-xs text-[var(--zelo-muted)]">
                  <li>
                    <a href="mailto:contato@zelo.app" className="hover:underline">
                      Central de Ajuda
                    </a>
                  </li>
                  <li>
                    <a href="mailto:contato@zelo.app" className="hover:underline">
                      Fale Conosco
                    </a>
                  </li>
                  <li>
                    <Link href="/termos" className="hover:underline">
                      Termos de Uso
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacidade" className="hover:underline">
                      Privacidade
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[var(--zelo-border)] pt-6 text-xs text-[var(--zelo-subtle)] sm:flex-row">
            <div>© 2026 Zelo. Todos os direitos reservados.</div>
            <div className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span>Português (Brasil)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
