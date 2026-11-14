"use client";

import type { CSSProperties, ReactNode } from "react";

interface LiquidGlassSurfaceProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** "light" para iOS 26 claro; "dark" para superfícies escuras */
  tone?: "light" | "dark";
}

/**
 * Superfície funcional Apple HIG Liquid Glass:
 * - Camada de vidro flutuante com blur + saturate(190%)
 * - Borda especular direcional (topo mais luminoso que a base)
 * - Reflexo superior (specular sheen) + sombra ambiente
 * - Filtro SVG leve de refração disponível via #zelo-liquid-refract
 */
export function LiquidGlassSurface({
  children,
  className = "",
  style,
  tone = "light",
}: LiquidGlassSurfaceProps) {
  const isLight = tone === "light";

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: isLight
          ? "rgba(255, 255, 255, 0.72)"
          : "rgba(22, 24, 32, 0.68)",
        backdropFilter: "blur(28px) saturate(190%)",
        WebkitBackdropFilter: "blur(28px) saturate(190%)",
        borderTop: isLight
          ? "1px solid rgba(255, 255, 255, 0.95)"
          : "1px solid rgba(255, 255, 255, 0.42)",
        borderLeft: isLight
          ? "1px solid rgba(255, 255, 255, 0.75)"
          : "1px solid rgba(255, 255, 255, 0.22)",
        borderRight: isLight
          ? "1px solid rgba(255, 255, 255, 0.55)"
          : "1px solid rgba(255, 255, 255, 0.12)",
        borderBottom: isLight
          ? "1px solid rgba(0, 0, 0, 0.08)"
          : "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: isLight
          ? "0 14px 36px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 4px rgba(0, 0, 0, 0.04)"
          : "0 16px 40px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.32), inset 0 -2px 6px rgba(0, 0, 0, 0.2)",
        ...style,
      }}
    >
      {/* Reflexo especular superior (Apple HIG specular sheen) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background: isLight
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.02) 100%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.01) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Filtro SVG global leve para refração óptica opcional em navegadores Chromium */
export function LiquidGlassSvgDefs() {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
      <defs>
        <filter id="zelo-liquid-refract" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.012"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
