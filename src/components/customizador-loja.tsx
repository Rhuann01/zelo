"use client";

import { useState, useTransition } from "react";
import { Check, Eye, ImagePlus, Loader2, QrCode } from "lucide-react";
import { saveCustomizacaoAction } from "@/app/painel/personalizar/actions";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP, STORE_MEDIA_COMPRESS_CONFIG } from "@/lib/image/compress-webp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LojaResumo } from "@/lib/painel/get-painel-context";

const TEMAS = [
  { key: "urban", label: "Urban Noir", desc: "Dark premium", bg: "#0F0F12", badge: "DARK" },
  { key: "glam", label: "Clean Glam", desc: "Estética & Spa", bg: "#FDF8F6", badge: "GLAM" },
  { key: "brutal", label: "Neo-Brutal", desc: "Visual bold e pop", bg: "#FFFDF4", badge: "POP" },
  { key: "slate", label: "Minimalist Slate", desc: "Clínica moderna", bg: "#FFFFFF", badge: "SLATE" },
] as const;

const SWATCHES = [
  { color: "#F59E0B", ink: "#111111", label: "Âmbar" },
  { color: "#10B981", ink: "#FFFFFF", label: "Esmeralda" },
  { color: "#BE185D", ink: "#FFFFFF", label: "Rosé" },
  { color: "#2563EB", ink: "#FFFFFF", label: "Cobalto" },
  { color: "#A3E635", ink: "#111111", label: "Lima" },
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
      setFeedback(`Logo salva (${Math.round(blob.size / 1024)} KB WebP).`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erro ao enviar logo.");
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
      setFeedback(res.error ?? res.message ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          <Eye className="h-4 w-4 text-[#F59E0B]" />
          Preview da Loja
        </span>
        <Badge className="gap-1.5 bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          Ao Vivo
        </Badge>
      </div>

      {/* Preview White-Label usando o motor único .store-view-base */}
      <div
        className={`store-view-base theme-${tema} p-4`}
        style={{
          borderRadius: `${raio}px`,
          border: tema === "brutal" ? "var(--t-border-w) solid var(--t-border)" : undefined,
          boxShadow: "var(--t-shadow)",
        }}
      >
        <div
          className="space-y-3 p-3.5"
          style={{
            backgroundColor: "var(--t-surface)",
            borderRadius: `${Math.max(4, raio - 2)}px`,
            border: tema === "brutal" ? "var(--t-border-w) solid var(--t-border)" : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={loja.nome}
                  className="h-10 w-10 shrink-0 object-cover"
                  style={{ borderRadius: `${Math.max(4, raio - 4)}px` }}
                />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: cor,
                    color: accentInk,
                    borderRadius: `${Math.max(4, raio - 4)}px`,
                  }}
                >
                  {loja.nome.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: "var(--t-ink)" }}>
                  {loja.nome}
                </p>
                <p className="truncate text-[11px]" style={{ color: "var(--t-muted)" }}>
                  {loja.bairro || "Centro"} • {loja.cidade || "Cidade"}
                </p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-3"
            style={{
              backgroundColor: "var(--t-inner)",
              borderRadius: `${Math.max(4, raio - 4)}px`,
            }}
          >
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--t-ink)" }}>
                Serviço Exemplo
              </p>
              <p className="font-mono-num text-[11px]" style={{ color: "var(--t-muted)" }}>
                35 min • Hoje 14:30
              </p>
            </div>
            <span className="font-mono-num text-sm font-bold" style={{ color: "var(--t-ink)" }}>
              R$ 45,00
            </span>
          </div>

          <div
            className="flex h-11 items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: cor,
              color: accentInk,
              borderRadius: `${Math.max(4, raio - 4)}px`,
            }}
          >
            Agendar Horário
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="rounded-xl bg-[#F59E0B]/15 px-3.5 py-2.5 text-xs font-medium text-[#D97706]">
          Apenas o proprietário pode alterar o tema e a chave PIX da loja.
        </div>
      )}

      <Card className="py-4">
        <CardContent className="space-y-4 px-4">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Temas Pré-definidos
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {TEMAS.map((t) => {
              const active = tema === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => setTema(t.key)}
                  className={`min-h-[80px] rounded-xl bg-secondary p-3 text-left transition ${
                    active ? "ring-2 ring-foreground" : ""
                  }`}
                >
                  <div
                    className="mb-2 flex h-7 items-center justify-between rounded-lg px-2"
                    style={{ backgroundColor: t.bg }}
                  >
                    <span className="font-mono-num text-[10px] font-bold text-[#9CA3AF]">
                      {t.badge}
                    </span>
                    {active && <Check className="h-3.5 w-3.5 text-[#10B981]" />}
                  </div>
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Cor de Acento</span>
              <span className="font-mono-num text-xs text-muted-foreground">{cor}</span>
            </div>
            <div className="flex items-center gap-3">
              {SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => setCor(s.color)}
                  title={s.label}
                  aria-label={`Cor ${s.label}`}
                  className={`h-11 w-11 rounded-full transition ${
                    cor.toUpperCase() === s.color ? "ring-2 ring-foreground ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: s.color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Raio de Borda</span>
              <span className="font-mono-num text-xs font-bold">{raio}px</span>
            </div>
            <Slider
              min={2}
              max={24}
              step={1}
              disabled={!isOwner}
              value={[raio]}
              onValueChange={(val) => setRaio(Array.isArray(val) ? (val[0] ?? 12) : val)}
              aria-label="Raio de Borda"
            />
          </div>

          {isOwner && (
            <label className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-semibold text-foreground transition hover:opacity-90">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4 text-[#F59E0B]" />
              )}
              <span>{uploading ? "Otimizando imagem..." : "Enviar Logo da Loja"}</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="space-y-3 px-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <QrCode className="h-4 w-4 text-[#10B981]" />
            Chave PIX & Sinal da Loja
          </div>
          <p className="text-xs text-muted-foreground">
            O valor do sinal cai direto na sua conta sem intermediação ou taxa do Zelo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="pix-key" className="sr-only">
              Chave PIX
            </Label>
            <Input
              id="pix-key"
              type="text"
              disabled={!isOwner}
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="Chave PIX (CPF, CNPJ, E-mail ou Aleatória)"
              className="h-11 rounded-xl border-0 bg-secondary px-3 font-mono-num text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pix-sinal" className="text-xs font-semibold text-muted-foreground">
              Sinal opcional (R$)
            </Label>
            <Input
              id="pix-sinal"
              type="text"
              disabled={!isOwner}
              value={sinalReais}
              onChange={(e) => setSinalReais(e.target.value)}
              placeholder="0,00"
              className="h-11 w-28 rounded-xl border-0 bg-secondary px-3 text-right font-mono-num text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {feedback && (
        <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-semibold">
          {feedback}
        </div>
      )}

      {isOwner && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-12 w-full rounded-xl text-sm font-semibold"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Personalização e PIX
        </Button>
      )}
    </div>
  );
}
