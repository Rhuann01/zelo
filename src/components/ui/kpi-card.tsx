import type { ReactNode } from "react";
import { SurfaceCard } from "./surface-card";

export type KpiTone = "default" | "emerald" | "amber" | "rose";

const VALUE_TONES: Record<KpiTone, string> = {
  default: "text-[var(--zelo-ink)]",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  tone?: KpiTone;
  icon?: ReactNode;
  className?: string;
}

/**
 * Card de métrica (KPI) para grids Bento no painel e no Super Admin.
 */
export function KpiCard({
  label,
  value,
  sublabel,
  tone = "default",
  icon,
  className = "",
}: KpiCardProps) {
  return (
    <SurfaceCard tone="card" padding="sm" className={className}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-medium text-[var(--zelo-muted)] truncate">
          {label}
        </span>
        {icon ? (
          <span className="shrink-0 text-[var(--zelo-subtle)]">{icon}</span>
        ) : null}
      </div>
      <div
        className={`mt-1 text-lg sm:text-xl font-semibold font-mono-num tracking-tight ${VALUE_TONES[tone]}`}
      >
        {value}
      </div>
      {sublabel ? (
        <p className="mt-0.5 text-[11px] text-[var(--zelo-subtle)] truncate">
          {sublabel}
        </p>
      ) : null}
    </SurfaceCard>
  );
}
