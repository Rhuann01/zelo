import type { ReactNode } from "react";

export type SurfaceTone = "card" | "soft" | "amber" | "emerald" | "rose";
export type SurfacePadding = "none" | "sm" | "md" | "lg";

const TONE_CLASSES: Record<SurfaceTone, string> = {
  card: "bg-[var(--zelo-card)] text-[var(--zelo-ink)]",
  soft: "bg-[var(--zelo-soft)] text-[var(--zelo-ink)]",
  amber:
    "bg-amber-500/10 text-[var(--zelo-ink)] ring-1 ring-inset ring-amber-500/20",
  emerald:
    "bg-emerald-500/10 text-[var(--zelo-ink)] ring-1 ring-inset ring-emerald-500/20",
  rose: "bg-rose-500/10 text-[var(--zelo-ink)] ring-1 ring-inset ring-rose-500/20",
};

const PADDING_CLASSES: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5 sm:p-6",
};

interface SurfaceCardProps {
  children: ReactNode;
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  className?: string;
}

/**
 * Contêiner padrão de superfície do Zelo.
 * Prioriza contraste suave de fundo sem excesso de bordas.
 */
export function SurfaceCard({
  children,
  tone = "card",
  padding = "md",
  className = "",
}: SurfaceCardProps) {
  return (
    <div
      className={`rounded-2xl ${TONE_CLASSES[tone]} ${PADDING_CLASSES[padding]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
