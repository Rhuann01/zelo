"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  revalidateLojaMediaAction,
  saveCustomizacaoAction,
  savePresetBannerAction,
} from "@/app/painel/personalizar/actions";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP, STORE_MEDIA_COMPRESS_CONFIG } from "@/lib/image/compress-webp";
import { showToast } from "@/components/zelo-toast";
import { StoreBannerMedia } from "@/components/ui/store-banner-media";
import { StoreLocationFields } from "@/components/ui/store-location-fields";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes-guard";
import { getBannersForNicho } from "@/lib/banners/catalog";
import type { LojaResumo } from "@/lib/painel/get-painel-context";

const TEMAS = [
  {
    key: "urban",
    label: "Urban Noir",
    desc: "Dark premium",
    barBg: "#111111",
    dot: "#F59E0B",
    tag: "Dark",
    tagColor: "#FFFFFF",
    defaultCor: "#F59E0B",
    defaultRaio: 8,
  },
  {
    key: "glam",
    label: "Clean Glam",
    desc: "Estética & Spa",
    barBg: "#FCE7F3",
    dot: "#BE185D",
    tag: "Rosé",
    tagColor: "#831843",
    defaultCor: "#BE185D",
    defaultRaio: 16,
  },
  {
    key: "brutal",
    label: "Neo-Brutalist",
    desc: "Visual bold e pop",
    barBg: "#ECFCCB",
    dot: "#4D7C0F",
    tag: "Lima Pop",
    tagColor: "#365314",
    defaultCor: "#A3E635",
    defaultRaio: 4,
  },
  {
    key: "slate",
    label: "Minimalist Slate",
    desc: "Clínica moderna",
    barBg: "#DBEAFE",
    dot: "#2563EB",
    tag: "Cobalto",
    tagColor: "#1E40AF",
    defaultCor: "#2563EB",
    defaultRaio: 12,
  },
  {
    key: "liquid_glass",
    label: "Liquid Glass",
    desc: "Apple iOS 26",
    barBg: "linear-gradient(135deg, #F2F2F7 0%, #E0EEFF 100%)",
    dot: "#007AFF",
    tag: "Glass",
    tagColor: "#1C1C1E",
    defaultCor: "#007AFF",
    defaultRaio: 20,
  },
  {
    key: "material_you",
    label: "Material You",
    desc: "Google Material 3",
    barBg: "#ECE6F0",
    dot: "#6750A4",
    tag: "MD3",
    tagColor: "#21005D",
    defaultCor: "#6750A4",
    defaultRaio: 18,
  },
] as const;

const SWATCHES = [
  { color: "#F59E0B", label: "Âmbar" },
  { color: "#BE185D", label: "Rosé" },
  { color: "#2563EB", label: "Cobalto" },
  { color: "#A3E635", label: "Lima" },
];

