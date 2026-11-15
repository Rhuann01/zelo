"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  ImagePlus,
  Instagram,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  Moon,
  Music2,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
  Youtube,
} from "lucide-react";
import {
  atualizarDescricaoLinksLojaAction,
  atualizarSlugLojaAction,
  revalidateLojaMediaAction,
  saveCustomizacaoAction,
  savePresetBannerAction,
} from "@/app/painel/personalizar/actions";
import {
  LINK_PUBLICO_DEFAULT_LABEL,
  LINK_PUBLICO_TIPOS,
  type LinkPublico,
  type LinkPublicoTipo,
} from "@/lib/schemas/loja-links";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP, STORE_MEDIA_COMPRESS_CONFIG } from "@/lib/image/compress-webp";
import { showToast } from "@/components/zelo-toast";
import { StoreBannerMedia } from "@/components/ui/store-banner-media";
import { StoreLocationFields } from "@/components/ui/store-location-fields";
import { StockPhotoSearch } from "@/components/ui/stock-photo-search";
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
  initialSobre,
}: {
  loja: LojaResumo;
  isOwner: boolean;
  initialLocalizacao?: {
    cep?: string;
    endereco_texto: string;
    latitude: number | null;
    longitude: number | null;
  };
  initialSobre?: {
    descricao_publica: string;
    links_publicos: LinkPublico[];
  };
}) {
  const [nomeLoja, setNomeLoja] = useState(loja.nome);
  const [tema, setTema] = useState<LojaResumo["tema"]>(loja.tema);
  const [cor, setCor] = useState(loja.cor_primaria);
  const [raio, setRaio] = useState(loja.raio_borda_px);
  const [estiloCard, setEstiloCard] = useState<LojaResumo["estilo_card"]>(
    loja.estilo_card ?? "preenchido"
  );
  const [estiloBarra, setEstiloBarra] = useState<LojaResumo["estilo_barra"]>(
    loja.estilo_barra ?? "abas"
  );
  const [modoEscuro, setModoEscuro] = useState(Boolean(loja.modo_escuro));
  const [pixModo, setPixModo] = useState<"loja" | "profissional">(
    loja.pix_modo ?? "loja"
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
  const [bannerTab, setBannerTab] = useState<"prontos" | "pexels">("prontos");
  const [savingPresetBanner, setSavingPresetBanner] = useState(false);
  const [slugAtual, setSlugAtual] = useState(loja.slug);
  const [slugInput, setSlugInput] = useState(loja.slug);
  const [savingSlug, setSavingSlug] = useState(false);
  const [descricaoPublica, setDescricaoPublica] = useState(
    initialSobre?.descricao_publica ?? ""
  );
  const [linksPublicos, setLinksPublicos] = useState<LinkPublico[]>(
    initialSobre?.links_publicos ?? []
  );
  const [savingSobre, setSavingSobre] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedSnapshot, setSavedSnapshot] = useState({
    nomeLoja: loja.nome,
    tema: loja.tema,
    cor: loja.cor_primaria,
    raio: loja.raio_borda_px,
    estiloCard: loja.estilo_card ?? "preenchido",
    estiloBarra: loja.estilo_barra ?? "abas",
    modoEscuro: Boolean(loja.modo_escuro),
    pixModo: loja.pix_modo ?? "loja",
    chavePix: loja.chave_pix ?? "",
    sinalReais: (loja.sinal_centavos / 100).toFixed(2).replace(".", ","),
    cep: initialLocalizacao?.cep ?? "",
    cidade: loja.cidade,
    bairro: loja.bairro,
    enderecoTexto: initialLocalizacao?.endereco_texto ?? "",
    latitude: initialLocalizacao?.latitude ?? null,
    longitude: initialLocalizacao?.longitude ?? null,
  });

  const modoEscuroLocked = tema === "glam" || tema === "urban";
  const effectiveDark = !modoEscuroLocked && modoEscuro;

  const isDirty =
    isOwner &&
    (nomeLoja !== savedSnapshot.nomeLoja ||
      tema !== savedSnapshot.tema ||
      cor !== savedSnapshot.cor ||
      raio !== savedSnapshot.raio ||
      estiloCard !== savedSnapshot.estiloCard ||
      estiloBarra !== savedSnapshot.estiloBarra ||
      modoEscuro !== savedSnapshot.modoEscuro ||
      pixModo !== savedSnapshot.pixModo ||
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
        contentType: blob.type || "image/webp",
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
        contentType: blob.type || "image/webp",
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
          nome: nomeLoja.trim(),
          tema,
          cor_primaria: cor,
          raio_borda_px: raio,
          estilo_card: estiloCard,
          estilo_barra: estiloBarra,
          modo_escuro: modoEscuroLocked ? false : modoEscuro,
          pix_modo: pixModo,
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
            nomeLoja: nomeLoja.trim(),
            tema,
            cor,
            raio,
            estiloCard,
            estiloBarra,
            modoEscuro,
            pixModo,
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
    <div className="flex flex-col gap-5 pb-20">
      <UnsavedChangesGuard
        isDirty={isDirty}
        isSaving={isPending}
        onSave={handleSave}
      />

      {/* Link curto / Personalizado para Bio do Instagram */}
      <section className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--zelo-ink)]">
              Link da Loja (Bio do Instagram)
            </h2>
            <p className="text-xs text-[var(--zelo-muted)]">
              Use um nome curtinho para não cortar no perfil do Instagram.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const url = `${window.location.origin}/${slugAtual}`;
              try {
                await navigator.clipboard.writeText(url);
                showToast("Link da bio copiado!", "success", "copy");
              } catch {
                showToast("Não foi possível copiar o link.", "error");
              }
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] transition hover:opacity-85"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copiar link</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 items-center rounded-xl bg-[var(--zelo-soft)] px-3 h-11 min-w-0">
            <span className="text-xs font-mono-num text-[var(--zelo-muted)] shrink-0 mr-0.5">
              /
            </span>
            <input
              type="text"
              value={slugInput}
              disabled={!isOwner || savingSlug}
              onChange={(e) =>
                setSlugInput(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                )
              }
              placeholder="ex: barber"
              className="w-full bg-transparent text-sm font-mono-num text-[var(--zelo-ink)] outline-none"
            />
          </div>
          {isOwner && (
            <button
              type="button"
              disabled={savingSlug || slugInput === slugAtual || slugInput.length < 3}
              onClick={async () => {
                setSavingSlug(true);
                const res = await atualizarSlugLojaAction(loja.id, slugInput);
                setSavingSlug(false);
                if (!res.ok || !res.slug) {
                  showToast(res.error ?? "Erro ao atualizar link.", "error");
                } else {
                  setSlugAtual(res.slug);
                  setSlugInput(res.slug);
                  showToast(`Link atualizado para /${res.slug}!`, "success", "store");
                }
              }}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)] transition hover:opacity-90 disabled:opacity-45"
            >
              {savingSlug ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Salvar link</span>
            </button>
          )}
        </div>
      </section>

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
            className={`store-view-base theme-${tema} ${
              effectiveDark ? "theme-dark-override" : ""
            } relative flex w-full flex-col overflow-hidden transition-all duration-200 ${
              refreshing ? "opacity-50" : "opacity-100"
            }`}
            style={
              {
                "--t-accent": cor,
                backgroundColor: "var(--t-bg)",
                borderRadius: `${raio}px`,
                border: isBrutal ? "2px solid #000000" : undefined,
                boxShadow: isBrutal ? "3px 3px 0px #000000" : "var(--t-shadow)",
              } as React.CSSProperties
            }
          >
            <div className="relative z-10 flex flex-col gap-2.5 p-3">
              {/* App-Style Top Header */}
              <div className="flex items-center gap-2.5">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={loja.nome}
                    className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/10"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: cor,
                      color: accentInk,
                      border: isBrutal ? "2px solid #000000" : undefined,
                    }}
                  >
                    {loja.nome.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px]" style={{ color: "var(--t-muted)" }}>
                    {loja.bairro || "Centro"} • {loja.cidade || "Cidade"}
                  </p>
                  <div className="flex items-center gap-1">
                    <h4
                      className="truncate text-[13px] font-semibold leading-tight"
                      style={{ color: "var(--t-ink)" }}
                    >
                      {nomeLoja || loja.nome}
                    </h4>
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: cor }} />
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 font-mono-num text-[10px] font-semibold"
                  style={{ backgroundColor: "var(--t-surface)", color: "var(--t-ink)" }}
                >
                  5.0
                </span>
              </div>

              {/* Banner Promocional Condicional (só aparece se houver banner) */}
              {capaUrl && (
                <div
                  className="relative h-16 w-full overflow-hidden rounded-xl"
                  style={{
                    border: isBrutal ? "1.5px solid #000000" : undefined,
                  }}
                >
                  <img
                    src={capaUrl}
                    alt={`Banner ${loja.nome}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
                  <div className="relative z-10 flex h-full items-center justify-between px-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-white">
                        {nomeLoja || loja.nome}
                      </p>
                      <p className="text-[9px] text-white/80">Agende em segundos</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold"
                      style={{ backgroundColor: cor, color: accentInk }}
                    >
                      Agendar
                    </span>
                  </div>
                </div>
              )}

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

              {/* Dynamic Mock Service Grid (ambos os cards respeitam estiloCard e tema claro/escuro) */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    nome: "Corte Clássico",
                    preco: "R$ 45,00",
                    duracao: "35 min",
                    bg: `linear-gradient(145deg, color-mix(in srgb, ${cor} 16%, var(--t-surface)) 0%, var(--t-inner) 100%)`,
                  },
                  {
                    nome: "Barba Completa",
                    preco: "R$ 35,00",
                    duracao: "30 min",
                    bg: `linear-gradient(145deg, var(--t-inner) 0%, color-mix(in srgb, ${cor} 16%, var(--t-surface)) 100%)`,
                  },
                ].map((item) =>
                  estiloCard === "vidro_borrado" ? (
                    <div
                      key={item.nome}
                      className="relative flex h-24 flex-col justify-end overflow-hidden p-2"
                      style={{
                        borderRadius: `${Math.max(8, raio)}px`,
                        background: item.bg,
                        border: isBrutal
                          ? "1.5px solid #000000"
                          : "1px solid var(--t-border)",
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] backdrop-blur-md"
                        style={{
                          background:
                            "linear-gradient(to top, color-mix(in srgb, var(--t-surface) 92%, transparent) 0%, transparent 100%)",
                        }}
                      />
                      <div
                        className="relative z-10 flex items-end justify-between gap-1"
                        style={{ color: "var(--t-ink)" }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-semibold leading-tight">
                            {item.nome}
                          </p>
                          <p className="font-mono-num text-[10px] font-bold">{item.preco}</p>
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
                      key={item.nome}
                      className="overflow-hidden p-1.5"
                      style={{
                        backgroundColor: "var(--t-surface)",
                        borderRadius: `${Math.max(8, raio)}px`,
                        border: isBrutal ? "1.5px solid #000000" : "1px solid var(--t-border)",
                      }}
                    >
                      <div
                        className="h-11 w-full rounded-lg"
                        style={{
                          background: item.bg,
                          borderRadius: `${Math.max(6, raio - 4)}px`,
                        }}
                      />
                      <div className="flex items-end justify-between gap-1 px-0.5 pt-1.5">
                        <div className="min-w-0">
                          <p
                            className="truncate text-[10px] font-semibold leading-tight"
                            style={{ color: "var(--t-ink)" }}
                          >
                            {item.nome}
                          </p>
                          <p className="font-mono-num text-[10px] font-bold" style={{ color: cor }}>
                            {item.preco}
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
                  )
                )}
              </div>

              {estiloBarra === "dock_flutuante" && (
                <div className="flex justify-center pt-0.5">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full p-1 text-[9px] font-semibold shadow-sm ${
                      tema === "liquid_glass"
                        ? effectiveDark
                          ? "bg-[#1C1E28]/80 backdrop-blur-md ring-1 ring-white/20"
                          : "bg-white/75 backdrop-blur-md ring-1 ring-white/80"
                        : ""
                    }`}
                    style={
                      tema === "liquid_glass"
                        ? undefined
                        : {
                            backgroundColor: "#111216",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                          }
                    }
                  >
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
                      style={{ backgroundColor: cor, color: accentInk }}
                    >
                      <List className="h-2.5 w-2.5" />
                      Serviços
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-1.5"
                      style={{ color: "var(--t-muted)" }}
                    >
                      <Users className="h-2.5 w-2.5" />
                      Equipe
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-1.5"
                      style={{ color: "var(--t-muted)" }}
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      Local
                    </span>
                  </div>
                </div>
              )}

              {/* Micro CTA */}
              <div
                className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold shadow-sm"
                style={{
                  backgroundColor: cor,
                  color: accentInk,
                  borderRadius:
                    tema === "liquid_glass" ? "9999px" : `${Math.max(4, raio - 2)}px`,
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

      {isOwner && (
        <section className="rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--zelo-ink)]">Nome da Loja</span>
            <input
              type="text"
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              placeholder="Ex: Barbearia Central"
              maxLength={80}
              className="h-11 rounded-xl bg-[var(--zelo-soft)] px-3.5 text-sm font-medium text-[var(--zelo-ink)] outline-none focus:ring-2 focus:ring-[var(--zelo-border-strong)]"
            />
          </label>
        </section>
      )}

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

        {/* Chavinha de Modo Escuro (indisponível para Urban Noir e Clean Glam) */}
        <div
          className={`mt-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--zelo-card)] p-3.5 shadow-sm transition-opacity ${
            modoEscuroLocked ? "opacity-45" : ""
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--zelo-soft)] text-[var(--zelo-ink)]">
              <Moon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--zelo-ink)]">
                Modo Escuro (Dark)
              </p>
              <p className="text-[11px] text-[var(--zelo-muted)]">
                {modoEscuroLocked
                  ? "Indisponível para Urban Noir e Clean Glam"
                  : "Ativa fundo escuro adaptado ao estilo escolhido"}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={effectiveDark}
            aria-label="Ativar modo escuro na loja"
            disabled={!isOwner || modoEscuroLocked}
            onClick={() => setModoEscuro((prev) => !prev)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              modoEscuroLocked ? "cursor-not-allowed" : "cursor-pointer"
            } ${
              effectiveDark ? "bg-[var(--zelo-btn-bg)]" : "bg-[var(--zelo-border)]"
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                effectiveDark ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
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

      {/* Sobre o Espaço & Links Sociais */}
      <section className="rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--zelo-ink)]">
              Sobre o Espaço &amp; Links Sociais
            </h2>
            <p className="text-xs text-[var(--zelo-muted)]">
              Aparece abaixo da equipe na página pública. Se ficar vazio, o card some automaticamente.
            </p>
          </div>
          <span className="font-mono-num text-[11px] text-[var(--zelo-muted)] shrink-0">
            {descricaoPublica.length}/400
          </span>
        </div>

        <textarea
          rows={3}
          maxLength={400}
          disabled={!isOwner || savingSobre}
          value={descricaoPublica}
          onChange={(e) => setDescricaoPublica(e.target.value)}
          placeholder="Conte um pouco sobre o seu espaço, diferenciais, ambiente ou formas de atendimento..."
          className="w-full resize-none rounded-xl bg-[var(--zelo-soft)] p-3 text-sm text-[var(--zelo-ink)] placeholder:text-[var(--zelo-muted)] outline-none"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--zelo-ink)]">
              Links com ícones ({linksPublicos.length}/6)
            </span>
            {isOwner && linksPublicos.length < 6 && (
              <button
                type="button"
                disabled={savingSobre}
                onClick={() =>
                  setLinksPublicos((prev) => [
                    ...prev,
                    { tipo: "instagram", label: "Instagram", url: "" },
                  ])
                }
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--zelo-soft)] px-2.5 text-xs font-semibold text-[var(--zelo-ink)] transition hover:opacity-85"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar link</span>
              </button>
            )}
          </div>

          {linksPublicos.map((item, idx) => {
            const IconComp =
              item.tipo === "instagram"
                ? Instagram
                : item.tipo === "whatsapp"
                  ? MessageCircle
                  : item.tipo === "tiktok"
                    ? Music2
                    : item.tipo === "youtube"
                      ? Youtube
                      : item.tipo === "facebook"
                        ? Share2
                        : item.tipo === "site"
                          ? Globe
                          : ExternalLink;

            return (
              <div
                key={`link-item-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-[var(--zelo-soft)] p-2.5"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--zelo-card)] text-[var(--zelo-accent)]">
                    <IconComp className="h-4 w-4" />
                  </span>
                  <select
                    disabled={!isOwner || savingSobre}
                    value={item.tipo}
                    onChange={(e) => {
                      const nextTipo = e.target.value as LinkPublicoTipo;
                      setLinksPublicos((prev) =>
                        prev.map((l, i) =>
                          i === idx
                            ? {
                                ...l,
                                tipo: nextTipo,
                                label: LINK_PUBLICO_DEFAULT_LABEL[nextTipo],
                              }
                            : l
                        )
                      );
                    }}
                    className="h-9 rounded-lg bg-[var(--zelo-card)] px-2.5 text-xs font-medium text-[var(--zelo-ink)] outline-none"
                  >
                    {LINK_PUBLICO_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {LINK_PUBLICO_DEFAULT_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-1 min-w-0 items-center gap-2">
                  <input
                    type="text"
                    maxLength={300}
                    disabled={!isOwner || savingSobre}
                    value={item.url}
                    onChange={(e) =>
                      setLinksPublicos((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, url: e.target.value } : l))
                      )
                    }
                    placeholder={
                      item.tipo === "whatsapp"
                        ? "Ex: (99) 99999-9999 ou https://wa.me/..."
                        : item.tipo === "instagram" || item.tipo === "tiktok"
                          ? "Ex: @seuperfil ou https://..."
                          : "https://..."
                    }
                    className="h-9 flex-1 min-w-0 rounded-lg bg-[var(--zelo-card)] px-3 text-xs text-[var(--zelo-ink)] outline-none"
                  />

                  {isOwner && (
                    <button
                      type="button"
                      disabled={savingSobre}
                      onClick={() =>
                        setLinksPublicos((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--zelo-muted)] transition hover:bg-[var(--zelo-card)] hover:text-red-500"
                      aria-label="Remover link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isOwner && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={savingSobre}
              onClick={async () => {
                setSavingSobre(true);
                const res = await atualizarDescricaoLinksLojaAction(loja.id, {
                  descricao_publica: descricaoPublica,
                  links_publicos: linksPublicos
                    .filter((l) => l.url.trim().length > 0)
                    .map((l) => ({
                      ...l,
                      label: LINK_PUBLICO_DEFAULT_LABEL[l.tipo],
                    })),
                });
                setSavingSobre(false);
                if (!res.ok) {
                  showToast(res.error ?? "Erro ao salvar descrição e links.", "error");
                  return;
                }
                setDescricaoPublica(res.descricao_publica ?? "");
                setLinksPublicos(res.links_publicos ?? []);
                showToast("Descrição e links salvos!", "success", "sparkles");
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-4 text-xs font-semibold text-[var(--zelo-btn-ink)] transition hover:opacity-90 disabled:opacity-45"
            >
              {savingSobre ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Salvar descrição e links</span>
            </button>
          </div>
        )}
      </section>

      {/* Store PIX Key Configuration */}
      <section className="rounded-xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-[18px] w-[18px] text-[var(--zelo-ink)]" />
            <h3 className="text-sm font-semibold text-[var(--zelo-ink)]">
              Chave PIX (Pagamento na Loja)
            </h3>
          </div>
          {chavePix.trim().length > 3 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#10B981]">
              <CheckCircle2 className="h-3 w-3" />
              Chave Salva
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-[var(--zelo-muted)]">
          O Zelo não intermedia pagamentos — o cliente paga diretamente no estabelecimento. Essa chave serve apenas para facilitar na hora de copiar e colar o PIX.
        </p>

        {isOwner && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--zelo-muted)]">
              Quem pode cadastrar chave PIX?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPixModo("loja")}
                className={`flex min-h-[54px] flex-col justify-between rounded-xl p-2.5 text-left transition-all ${
                  pixModo === "loja"
                    ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                    : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)] hover:bg-[var(--zelo-border)]"
                }`}
              >
                <span className="text-xs font-bold">Só da loja</span>
                <span className="text-[10px] opacity-80">PIX único do dono</span>
              </button>
              <button
                type="button"
                onClick={() => setPixModo("profissional")}
                className={`flex min-h-[54px] flex-col justify-between rounded-xl p-2.5 text-left transition-all ${
                  pixModo === "profissional"
                    ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] shadow-sm"
                    : "bg-[var(--zelo-soft)] text-[var(--zelo-ink)] hover:bg-[var(--zelo-border)]"
                }`}
              >
                <span className="text-xs font-bold">Por barbeiro</span>
                <span className="text-[10px] opacity-80">Equipe cadastra o seu</span>
              </button>
            </div>
            {pixModo === "profissional" && (
              <p className="text-[11px] text-[var(--zelo-muted)]">
                Cada profissional pode informar a própria chave PIX na aba <strong>Config</strong> (se não preencher, vale a chave da loja abaixo).
              </p>
            )}
          </div>
        )}

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
          disabled={isPending || !isDirty}
          aria-label={isDirty ? "Salvar alterações pendentes" : "Alterações salvas"}
          className={`fixed right-4 bottom-20 z-40 flex min-h-[46px] items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all active:scale-95 ${
            isDirty || isPending
              ? "bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)]"
              : "bg-[var(--zelo-card)] text-[var(--zelo-muted)] ring-1 ring-[var(--zelo-border)]"
          } disabled:opacity-90`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isDirty ? (
            <Save className="h-4 w-4 text-[#F59E0B]" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          )}
          <span>{isPending ? "Salvando..." : isDirty ? "Salvar" : "Salvo"}</span>
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

              <div className="flex items-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] p-1">
                <button
                  type="button"
                  onClick={() => setBannerTab("prontos")}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    bannerTab === "prontos"
                      ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
                      : "text-[var(--zelo-muted)]"
                  }`}
                >
                  Prontos
                </button>
                <button
                  type="button"
                  onClick={() => setBannerTab("pexels")}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    bannerTab === "pexels"
                      ? "bg-[var(--zelo-card)] text-[var(--zelo-ink)] shadow-sm"
                      : "text-[var(--zelo-muted)]"
                  }`}
                >
                  Buscar grátis
                </button>
              </div>

              {bannerTab === "prontos" ? (
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
              ) : (
                <StockPhotoSearch
                  tipo="banner"
                  nicho={loja.nicho}
                  selectedUrl={capaUrl}
                  disabled={uploadingCapa || savingPresetBanner}
                  onSelect={(url) => void handleSelectPresetBanner(url)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
