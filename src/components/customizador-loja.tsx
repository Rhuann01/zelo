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
  Trash2,
  Wallet,
} from "lucide-react";
import {
  revalidateLojaMediaAction,
  saveCustomizacaoAction,
} from "@/app/painel/personalizar/actions";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP, STORE_MEDIA_COMPRESS_CONFIG } from "@/lib/image/compress-webp";
import { showToast } from "@/components/zelo-toast";
import { StoreLocationFields } from "@/components/ui/store-location-fields";
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
    endereco_texto: string;
    latitude: number | null;
    longitude: number | null;
  };
}) {
  const [tema, setTema] = useState<LojaResumo["tema"]>(loja.tema);
  const [cor, setCor] = useState(loja.cor_primaria);
  const [raio, setRaio] = useState(loja.raio_borda_px);
  const [chavePix, setChavePix] = useState(loja.chave_pix ?? "");
  const [sinalReais, setSinalReais] = useState(
    (loja.sinal_centavos / 100).toFixed(2).replace(".", ",")
  );
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
  const [isPending, startTransition] = useTransition();

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

  function handlePreset(preset: (typeof TEMAS)[number]) {
    setTema(preset.key);
    setCor(preset.defaultCor);
    setRaio(preset.defaultRaio);
  }

  function handleSave() {
    const sinalCentavos = Math.max(
      0,
      Math.round(Number(sinalReais.replace(/[^\d,.-]/g, "").replace(",", ".")) * 100) || 0
    );

    startTransition(async () => {
      const res = await saveCustomizacaoAction({
        loja_id: loja.id,
        tema,
        cor_primaria: cor,
        raio_borda_px: raio,
        chave_pix: chavePix.trim() || null,
        sinal_centavos: sinalCentavos,
        cidade: cidade.trim(),
        bairro: bairro.trim(),
        endereco_texto: enderecoTexto.trim(),
        latitude,
        longitude,
      });
      if (res.error) showToast(res.error, "error");
      else if (res.message) showToast(res.message, "success");
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
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
            className={`store-view-base theme-${tema} flex w-full flex-col gap-2.5 p-3 transition-all duration-200 ${
              refreshing ? "opacity-50" : "opacity-100"
            }`}
            style={{
              backgroundColor: "var(--t-surface)",
              borderRadius: `${raio}px`,
              border: isBrutal ? "2px solid #000000" : undefined,
              boxShadow: isBrutal ? "3px 3px 0px #000000" : "var(--t-shadow)",
            }}
          >
            {/* Brand Header inside Preview */}
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={loja.nome}
                  className="h-10 w-10 shrink-0 object-cover"
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

            {/* Dynamic Mock Booking Pill */}
            <div
              className="flex items-center justify-between p-2.5 transition-all"
              style={{
                backgroundColor: "var(--t-inner)",
                borderRadius: `${Math.max(4, raio - 4)}px`,
                border: isBrutal ? "1.5px solid #000000" : undefined,
              }}
            >
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold" style={{ color: "var(--t-ink)" }}>
                  Corte Clássico & Barba
                </span>
                <span className="font-mono-num text-[11px]" style={{ color: "var(--t-muted)" }}>
                  45 min • Quarta, 14:30
                </span>
              </div>
              <div className="text-right">
                <span className="block font-mono-num text-[13px] font-bold" style={{ color: cor }}>
                  R$ 75,00
                </span>
                <span className="font-mono-num text-[10px]" style={{ color: "var(--t-muted)" }}>
                  {sinalReais && sinalReais !== "0,00" ? `Sinal R$ ${sinalReais}` : "Sem sinal"}
                </span>
              </div>
            </div>

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
          <span className="font-mono-num text-xs text-[var(--zelo-muted)]">4 estilos</span>
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
                  style={{ backgroundColor: t.barBg }}
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
                  Foto horizontal exibida no card do Explorar e no topo da loja (WebP até 100 KB).
                </p>
              </div>
            </div>

            {capaUrl && (
              <div className="relative h-28 w-full overflow-hidden rounded-xl bg-[var(--zelo-soft)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capaUrl}
                  alt={`Banner ${loja.nome}`}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--zelo-soft)] text-xs font-semibold text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]">
                {uploadingCapa ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-[#10B981]" />
                )}
                <span>
                  {uploadingCapa
                    ? "Processando banner..."
                    : capaUrl
                      ? "Alterar Banner"
                      : "Enviar Banner / Capa"}
                </span>
                <input type="file" accept="image/*" onChange={handleCapaUpload} className="hidden" />
              </label>
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
          cidade={cidade}
          bairro={bairro}
          endereco={enderecoTexto}
          latitude={latitude}
          longitude={longitude}
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
    </div>
  );
}
