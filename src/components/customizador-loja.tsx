"use client";

import { useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, MapPin, QrCode, Scissors } from "lucide-react";
import { saveCustomizacaoAction } from "@/app/painel/personalizar/actions";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP, STORE_MEDIA_COMPRESS_CONFIG } from "@/lib/image/compress-webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import type { LojaResumo } from "@/lib/painel/get-painel-context";

const TEMAS = [
  {
    key: "urban",
    label: "Urban Noir",
    desc: "Escuro",
    bg: "#0F0F12",
    surface: "#18181D",
    inner: "#222229",
    ink: "#F4F4F5",
    muted: "#71717A",
    border: "1px solid #2C2C35",
    shadow: "none",
    radius: "8px",
  },
  {
    key: "glam",
    label: "Clean Glam",
    desc: "Suave",
    bg: "#FDF8F6",
    surface: "#FFFFFF",
    inner: "#FBF1EE",
    ink: "#2A1D1D",
    muted: "#C4A9A2",
    border: "1px solid #EFE0DA",
    shadow: "0 2px 10px rgba(190, 24, 93, 0.05)",
    radius: "10px",
  },
  {
    key: "brutal",
    label: "Neo-Brutal",
    desc: "Marcante",
    bg: "#FFFDF4",
    surface: "#FFFFFF",
    inner: "#F7F5EA",
    ink: "#000000",
    muted: "#71717A",
    border: "2px solid #000000",
    shadow: "3px 3px 0px #000000",
    radius: "3px",
  },
  {
    key: "slate",
    label: "Minimalist Slate",
    desc: "Clínico",
    bg: "#FFFFFF",
    surface: "#F8FAFC",
    inner: "#F1F5F9",
    ink: "#0F172A",
    muted: "#94A3B8",
    border: "1px solid #CBD5E1",
    shadow: "none",
    radius: "8px",
  },
] as const;

const SWATCHES = [
  { color: "#F59E0B", label: "Âmbar" },
  { color: "#10B981", label: "Esmeralda" },
  { color: "#BE185D", label: "Rosé" },
  { color: "#2563EB", label: "Cobalto" },
  { color: "#A3E635", label: "Lima" },
];