export function CustomizadorLoja({
  loja,
  isOwner,
  initialLocalizacao,
}: {
  loja: LojaResumo;
  isOwner: boolean;
  initialLocalizacao?: {
    cep?: string;
    endereco_texto: string;
    latitude: number | null;
    longitude: number | null;
  };
}) {
  const [tema, setTema] = useState<LojaResumo["tema"]>(loja.tema);
  const [cor, setCor] = useState(loja.cor_primaria);
  const [raio, setRaio] = useState(loja.raio_borda_px);
  const [estiloCard, setEstiloCard] = useState<LojaResumo["estilo_card"]>(
    loja.estilo_card ?? "preenchido"
  );
  const [estiloBarra, setEstiloBarra] = useState<LojaResumo["estilo_barra"]>(
    loja.estilo_barra ?? "abas"
  );
  const [chavePix, setChavePix] = useState(loja.chave_pix ?? "");
  const [sinalReais, setSinalReais] = useState(
    (loja.sinal_centavos / 100).toFixed(2).replace(".", ",")
  );
  const [cep, setCep] = useState(initialLocalizacao?.cep ?? "");
  const [cidade, setCidade] = useState(loja.cidade);
  const [bairro, setBairro] = useState(loja.bairro);
  const [enderecoTexto, setEnderecoTexto] = useState(
    initialLocalizacao?.endereco_texto ?? ""
  );
  const [latitude, setLatitude] = useState<number | null>(
    initialLocalizacao?.latitude ?? null
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialLocalizacao?.longitude ?? null
  );
  const [logoUrl, setLogoUrl] = useState(loja.logo_url);
  const [capaUrl, setCapaUrl] = useState(loja.capa_url);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [savingPresetBanner, setSavingPresetBanner] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedSnapshot, setSavedSnapshot] = useState({
    tema: loja.tema,
    cor: loja.cor_primaria,
    raio: loja.raio_borda_px,
    estiloCard: loja.estilo_card ?? "preenchido",
    estiloBarra: loja.estilo_barra ?? "abas",
    chavePix: loja.chave_pix ?? "",
    sinalReais: (loja.sinal_centavos / 100).toFixed(2).replace(".", ","),
    cep: initialLocalizacao?.cep ?? "",
    cidade: loja.cidade,
    bairro: loja.bairro,
    enderecoTexto: initialLocalizacao?.endereco_texto ?? "",
    latitude: initialLocalizacao?.latitude ?? null,
    longitude: initialLocalizacao?.longitude ?? null,
  });

  const isDirty =
    isOwner &&
    (tema !== savedSnapshot.tema ||
      cor !== savedSnapshot.cor ||
      raio !== savedSnapshot.raio ||
      estiloCard !== savedSnapshot.estiloCard ||
      estiloBarra !== savedSnapshot.estiloBarra ||
      chavePix !== savedSnapshot.chavePix ||
      sinalReais !== savedSnapshot.sinalReais ||
      cep !== savedSnapshot.cep ||
      cidade !== savedSnapshot.cidade ||
      bairro !== savedSnapshot.bairro ||
      enderecoTexto !== savedSnapshot.enderecoTexto ||
      latitude !== savedSnapshot.latitude ||
      longitude !== savedSnapshot.longitude);

  const accentInk =
    cor.toUpperCase() === "#F59E0B" || cor.toUpperCase() === "#A3E635" ? "#111111" : "#FFFFFF";
  const isBrutal = tema === "brutal";
  const activeSwatch = SWATCHES.find((s) => s.color.toUpperCase() === cor.toUpperCase());

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setUploading(true);
    try {
      const blob = await compressImageToWebP(file, STORE_MEDIA_COMPRESS_CONFIG);
      const supabase = createClient();
      const path = `${loja.id}/logo.webp`;
      const { error: upErr } = await supabase.storage.from("lojas-media").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "31536000",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("lojas-media").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("lojas")
        .update({ logo_url: url })
        .eq("id", loja.id);
      if (dbErr) throw dbErr;

      setLogoUrl(url);
      await revalidateLojaMediaAction(loja.id);
      showToast("Logo atualizada com sucesso.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao enviar logo.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setUploading(true);
    try {
      const supabase = createClient();
      await supabase.storage.from("lojas-media").remove([`${loja.id}/logo.webp`]).catch(() => null);
      const { error: dbErr } = await supabase
        .from("lojas")
        .update({ logo_url: null })
        .eq("id", loja.id);
      if (dbErr) throw dbErr;

      setLogoUrl(null);
      await revalidateLojaMediaAction(loja.id);
      showToast("Logo da loja removida.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao remover logo.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleCapaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setUploadingCapa(true);
    try {
      const blob = await compressImageToWebP(file, STORE_MEDIA_COMPRESS_CONFIG);
      const supabase = createClient();
      const path = `${loja.id}/capa.webp`;
      const { error: upErr } = await supabase.storage.from("lojas-media").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "31536000",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("lojas-media").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("lojas")
        .update({ capa_url: url })
        .eq("id", loja.id);
      if (dbErr) throw dbErr;

      setCapaUrl(url);
      setBannerModalOpen(false);
      await revalidateLojaMediaAction(loja.id);
      showToast("Banner da vitrine atualizado com sucesso.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao enviar banner.", "error");
    } finally {
      setUploadingCapa(false);
    }
  }

  async function handleRemoveCapa() {
    setUploadingCapa(true);
    try {
      const supabase = createClient();
      await supabase.storage.from("lojas-media").remove([`${loja.id}/capa.webp`]).catch(() => null);
      const { error: dbErr } = await supabase
        .from("lojas")
        .update({ capa_url: null })
        .eq("id", loja.id);
      if (dbErr) throw dbErr;

      setCapaUrl(null);
      await revalidateLojaMediaAction(loja.id);
      showToast("Banner removido.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao remover banner.", "error");
    } finally {
      setUploadingCapa(false);
    }
  }

  async function handleSelectPresetBanner(nextCapaUrl: string | null) {
    setSavingPresetBanner(true);
    try {
      const res = await savePresetBannerAction(loja.id, nextCapaUrl);
      if (!res.ok) {
        showToast(res.error ?? "Erro ao atualizar banner.", "error");
        return;
      }
      setCapaUrl(nextCapaUrl);
      setBannerModalOpen(false);
      showToast(
        nextCapaUrl ? "Banner aplicado à vitrine." : "Degradê automático ativado.",
        "success"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar banner.", "error");
    } finally {
      setSavingPresetBanner(false);
    }
  }

  function handlePreset(preset: (typeof TEMAS)[number]) {
    setTema(preset.key);
    setCor(preset.defaultCor);
    setRaio(preset.defaultRaio);
  }

  async function handleSave(): Promise<boolean> {
    const sinalCentavos = Math.max(
      0,
      Math.round(Number(sinalReais.replace(/[^\d,.-]/g, "").replace(",", ".")) * 100) || 0
    );

    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await saveCustomizacaoAction({
          loja_id: loja.id,
          tema,
          cor_primaria: cor,
          raio_borda_px: raio,
          estilo_card: estiloCard,
          estilo_barra: estiloBarra,
          chave_pix: chavePix.trim() || null,
          sinal_centavos: sinalCentavos,
          cidade: cidade.trim(),
          bairro: bairro.trim(),
          endereco_texto: enderecoTexto.trim(),
          cep: cep.trim(),
          latitude,
          longitude,
        });
        if (res.error) {
          showToast(res.error, "error");
          resolve(false);
        } else {
          setSavedSnapshot({
            tema,
            cor,
            raio,
            estiloCard,
            estiloBarra,
            chavePix,
            sinalReais,
            cep,
            cidade,
            bairro,
            enderecoTexto,
            latitude,
            longitude,
          });
          if (res.message) showToast(res.message, "success");
          resolve(true);
        }
      });
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <UnsavedChangesGuard
        isDirty={isDirty}
        isSaving={isPending}
        onSave={handleSave}
      />
      {/* Interactive Storefront Mini Preview */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Eye className="h-[18px] w-[18px] text-[var(--zelo-muted)]" />
            <span className="text-base font-semibold text-[var(--zelo-ink)]">Preview da Loja</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--zelo-soft)] px-2.5 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
            <span className="font-mono-num text-[10px] font-medium text-[var(--zelo-muted)]">
              Ao Vivo
            </span>
          </div>
        </div>

        <div className="w-full rounded-xl bg-[var(--zelo-soft)] p-3 shadow-sm">
          <div
            className={`store-view-base theme-${tema} relative flex w-full flex-col overflow-hidden transition-all duration-200 ${
              refreshing ? "opacity-50" : "opacity-100"
            }`}
            style={{
              backgroundColor: "var(--t-surface)",
              borderRadius: `${raio}px`,
              border: isBrutal ? "2px solid #000000" : undefined,
              boxShadow: isBrutal ? "3px 3px 0px #000000" : "var(--t-shadow)",
            }}
          >
            {/* Banner de fundo atrás do cabeçalho do preview */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 overflow-hidden"
              style={{ "--t-bg": "var(--t-surface)" } as React.CSSProperties}
            >
              <StoreBannerMedia
                capaUrl={capaUrl}
                logoUrl={logoUrl}
                corPrimaria={cor}
                alt={`Banner ${loja.nome}`}
                overlayMode="store"
              />
            </div>

            <div className="relative z-10 flex flex-col gap-2.5 px-3 pt-12 pb-3">
              {/* Brand Header inside Preview */}
              <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={loja.nome}
                  className="h-10 w-10 shrink-0 object-cover shadow-md ring-2 ring-[var(--t-surface)]"
                  style={{ borderRadius: `${Math.max(4, raio - 2)}px` }}
                />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: cor,
                    color: accentInk,
                    borderRadius: `${Math.max(4, raio - 2)}px`,
                    border: isBrutal ? "2px solid #000000" : undefined,
                  }}
                >
                  {loja.nome.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h4
                    className="truncate text-[13px] font-semibold leading-tight"
                    style={{ color: "var(--t-ink)" }}
                  >
                    {loja.nome}
                  </h4>
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: cor }} />
                </div>
                <p className="truncate text-[11px]" style={{ color: "var(--t-muted)" }}>
                  {loja.bairro || "Centro"} • {loja.cidade || "Cidade"}
                </p>
              </div>
              <span
                className="shrink-0 rounded px-2 py-1 font-mono-num text-[10px] font-medium"
                style={{ backgroundColor: "var(--t-inner)", color: "var(--t-ink)" }}
              >
                5.0
              </span>
            </div>

            {estiloBarra === "abas" && (
              <div
                className="flex items-center gap-3 border-b pb-1.5 text-[10px] font-semibold"
                style={{ borderColor: "var(--t-border)", color: "var(--t-muted)" }}
              >
                <span style={{ color: cor }}>Serviços</span>
                <span>Equipe</span>
                <span>Mapa</span>
              </div>
            )}

            {/* Dynamic Mock Service Grid (Preenchido vs Vidro Borrado) */}
            <div className="grid grid-cols-2 gap-2">
              {estiloCard === "vidro_borrado" ? (
                <div
                  className="relative flex h-24 flex-col justify-end overflow-hidden p-2"
                  style={{
                    borderRadius: `${Math.max(6, raio)}px`,
                    background: `linear-gradient(135deg, ${cor}55 0%, #11131A 100%)`,
                    border: isBrutal ? "1.5px solid #000000" : "1px solid var(--t-border)",
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/85 to-transparent backdrop-blur-sm" />
                  <div className="relative z-10 flex items-end justify-between gap-1 text-white">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold">Corte Clássico</p>
                      <p className="font-mono-num text-[10px] font-bold">R$ 45,00</p>
                    </div>
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: cor, color: accentInk }}
                    >
                      +
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="overflow-hidden"
                  style={{
                    backgroundColor: "var(--t-inner)",
                    borderRadius: `${Math.max(6, raio)}px`,
                    border: isBrutal ? "1.5px solid #000000" : "1px solid var(--t-border)",
                  }}
                >
                  <div
                    className="h-10 w-full"
                    style={{ background: `linear-gradient(135deg, ${cor}44 0%, var(--t-surface) 100%)` }}
                  />
                  <div className="flex items-center justify-between gap-1 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold" style={{ color: "var(--t-ink)" }}>
                        Corte Clássico
                      </p>
                      <p className="font-mono-num text-[10px] font-bold" style={{ color: cor }}>
                        R$ 45,00
                      </p>
                    </div>
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: cor, color: accentInk }}
                    >
                      +
                    </span>
                  </div>
                </div>
              )}

              <div
                className="flex flex-col justify-between p-2"
                style={{
                  backgroundColor: "var(--t-inner)",
                  borderRadius: `${Math.max(6, raio)}px`,
                  border: isBrutal ? "1.5px solid #000000" : "1px solid var(--t-border)",
                }}
              >
                <span className="text-[10px] font-semibold" style={{ color: "var(--t-ink)" }}>
                  Barba Completa
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-[10px]" style={{ color: "var(--t-muted)" }}>
                    30 min
                  </span>
                  <span className="font-mono-num text-[10px] font-bold" style={{ color: cor }}>
                    R$ 35
                  </span>
                </div>
              </div>
            </div>

            {estiloBarra === "dock_flutuante" && (
              <div className="flex justify-center pt-0.5">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[9px] font-semibold shadow"
                  style={{
                    backgroundColor: "var(--t-inner)",
                    border: "1px solid var(--t-border)",
                  }}
                >
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: cor, color: accentInk }}
                  >
                    Serviços
                  </span>
                  <span style={{ color: "var(--t-muted)" }}>Equipe</span>
                  <span style={{ color: "var(--t-muted)" }}>Mapa</span>
                </div>
              </div>
            )}

            {/* Micro CTA */}
            <div
              className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold shadow-sm"
              style={{
                backgroundColor: cor,
                color: accentInk,
                borderRadius: `${Math.max(4, raio - 2)}px`,
                border: isBrutal ? "2px solid #000000" : undefined,
              }}
            >
              <span>Agendar Horário</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[var(--zelo-muted)]">
            <span className="font-mono-num text-[10px]">zelo.app/{loja.slug}</span>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 250);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--zelo-ink)] transition-colors hover:text-[var(--zelo-muted)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Recarregar</span>
            </button>
          </div>
        </div>
      </section>

      {!isOwner && (
        <div className="rounded-xl bg-[#F59E0B]/15 px-3.5 py-2.5 text-xs font-medium text-[#D97706]">
          Apenas o proprietário pode alterar o tema e a chave PIX da loja.
        </div>
      )}

      {/* Theme Preset Selector */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--zelo-ink)]">Temas Pré-definidos</h3>
          <span className="font-mono-num text-xs text-[var(--zelo-muted)]">6 estilos</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEMAS.map((t) => {
            const active = tema === t.key;
            return (
              <button
                key={t.key}
                type="button"
                disabled={!isOwner}
                onClick={() => handlePreset(t)}
                className="relative overflow-hidden rounded-xl bg-[var(--zelo-card)] p-3 text-left shadow-sm transition-all"
              >
                <div
                  className="mb-2 flex h-8 w-full items-center justify-between rounded px-2"
                  style={{ background: t.barBg }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: t.dot }}
                  />
                  <span
                    className="font-mono-num text-[9px] font-semibold uppercase tracking-widest"
                    style={{ color: t.tagColor }}
                  >
                    {t.tag}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--zelo-ink)]">{t.label}</p>
                    <p className="text-[11px] text-[var(--zelo-muted)]">{t.desc}</p>
                  </div>
                  {active ? (
                    <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-[var(--zelo-ink)]" />
                  ) : (
                    <Circle className="h-[18px] w-[18px] shrink-0 text-[var(--zelo-border)]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Storefront Layout Choices (Card Style & Nav Bar Style) */}
      <section className="flex flex-col gap-4 rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-[var(--zelo-ink)]">Estilo dos Cards de Serviço</h3>
          <p className="mb-2.5 text-[11px] text-[var(--zelo-muted)]">
            Defina como os serviços aparecem na sua loja.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  key: "preenchido",
                  label: "Preenchido",
                  desc: "Foto em cima e base sólida",
                },
                {
                  key: "vidro_borrado",
                  label: "Vidro Borrado",
                  desc: "Foto inteira com blur no rodapé",
                },
              ] as const
            ).map((opt) => {
              const active = estiloCard === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => setEstiloCard(opt.key)}
                  className={`flex min-h-[58px] flex-col justify-between rounded-xl p-3 text-left transition-all ${
                    active
                      ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                      : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)] hover:bg-[var(--zelo-border)]"
                  }`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[10px] opacity-80">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--zelo-border)]/50 pt-3">
          <h3 className="text-sm font-semibold text-[var(--zelo-ink)]">Barra de Navegação</h3>
          <p className="mb-2.5 text-[11px] text-[var(--zelo-muted)]">
            Escolha entre abas tradicionais ou dock flutuante estilo app.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  key: "abas",
                  label: "Abas Clássicas",
                  desc: "Menu fixo no topo da vitrine",
                },
                {
                  key: "dock_flutuante",
                  label: "Dock Flutuante",
                  desc: "Pílula moderna no rodapé",
                },
              ] as const
            ).map((opt) => {
              const active = estiloBarra === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => setEstiloBarra(opt.key)}
                  className={`flex min-h-[58px] flex-col justify-between rounded-xl p-3 text-left transition-all ${
                    active
                      ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                      : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)] hover:bg-[var(--zelo-border)]"
                  }`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[10px] opacity-80">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Accent Color & Radius Customization Panel */}
      <section className="flex flex-col gap-5 rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--zelo-ink)]">Cor de Acento</span>
            <span className="font-mono-num text-xs text-[var(--zelo-muted)]">
              {activeSwatch ? `${activeSwatch.label} (${cor})` : cor}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {SWATCHES.map((s) => {
              const selected = cor.toUpperCase() === s.color;
              const checkColor = s.color === "#A3E635" || s.color === "#F59E0B" ? "#111111" : "#FFFFFF";
              return (
                <button
                  key={s.color}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => setCor(s.color)}
                  aria-label={`Cor ${s.label}`}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-transform active:scale-90"
                  style={{ backgroundColor: s.color }}
                >
                  {selected && <Check className="h-[18px] w-[18px]" style={{ color: checkColor }} />}
                </button>
              );
            })}
            <label
              title="Escolher cor personalizada"
              aria-label="Escolher cor personalizada"
              className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-sm transition-transform active:scale-90 ${
                !isOwner ? "pointer-events-none opacity-60" : ""
              } ${!activeSwatch ? "ring-2 ring-[var(--zelo-ink)] ring-offset-2 ring-offset-[var(--zelo-card)]" : ""}`}
              style={{
                background:
                  "conic-gradient(from 0deg, #EF4444, #F59E0B, #EAB308, #10B981, #3B82F6, #8B5CF6, #EC4899, #EF4444)",
              }}
            >
              <input
                type="color"
                disabled={!isOwner}
                value={cor}
                onChange={(e) => setCor(e.target.value.toUpperCase())}
                className="sr-only"
              />
              <span
                className="h-4 w-4 rounded-full border-2 border-white shadow-xs"
                style={{ backgroundColor: !activeSwatch ? cor : "#FFFFFF" }}
              />
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--zelo-ink)]">Raio de Borda</span>
            <span className="rounded bg-[var(--zelo-soft)] px-2 py-0.5 font-mono-num text-xs font-medium text-[var(--zelo-ink)]">
              {raio}px
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={24}
            step={2}
            disabled={!isOwner}
            value={raio}
            onChange={(e) => setRaio(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--zelo-soft)] accent-[var(--zelo-ink)]"
            aria-label="Raio de Borda"
          />
          <div className="mt-1.5 flex items-center justify-between font-mono-num text-[10px] text-[var(--zelo-muted)]">
            <span>Reto (2px)</span>
            <span>Equilibrado (12px)</span>
            <span>Pílula (24px)</span>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] text-xs font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4 text-[#F59E0B]" />
              )}
              <span>{uploading ? "Processando..." : logoUrl ? "Alterar Logo" : "Enviar Logo da Loja"}</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            {logoUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleRemoveLogo}
                aria-label="Remover logo da loja"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-3.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/15 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remover</span>
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div className="space-y-2.5 border-t border-[var(--zelo-border)]/50 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[var(--zelo-ink)]">
                  Banner / Capa da Vitrine
                </p>
                <p className="text-[11px] text-[var(--zelo-muted)]">
                  Escolha um banner pronto do seu nicho, envie uma foto ou use o degradê automático da logo.
                </p>
              </div>
            </div>

            <div className="relative h-28 w-full overflow-hidden rounded-xl bg-[var(--zelo-soft)]">
              <StoreBannerMedia
                capaUrl={capaUrl}
                logoUrl={logoUrl}
                corPrimaria={cor}
                alt={`Banner ${loja.nome}`}
                overlayMode="dark"
              />
              {!capaUrl && (
                <div className="absolute inset-0 flex items-end p-2.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                    {logoUrl ? "Degradê automático da logo" : "Degradê automático da cor do perfil"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploadingCapa || savingPresetBanner}
                onClick={() => setBannerModalOpen(true)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)] disabled:opacity-60"
              >
                {uploadingCapa || savingPresetBanner ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-[#10B981]" />
                )}
                <span>
                  {uploadingCapa
                    ? "Processando banner..."
                    : capaUrl
                      ? "Alterar Banner"
                      : "Escolher ou Enviar Banner"}
                </span>
              </button>
              {capaUrl && (
                <button
                  type="button"
                  disabled={uploadingCapa}
                  onClick={handleRemoveCapa}
                  aria-label="Remover banner da loja"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-3.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/15 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remover</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Store PIX Key Configuration */}
      <section className="rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-[18px] w-[18px] text-[var(--zelo-ink)]" />
            <h3 className="text-sm font-semibold text-[var(--zelo-ink)]">Chave PIX da Loja</h3>
          </div>
          {chavePix.trim().length > 3 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#10B981]">
              <CheckCircle2 className="h-3 w-3" />
              Chave Validada
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--zelo-muted)]">
          Recebimento do sinal (depósito caução) cai diretamente na conta da loja, sem taxa de intermediação.
        </p>

        <div className="flex min-h-[48px] items-center justify-between gap-2 rounded-lg bg-[var(--zelo-soft)] px-3.5">
          <input
            type="text"
            disabled={!isOwner}
            value={chavePix}
            onChange={(e) => setChavePix(e.target.value)}
            placeholder="CPF, CNPJ, e-mail ou chave aleatória"
            className="w-full bg-transparent font-mono-num text-sm text-[var(--zelo-ink)] outline-none"
          />
          {chavePix && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(chavePix);
                showToast("Chave PIX copiada!", "info");
              }}
              className="rounded-md p-1.5 text-[var(--zelo-muted)] transition-colors hover:bg-[var(--zelo-border)]"
              title="Copiar chave"
              aria-label="Copiar chave PIX"
            >
              <Copy className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs font-medium text-[var(--zelo-muted)]">Sinal opcional (R$)</span>
          <input
            type="text"
            disabled={!isOwner}
            value={sinalReais}
            onChange={(e) => setSinalReais(e.target.value)}
            placeholder="0,00"
            className="h-10 w-28 rounded-lg bg-[var(--zelo-soft)] px-3 text-right font-mono-num text-sm text-[var(--zelo-ink)] outline-none"
          />
        </div>
      </section>

      {/* Localização & Mapa Real */}
      <section className="flex flex-col gap-3 rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-[18px] w-[18px] text-[var(--zelo-muted)]" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--zelo-ink)]">
              Localização & Mapa
            </span>
            <span className="text-xs text-[var(--zelo-muted)]">
              Exibido na aba Detalhes & Mapa da sua página pública
            </span>
          </div>
        </div>

        <StoreLocationFields
          cep={cep}
          cidade={cidade}
          bairro={bairro}
          endereco={enderecoTexto}
          latitude={latitude}
          longitude={longitude}
          onChangeCep={setCep}
          onChangeCidade={setCidade}
          onChangeBairro={setBairro}
          onChangeEndereco={setEnderecoTexto}
          onChangeCoords={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
          disabled={!isOwner}
          variant="soft"
        />
      </section>

      {isOwner && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] text-sm font-semibold text-[var(--zelo-btn-ink)] shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Personalização e Mapa
        </button>
      )}

      {bannerModalOpen && (
        <div
          className="zelo-fade-in fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="banner-modal-title"
          onClick={() => !uploadingCapa && !savingPresetBanner && setBannerModalOpen(false)}
        >
          <div
            className="zelo-sheet-up flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--zelo-card)] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--zelo-border)]/60 px-4 py-3.5">
              <div>
                <h3 id="banner-modal-title" className="text-sm font-semibold text-[var(--zelo-ink)]">
                  Escolher Banner da Loja
                </h3>
                <p className="text-[11px] text-[var(--zelo-muted)]">
                  Banners prontos do seu nicho + estilos universais, ou envie sua própria foto.
                </p>
              </div>
              <button
                type="button"
                disabled={uploadingCapa || savingPresetBanner}
                onClick={() => setBannerModalOpen(false)}
                aria-label="Fechar galeria de banners"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] transition-transform active:scale-[0.99]">
                  {uploadingCapa ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  <span>{uploadingCapa ? "Enviando foto..." : "Enviar minha própria foto"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingCapa || savingPresetBanner}
                    onChange={handleCapaUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  disabled={uploadingCapa || savingPresetBanner}
                  onClick={() => handleSelectPresetBanner(null)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)] disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                  <span>Usar degradê automático</span>
                </button>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)]">
                  Banners disponíveis para sua loja
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {getBannersForNicho(loja.nicho).map((banner) => {
                    const selected = capaUrl === banner.src;
                    return (
                      <button
                        key={banner.id}
                        type="button"
                        disabled={uploadingCapa || savingPresetBanner}
                        onClick={() => handleSelectPresetBanner(banner.src)}
                        className={`group relative overflow-hidden rounded-xl bg-[var(--zelo-soft)] text-left transition-all ${
                          selected
                            ? "ring-2 ring-[#10B981]"
                            : "hover:opacity-90"
                        }`}
                      >
                        <div className="relative h-24 w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/next-img-element */}
                          <img
                            src={banner.src}
                            alt={banner.label}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                          {selected && (
                            <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-white shadow">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <div className="absolute inset-x-2 bottom-1.5">
                            <p className="truncate text-[11px] font-semibold text-white">
                              {banner.label}
                            </p>
                            <p className="text-[10px] text-white/75">
                              {banner.nicho === "outro" ? "Universal" : "Do seu nicho"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
