import type { CSSProperties } from "react";

interface StoreBannerMediaProps {
  capaUrl?: string | null;
  logoUrl?: string | null;
  corPrimaria?: string | null;
  alt: string;
  className?: string;
  /** "dark" escurece o rodapé para texto branco em cima; "store" usa --t-bg se existir */
  overlayMode?: "dark" | "store" | "none";
  priority?: boolean;
}

/**
 * Renderiza o banner da loja com fallback inteligente:
 * 1. Se tiver `capaUrl`: exibe a foto da capa.
 * 2. Se não tiver `capaUrl` mas tiver `logoUrl`: cria um degradê suave usando a própria logo desfocada.
 * 3. Se não tiver nem capa nem logo: cria um degradê usando a `corPrimaria` do perfil da loja.
 */
export function StoreBannerMedia({
  capaUrl,
  logoUrl,
  corPrimaria,
  alt,
  className = "h-full w-full",
  overlayMode = "dark",
  priority = false,
}: StoreBannerMediaProps) {
  const accent = corPrimaria || "#F59E0B";

  const gradientStyle: CSSProperties = {
    background: `radial-gradient(circle at 20% 25%, color-mix(in srgb, ${accent} 42%, transparent), transparent 60%), linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 38%, #16161B) 55%, #0F0F12 100%)`,
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={gradientStyle}>
      {capaUrl ? (
        <img
          src={capaUrl}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className="h-full w-full object-cover"
        />
      ) : logoUrl ? (
        <>
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full scale-150 object-cover opacity-70 blur-2xl saturate-150"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 28%, transparent) 0%, rgba(15, 15, 18, 0.55) 100%)`,
            }}
          />
        </>
      ) : null}

      {overlayMode === "dark" && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      )}
      {overlayMode === "store" && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent 25%, var(--t-bg, #0F0F12) 100%)",
          }}
        />
      )}
    </div>
  );
}