export function CustomizadorLoja({
  loja,
  isOwner,
}: {
  loja: LojaResumo;
  isOwner: boolean;
}) {
  const [tema, setTema] = useState<LojaResumo["tema"]>(loja.tema);
  const [cor, setCor] = useState(loja.cor_primaria);
  const [raio, setRaio] = useState(loja.raio_borda_px);
  const [chavePix, setChavePix] = useState(loja.chave_pix ?? "");
  const [sinalReais, setSinalReais] = useState(
    (loja.sinal_centavos / 100).toFixed(2).replace(".", ",")
  );
  const [logoUrl, setLogoUrl] = useState(loja.logo_url);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const accentInk =
    cor.toUpperCase() === "#F59E0B" || cor.toUpperCase() === "#A3E635" ? "#111111" : "#FFFFFF";
  const isBrutal = tema === "brutal";

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setUploading(true);
    setFeedback(null);
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
      setFeedback("Logo atualizada.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Não foi possível enviar a logo.");
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    setFeedback(null);
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
      });
      setFeedback(res.error ?? (res.ok ? "Alterações salvas." : null));
    });
  }

  return (
    <div className="space-y-6">
      {/* Preview em destaque — sem chrome decorativo */}
      <div
        className={`store-view-base theme-${tema} p-4`}
        style={{
          borderRadius: `${raio}px`,
          border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
          boxShadow: isBrutal ? "4px 4px 0px #000000" : "var(--t-shadow)",
        }}
      >
        <div
          className="space-y-3 p-3.5"
          style={{
            backgroundColor: "var(--t-surface)",
            borderRadius: `${Math.max(2, Math.round(raio * 0.85))}px`,
            border: isBrutal ? "2px solid #000000" : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={loja.nome}
                className="h-10 w-10 shrink-0 object-cover"
                style={{ borderRadius: `${Math.max(2, Math.round(raio * 0.78))}px` }}
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: cor,
                  color: accentInk,
                  borderRadius: `${Math.max(2, Math.round(raio * 0.78))}px`,
                  border: isBrutal ? "2px solid #000000" : undefined,
                }}
              >
                {loja.nome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight" style={{ color: "var(--t-ink)" }}>
                {loja.nome}
              </p>
              <p
                className="mt-0.5 flex items-center gap-1 truncate text-[11px]"
                style={{ color: "var(--t-muted)" }}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span>
                  {loja.bairro || "Centro"}, {loja.cidade || "Cidade"}
                </span>
              </p>
            </div>
          </div>

          <div
            className="flex items-center justify-between gap-2 p-3"
            style={{
              backgroundColor: "var(--t-inner)",
              borderRadius: `${Math.max(2, Math.round(raio * 0.8))}px`,
              border: isBrutal ? "1.5px solid #000000" : undefined,
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Scissors className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--t-muted)" }} />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold" style={{ color: "var(--t-ink)" }}>
                  Corte Degradê
                </p>
                <p className="font-mono-num text-[11px]" style={{ color: "var(--t-muted)" }}>
                  35 min • Hoje 14:30
                </p>
              </div>
            </div>
            <span className="shrink-0 font-mono-num text-xs font-bold" style={{ color: "var(--t-ink)" }}>
              R$ 45,00
            </span>
          </div>

          <div
            className="flex h-10 items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: cor,
              color: accentInk,
              borderRadius: `${Math.max(2, Math.round(raio * 0.78))}px`,
              border: isBrutal ? "2px solid #000000" : undefined,
              boxShadow: isBrutal ? "2px 2px 0px #000000" : undefined,
            }}
          >
            Confirmar horário
          </div>
        </div>
      </div>

      {!isOwner && (
        <p className="rounded-xl bg-[#F59E0B]/15 px-3.5 py-2.5 text-xs font-medium text-[#D97706]">
          Apenas o proprietário pode alterar a aparência e a chave PIX da loja.
        </p>
      )}

      {/* Estilo da loja — sem card envolvente extra */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Estilo da página</h2>
        <div className="grid grid-cols-2 gap-3">
          {TEMAS.map((t) => {
            const active = tema === t.key;
            return (
              <button
                key={t.key}
                type="button"
                disabled={!isOwner}
                onClick={() => setTema(t.key)}
                className={`flex flex-col gap-2 rounded-2xl bg-card p-2.5 text-left transition ${
                  active ? "ring-1 ring-foreground" : "opacity-80 hover:opacity-100"
                }`}
              >
                <div
                  className="w-full p-2"
                  style={{
                    backgroundColor: t.bg,
                    borderRadius: t.radius,
                    border: t.border,
                    boxShadow: t.shadow,
                  }}
                >
                  <div
                    className="space-y-1.5 p-2"
                    style={{
                      backgroundColor: t.surface,
                      borderRadius: t.radius,
                      border: t.key === "brutal" ? "1.5px solid #000000" : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="h-1.5 w-10 rounded-full" style={{ backgroundColor: t.ink }} />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: active ? "#10B981" : t.muted }}
                      />
                    </div>
                    <div
                      className="h-4 w-full"
                      style={{
                        backgroundColor: t.inner,
                        borderRadius: t.key === "brutal" ? "2px" : "6px",
                      }}
                    />
                    <div
                      className="h-3 w-full"
                      style={{
                        backgroundColor: cor,
                        borderRadius: t.key === "brutal" ? "2px" : "9999px",
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-xs font-semibold leading-tight">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Cor, cantos e logo — controles limpos */}
      <section className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Cor principal</span>
            <span className="font-mono-num text-xs text-muted-foreground">{cor}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-card px-2 py-1">
            {SWATCHES.map((s) => {
              const selected = cor.toUpperCase() === s.color;
              return (
                <button
                  key={s.color}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => setCor(s.color)}
                  title={s.label}
                  aria-label={`Cor ${s.label}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-secondary/70"
                >
                  <span
                    className={`h-5 w-5 rounded-full transition ${
                      selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110" : ""
                    }`}
                    style={{ backgroundColor: s.color }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Arredondamento</span>
            <span className="font-mono-num text-xs text-muted-foreground">{raio}px</span>
          </div>
          <Slider
            min={2}
            max={24}
            step={1}
            disabled={!isOwner}
            value={[raio]}
            onValueChange={(val) => setRaio(Array.isArray(val) ? (val[0] ?? 12) : val)}
            aria-label="Arredondamento dos cantos"
          />
        </div>

        {isOwner && (
          <label className="flex h-11 cursor-pointer items-center justify-between rounded-xl bg-card px-3.5 text-xs font-medium text-foreground transition hover:bg-secondary">
            <span className="inline-flex items-center gap-2">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{uploading ? "Enviando logo..." : "Logo da loja"}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {logoUrl ? "Alterar" : "Enviar"}
            </span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        )}
      </section>

      <Separator />

      {/* Recebimento por PIX */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <QrCode className="h-4 w-4 text-[#10B981]" />
            Recebimento por PIX
          </div>
          <p className="text-xs text-muted-foreground">
            O sinal vai direto para sua conta, sem intermediação.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="pix-key" className="text-xs text-muted-foreground">
              Chave PIX
            </Label>
            <Input
              id="pix-key"
              type="text"
              disabled={!isOwner}
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="CPF, CNPJ, e-mail ou chave aleatória"
              className="h-11 rounded-xl border-0 bg-card px-3 font-mono-num text-sm dark:bg-card"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3.5 py-2">
            <Label htmlFor="pix-sinal" className="text-xs font-medium text-muted-foreground">
              Sinal para reservar (R$)
            </Label>
            <Input
              id="pix-sinal"
              type="text"
              disabled={!isOwner}
              value={sinalReais}
              onChange={(e) => setSinalReais(e.target.value)}
              placeholder="0,00"
              className="h-9 w-24 rounded-lg border-0 bg-secondary px-2.5 text-right font-mono-num text-sm dark:bg-secondary"
            />
          </div>
        </div>
      </section>

      {feedback && (
        <p className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-medium">{feedback}</p>
      )}

      {isOwner && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-12 w-full rounded-xl text-sm font-semibold"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      )}
    </div>
  );
}
