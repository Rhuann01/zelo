"use client";

import { Check, Clock, Plus, Scissors } from "lucide-react";

export interface StorefrontServicoItem {
  id: string;
  nome: string;
  descricao: string;
  duracao_min: number;
  preco_centavos: number;
  imagem_url: string | null;
  exibir_imagem?: boolean;
}

interface ServiceCardProps {
  servico: StorefrontServicoItem;
  selected: boolean;
  disabled?: boolean;
  estiloCard: "preenchido" | "vidro_borrado";
  isBrutal?: boolean;
  isLiquidGlass?: boolean;
  onToggle: (id: string) => void;
}

function formatPrice(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

export function ServiceCard({
  servico,
  selected,
  disabled = false,
  estiloCard,
  isBrutal = false,
  isLiquidGlass = false,
  onToggle,
}: ServiceCardProps) {
  const hasImage = Boolean(servico.imagem_url);

  if (estiloCard === "vidro_borrado") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(servico.id)}
        aria-pressed={selected}
        className={`group relative flex min-h-[218px] w-full flex-col justify-end overflow-hidden text-left transition-transform duration-200 active:scale-[0.98] disabled:opacity-60 ${
          isLiquidGlass ? "store-glass-surface" : ""
        }`}
        style={{
          borderRadius: "calc(var(--t-radius) * 1.15)",
          backgroundColor: "var(--t-surface)",
          boxShadow: "var(--t-shadow)",
          border: isBrutal
            ? "2px solid #000000"
            : selected
              ? "2px solid var(--t-accent)"
              : "1px solid var(--t-border)",
        }}
      >
        {/* Fundo: Foto full-bleed ou gradiente tonal elegante */}
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={servico.imagem_url!}
            alt={servico.nome}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-start justify-center pt-9"
            style={{
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--t-accent) 32%, #141519) 0%, #0E1015 100%)",
            }}
          >
            <Scissors className="h-9 w-9 text-white/35" />
          </div>
        )}

        {/* Scrim progressivo + área inferior borrada estilo Apple/Glass */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] backdrop-blur-md"
          style={{
            WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
            maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
            background:
              "linear-gradient(to top, rgba(8, 9, 12, 0.90) 0%, rgba(8, 9, 12, 0.56) 62%, transparent 100%)",
          }}
        />

        {/* Conteúdo sobreposto legível */}
        <div className="relative z-10 flex flex-col gap-1.5 p-3 text-white">
          <div className="flex items-center gap-1 text-[11px] font-medium text-white/80">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="font-mono-num">{servico.duracao_min} min</span>
          </div>

          <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
            {servico.nome}
          </h2>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="font-mono-num text-sm font-bold text-white">
              {formatPrice(servico.preco_centavos)}
            </span>

            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md transition-transform group-active:scale-90"
              style={{
                backgroundColor: selected ? "var(--t-accent)" : "rgba(255, 255, 255, 0.22)",
                color: selected ? "var(--t-accent-ink)" : "#FFFFFF",
                border: selected ? "none" : "1px solid rgba(255, 255, 255, 0.38)",
              }}
            >
              {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
          </div>
        </div>
      </button>
    );
  }

  // Estilo "preenchido": Foto com borda arredondada interna + rodapé limpo estilo app
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(servico.id)}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col overflow-hidden p-2 text-left transition-transform duration-200 active:scale-[0.98] disabled:opacity-60 ${
        isLiquidGlass ? "store-glass-surface" : ""
      }`}
      style={{
        borderRadius: "calc(var(--t-radius) * 1.25)",
        backgroundColor: "var(--t-surface)",
        boxShadow: "var(--t-shadow)",
        border: isBrutal
          ? "2px solid #000000"
          : selected
            ? "2px solid var(--t-accent)"
            : "1px solid var(--t-border)",
      }}
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={{
          borderRadius: "calc(var(--t-radius) * 0.85)",
          backgroundColor: "var(--t-inner)",
        }}
      >
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={servico.imagem_url!}
            alt={servico.nome}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 18%, var(--t-inner)) 0%, var(--t-inner) 100%)",
            }}
          >
            <Scissors className="h-7 w-7 opacity-40" style={{ color: "var(--t-ink)" }} />
          </div>
        )}

        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 font-mono-num text-[10px] font-medium text-white backdrop-blur-sm">
          <Clock className="h-2.5 w-2.5" />
          {servico.duracao_min} min
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 px-1 pt-2.5 pb-1">
        <div>
          <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug">
            {servico.nome}
          </h2>
          {servico.descricao && (
            <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: "var(--t-muted)" }}>
              {servico.descricao}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="font-mono-num text-sm font-bold">
            {formatPrice(servico.preco_centavos)}
          </span>

          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform group-active:scale-90"
            style={{
              backgroundColor: "var(--t-accent)",
              color: "var(--t-accent-ink)",
              ...(isBrutal ? { border: "1.5px solid #000000" } : {}),
            }}
          >
            {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        </div>
      </div>
    </button>
  );
}
