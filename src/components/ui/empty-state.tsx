import type { ReactNode } from "react";
import { SurfaceCard } from "./surface-card";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio padronizado para listas, agendas e tabelas sem registros.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <SurfaceCard
      tone="soft"
      padding="lg"
      className={`flex flex-col items-center text-center ${className}`.trim()}
    >
      {icon ? (
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--zelo-card)] text-[var(--zelo-muted)]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[var(--zelo-ink)]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs text-[var(--zelo-muted)] leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </SurfaceCard>
  );
}
